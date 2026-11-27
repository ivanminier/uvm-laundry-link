import { readFile, writeFile } from 'node:fs/promises';
import { quieterWindows } from '../src/peakTimesGuidance.mjs';

const rooms = JSON.parse(await readFile(new URL('../src/laundryRooms.json', import.meta.url)));
const history = {};
const mappedRooms = rooms.filter((room) => room.historyId);

async function getPeakTimes(room) {
  const url = `https://laundryconnectlive.com/api/alliance/rooms/${room.historyId}/peak-times`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${room.name}: HTTP ${response.status}`);

  const { grid, totalSamples } = await response.json();
  if (!Number.isInteger(totalSamples) || totalSamples < 0) throw new Error(`${room.name}: invalid sample count`);
  if (totalSamples === 0) return null;

  if (!Array.isArray(grid) || grid.length !== 7 || !grid.every((day) =>
    Array.isArray(day) && day.length === 24 && day.every((hour) =>
      hour === null || (Number.isFinite(hour) && hour >= 0 && hour <= 1)
    )
  )) {
    throw new Error(`${room.name}: invalid weekly grid`);
  }

  return {
    totalSamples,
    grid: grid.map((day) => day.map((hour) => hour === null ? null : Math.round(hour * 1000) / 10)),
  };
}

const batchSize = 4;
for (let start = 0; start < mappedRooms.length; start += batchSize) {
  const batch = mappedRooms.slice(start, start + batchSize);
  const results = await Promise.all(batch.map(getPeakTimes));
  batch.forEach((room, index) => {
    if (results[index]) history[room.id] = results[index];
  });
}

if (Object.keys(history).length === 0) throw new Error('No room history returned');
await writeFile(
  new URL('../src/peakTimesSnapshot.json', import.meta.url),
  JSON.stringify({ capturedAt: new Date().toISOString(), rooms: history }) + '\n'
);
await writeFile(
  new URL('../src/peakTimesGuidance.json', import.meta.url),
  JSON.stringify(quieterWindows(history)) + '\n'
);
console.log(`Downloaded peak times for ${Object.keys(history).length} rooms`);
