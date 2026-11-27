import { TextEncoder } from 'util';
import { cycleCalendar } from './cycleCalendar';
import { cycleFinishAt, nextReportedFinish } from './cycleEstimates';
import { findLaundryRoom, normalizeRoomStatus } from './laundryData';

const now = Date.parse('2026-11-02T04:00:00Z');
const checkedAt = now - 5_000;

const normalize = (entries, timestamp = '2026-11-02T03:59:40.000000') => normalizeRoomStatus({
  room: { id: 12247 },
  machines: Object.fromEntries(entries.map(([id, statusId, remainingSeconds]) => [
    id, { statusId, remainingSeconds, createdAt: timestamp },
  ])),
}, '12247', entries.map(([id]) => ({ id })));

test('uses the provider observation in UTC and keeps the first catalog entry when finishes tie', () => {
  const machines = normalize([
    ['56', 'IN_USE', 360], ['57', 'ALMOST_DONE', 360], ['58', 'IN_USE', 720],
    ['59', 'OUT_OF_ORDER', 1], ['60', 'RESERVED', 1],
  ]);
  expect(nextReportedFinish(machines, checkedAt, now)).toEqual({
    machine: machines[0],
    estimatedFinish: now + 340_000,
  });
  expect(cycleFinishAt(machines[3], checkedAt, now)).toBeNull();
  expect(cycleFinishAt(machines[4], checkedAt, now)).toBeNull();
});

test.each(['AVAILABLE', 'COMPLETE', 'DOOR_OPEN', 'UNKNOWN', 'OFFLINE'])(
  'withholds the earliest finish when the same type includes %s',
  (status) => {
    const machines = normalize([['56', 'IN_USE', 360], ['57', status, 500]]);
    expect(nextReportedFinish(machines, checkedAt, now)).toBeNull();
    expect(cycleFinishAt(machines[0], checkedAt, now)).toBe(now + 340_000);
  },
);

test.each([undefined, NaN, Infinity, '60', 0, -1])('rejects invalid durations (%s)', (duration) => {
  const machines = normalize([['56', 'IN_USE', 360], ['57', 'IN_USE', duration]]);
  expect(nextReportedFinish(machines, checkedAt, now)).toBeNull();
  expect(cycleFinishAt(machines[1], checkedAt, now)).toBeNull();
});

test('rejects stale room checks, stale machine reports, missing or invalid observations and past finishes', () => {
  const [machine] = normalize([['56', 'IN_USE', 360]]);
  expect(cycleFinishAt(machine, now - 60_001, now)).toBeNull();
  expect(cycleFinishAt({ ...machine, observedAt: now - 60_001 }, checkedAt, now)).toBeNull();
  expect(cycleFinishAt({ ...machine, observedAt: now + 1 }, checkedAt, now)).toBeNull();
  expect(cycleFinishAt({ ...machine, observedAt: undefined }, checkedAt, now)).toBeNull();
  expect(cycleFinishAt(normalize([['56', 'IN_USE', 360]], 'yesterday')[0], checkedAt, now)).toBeNull();
  expect(cycleFinishAt({ ...machine, remainingSeconds: 20 }, checkedAt, now)).toBeNull();
  expect(nextReportedFinish([], checkedAt, now)).toBeNull();
});

test.each([
  ['2026-11-02T03:59:40Z', '2026-11-02T03:59:50Z', '20261102T040540Z', '20261102T041040Z'],
  ['2026-11-01T01:59:40-04:00', '2026-11-01T01:59:50-04:00', '20261101T060540Z', '20261101T061040Z'],
])('creates a UTC event and alarm across a time boundary (%s)', (observation, time, start, end) => {
  const originalEncoder = global.TextEncoder;
  global.TextEncoder = TextEncoder;
  try {
    const date = Date.parse(time);
    const [machine] = normalize([['56', 'IN_USE', 360]], observation);
    const room = findLaundryRoom('ccrh 7');
    const file = cycleCalendar({
      machine: { ...machine, machineName: 'Washer 56, é; \\ label\n' + '🍃'.repeat(40) },
      room,
      finish: cycleFinishAt(machine, date, date),
      now: date,
      uid: 'fixture',
    });
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(file.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(file.split('\r\n').every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
    const unfolded = file.replace(/\r\n /g, '');
    expect(unfolded).toContain(`DTSTART:${start}\r\nDTEND:${end}`);
    expect(unfolded).toContain('UID:fixture@uvmlaundry.com');
    expect(unfolded).toContain('SUMMARY:Laundry ready — CCRH · Floor 7 Washer 56\\, é\\; \\\\ label\\n' + '🍃'.repeat(40));
    expect(unfolded).toContain('URL:https://uvmlaundry.com/#room/ccrh-floor-7?machine=56');
    expect(unfolded).toContain('BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0S');
    expect(unfolded).toContain('Estimated cycle finish');
  } finally {
    global.TextEncoder = originalEncoder;
  }
});
