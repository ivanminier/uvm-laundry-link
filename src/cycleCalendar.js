import { machinePath, roomLabel, roomPath } from './laundryData';

const MINUTE = 60_000;
const ORIGIN = 'https://uvmlaundry.com';
const timestamp = (milliseconds) => new Date(milliseconds).toISOString().replace(/[-:]|\.\d{3}/g, '');

const escapeText = (value) => value
  .replace(/\\/g, '\\\\')
  .replace(/\r\n?|\n/g, '\\n')
  .replace(/[;,]/g, '\\$&')
  // Strip control characters disallowed in calendar content lines.
  // eslint-disable-next-line no-control-regex
  .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');

function foldLine(line) {
  const encoder = new TextEncoder();
  let bytes = 0;
  let folded = '';
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      folded += '\r\n ';
      bytes = 1;
    }
    folded += character;
    bytes += length;
  }
  return folded;
}

export function cycleCalendar({ machine, room, finish, now, uid }) {
  // iCalendar has whole-second resolution. Round up to keep the event in the future.
  const start = Math.ceil(finish / 1000) * 1000;
  const url = new URL(machine.id ? machinePath(room, machine.id) : roomPath(room), ORIGIN).href;
  const summary = escapeText(`Laundry ready — ${roomLabel(room)} ${machine.machineName}`);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UVM LaundryLink//Cycle Reminder//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@uvmlaundry.com`,
    `DTSTAMP:${timestamp(now)}`,
    `DTSTART:${timestamp(start)}`,
    `DTEND:${timestamp(start + 5 * MINUTE)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapeText(`Estimated cycle finish based on the last machine report. Time may change.\n${url}`)}`,
    `URL:${url}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0S',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].map(foldLine).join('\r\n');
}

export function downloadCycleCalendar(options) {
  const contents = cycleCalendar({ ...options, uid: crypto.randomUUID() });
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `laundrylink-${options.room.id}-${options.machine.machineName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), MINUTE);
  }
}
