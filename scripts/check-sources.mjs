import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { machineStatusCoverage } from '../src/machineStatusCoverage.mjs';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url)));

async function probe(url, valid, headers = {}) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const data = await response.json();
    return valid(data, response) ? data : null;
  } catch {
    return null;
  }
}

export async function checkSources() {
  const [rooms, washers, dryers, sharedFloorMachines] = await Promise.all([
    readJson('../src/laundryRooms.json'),
    readJson('../alerts/room-washers.json'),
    readJson('../alerts/room-dryers.json'),
    readJson('../alerts/ccrh-machines.json'),
  ]);
  const ids = [...new Set(rooms.map(({ providerId }) => providerId).filter(Boolean))];
  const results = new Map();

  const statusBase = 'https://vxpjcrk7iorjzymtfpuy5csrzm0rwugg.lambda-url.us-east-1.on.aws/rooms';
  for (let start = 0; start < ids.length; start += 8) {
    await Promise.all(ids.slice(start, start + 8).map(async (id) => {
      results.set(id, await probe(`${statusBase}/${id}`, (data) =>
        String(data?.room?.id) === id && Object.values(data?.machines ?? {}).some((machine) =>
          typeof machine?.statusId === 'string')));
    }));
  }

  const origin = 'https://uvmlaundry.com';
  const [directory, pushConfiguration] = await Promise.all([
    probe(`https://api.sqinsights.com/washAlert/machines/${ids[0]}`, (data) =>
      Array.isArray(data) && data.some((machine) => machine?.washAlertIsVisible && machine.machineType),
      { 'alliancels-organization-id': '4052', Origin: origin }),
    probe('https://alerts.uvmlaundry.com/config', (data, response) =>
      typeof data?.publicKey === 'string' && response.headers.get('access-control-allow-origin') === origin,
      { Origin: origin }),
  ]);

  const machineCoverage = Object.fromEntries(rooms.map((room) => {
    const catalog = room.machineRange ? sharedFloorMachines : [
      ...(washers[room.id] ?? []).map(([id, number]) => ({ id, number, type: 'Washer' })),
      ...(dryers[room.id] ?? []).map(([id, number]) => ({ id, number, type: 'Dryer' })),
    ];
    return [room.id, machineStatusCoverage(room, results.get(room.providerId), catalog)];
  }));
  const health = {
    checkedAt: new Date().toISOString(),
    totalFeeds: ids.length,
    checkedFeeds: [...results.values()].filter(Boolean).length,
    directory: Boolean(directory),
    pushConfiguration: Boolean(pushConfiguration),
    machineCoverage,
  };
  const counts = { full: 0, partial: 0, none: 0, unevaluated: 0 };
  for (const { category } of Object.values(machineCoverage)) counts[category] += 1;
  console.log('Service checks', { ...health, machineCoverage: counts });
  return health;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const health = await checkSources();
  if (process.argv.includes('--write')) {
    await writeFile(new URL('../src/serviceHealthSnapshot.json', import.meta.url), JSON.stringify(health, null, 2) + '\n');
  }
}
