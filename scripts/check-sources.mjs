import { readFile, writeFile } from 'node:fs/promises';

const rooms = JSON.parse(await readFile(new URL('../src/laundryRooms.json', import.meta.url)));
const ids = [...new Set(rooms.map(({ providerId }) => providerId).filter(Boolean))];
const results = new Map();

async function probe(url, valid, headers = {}) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    return response.ok && valid(await response.json(), response);
  } catch {
    return false;
  }
}

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

const health = {
  checkedAt: new Date().toISOString(),
  totalFeeds: ids.length,
  checkedFeeds: [...results.values()].filter(Boolean).length,
  directory,
  pushConfiguration,
};
await writeFile(new URL('../public/service-health.json', import.meta.url), JSON.stringify(health) + '\n');
console.log('Service checks', health);
