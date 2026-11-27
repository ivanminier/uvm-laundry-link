import { readFile } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

const readSnapshot = async (file) => JSON.parse(await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8'));
const [health, history] = await Promise.all([readSnapshot('serviceHealthSnapshot.json'), readSnapshot('peakTimesSnapshot.json')]);
const minimumDates = [Date.parse(health.checkedAt), Date.parse(history.capturedAt)];
if (!minimumDates.every(Number.isFinite)) throw new Error('Invalid snapshot dates');
const statusUrl = new URL(process.argv[2] ?? 'https://uvmlaundry.com/status/');
const deadline = Date.now() + 6 * 60_000;

do {
  try {
    const response = await fetch(statusUrl, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (response.ok) {
      const html = await response.text();
      const minimums = [
        /Checked <time datetime="([^"]+)"/,
        /Peak Times history fetched <time datetime="([^"]+)"/,
      ];
      const dates = minimums.map(pattern => Date.parse(html.match(pattern)?.[1]));
      if (dates.every((date, index) => date >= minimumDates[index])) {
        console.log(`Live service check ${new Date(dates[0]).toISOString()}, Peak Times ${new Date(dates[1]).toISOString()}`);
        process.exit(0);
      }
    } else {
      await response.body?.cancel();
    }
  } catch {
    // The deployment may still be building. Retry until the verification deadline.
  }
  await wait(15_000);
} while (Date.now() < deadline);

throw new Error('The public status page did not show the committed snapshots within six minutes.');
