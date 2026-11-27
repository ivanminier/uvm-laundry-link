import React, { useEffect, useId, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { getRoomHistoryId } from './laundryData';
import { average, hourLabel, HOURS } from './peakTimesGuidance.mjs';
import quietWindows from './peakTimesGuidance.json';

export { quieterWindow } from './peakTimesGuidance.mjs';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LEVELS = [
  { label: 'No data', color: 'bg-slate-200 dark:bg-slate-700' },
  { label: 'Quiet', color: 'bg-teal-300 dark:bg-teal-600' },
  { label: 'Moderate', color: 'bg-yellow-300 dark:bg-yellow-500' },
  { label: 'Busy', color: 'bg-orange-400 dark:bg-orange-500' },
  { label: 'Very busy', color: 'bg-rose-500 dark:bg-rose-600' },
];
const levelFor = (value) => LEVELS[value === null ? 0 : 1 + Number(value > 25) + Number(value > 50) + Number(value > 75)];

function summarize(grid) {
  const days = grid.map((row, day) => ({ day, average: average(row) })).filter((item) => item.average !== null);
  const hours = HOURS.map((hour) => ({ hour, average: average(grid.map((row) => row[hour])) }))
    .filter((item) => item.average !== null).sort((first, second) => second.average - first.average);
  days.sort((first, second) => second.average - first.average);
  return [
    ['Busiest day', days.length ? DAYS[days[0].day] : '—'],
    ['Peak hour', hours.length ? hourLabel(hours[0].hour) : '—'],
    ['Quietest hour', hours.length ? hourLabel(hours[hours.length - 1].hour) : '—'],
  ];
}

function UsageChart({ grid, totalSamples, capturedAt, quietHours }) {
  const [selection, setSelection] = useState(null);
  const [activeCell, setActiveCell] = useState({ day: 0, hour: 0 });
  const chart = useRef(null);
  const instructions = useId();

  function moveFocus(event, day, hour) {
    if (event.altKey || event.metaKey || (event.ctrlKey && !['Home', 'End'].includes(event.key))) return;
    const lastDay = DAYS.length - 1;
    const lastHour = HOURS.length - 1;
    switch (event.key) {
      case 'ArrowLeft': hour = Math.max(0, hour - 1); break;
      case 'ArrowRight': hour = Math.min(lastHour, hour + 1); break;
      case 'ArrowUp': day = Math.max(0, day - 1); break;
      case 'ArrowDown': day = Math.min(lastDay, day + 1); break;
      case 'Home':
        hour = 0;
        if (event.ctrlKey) day = 0;
        break;
      case 'End':
        hour = lastHour;
        if (event.ctrlKey) day = lastDay;
        break;
      default: return;
    }
    event.preventDefault();
    chart.current.querySelector(`[data-usage-cell="${day}-${hour}"]`)?.focus();
  }

  const selectedValue = selection && grid[selection.day][selection.hour];

  return (
    <>
      {quietHours && (
        <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-950 dark:bg-teal-950/50 dark:text-teal-100">
          <strong>Usually quieter from {quietHours}.</strong> Based on past usage across the week, Burlington time.
        </p>
      )}
      <dl className="my-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {summarize(grid).map(([label, value]) => (
          <div key={label} className="ll-subpanel rounded-lg p-3">
            <dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="relative overflow-x-auto pb-2" tabIndex={-1}>
        <p id={instructions} className="sr-only">Use the arrow keys to move by day or hour. Press Enter or Space to show details.</p>
        <table ref={chart} role="grid" aria-label="Weekly usage chart" aria-describedby={instructions}
          className="w-full min-w-[660px] border-separate text-sm" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <td />
              {HOURS.map((hour) => (
                <th key={hour} scope="col" className="text-left text-xs font-normal text-slate-600 dark:text-slate-300">
                  <span className="sr-only">{hourLabel(hour)}</span>
                  {hour % 6 === 0 && <span aria-hidden="true" className="whitespace-nowrap">{hourLabel(hour)}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, day) => (
              <tr key={DAYS[day]}>
                <th scope="row" className="pr-1 text-left font-medium text-slate-700 dark:text-slate-200">{DAYS[day].slice(0, 3)}</th>
                {row.map((value, hour) => {
                  const level = levelFor(value);
                  const label = `${DAYS[day]} at ${hourLabel(hour)} · ${value === null ? level.label : `${value}% in use`}`;
                  return (
                    <td key={hour} role="gridcell">
                      <button type="button" className={`block h-6 w-full min-w-[22px] rounded-sm focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold ${level.color}`}
                        title={label} aria-label={label} data-usage-cell={`${day}-${hour}`}
                        tabIndex={activeCell.day === day && activeCell.hour === hour ? 0 : -1}
                        onFocus={() => setActiveCell({ day, hour })}
                        onKeyDown={(event) => moveFocus(event, day, hour)}
                        onClick={() => {
                          setActiveCell({ day, hour });
                          setSelection({ day, hour });
                        }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selection && (
        <p role="status" className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
          {DAYS[selection.day]} at {hourLabel(selection.hour)} · {selectedValue === null ? 'No data' : `${selectedValue}% of machines typically in use`}
        </p>
      )}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300" aria-label="Usage levels">
        {LEVELS.map(({ label, color }) => (
          <li key={label} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${color}`} />{label}</li>
        ))}
      </ul>
      <p className="ll-peak-times-source mt-4 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span>LaundryConnect · {totalSamples.toLocaleString()} samples</span>
        <span className="whitespace-nowrap">· Fetched <time dateTime={capturedAt}>{new Date(capturedAt).toLocaleDateString()}</time></span>
      </p>
    </>
  );
}

export function usePeakTimesSnapshot(enabled) {
  const [snapshot, setSnapshot] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || snapshot) return undefined;
    let active = true;
    setFailed(false);
    import('./peakTimesSnapshot.json').then((module) => {
      if (active) setSnapshot(module.default);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [enabled, snapshot]);

  return { snapshot, failed };
}

export function RoomPeakTimes({ room, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const historyId = getRoomHistoryId(room);
  const { snapshot, failed } = usePeakTimesSnapshot(open && Boolean(historyId));
  const snapshotId = room.historyRoomId ?? room.id;
  const data = snapshot?.rooms[snapshotId];
  const quietHours = quietWindows[snapshotId];

  return (
    <section className="ll-panel mb-8 px-5 py-4 sm:px-6">
      <h2>
        <button type="button" aria-expanded={open} aria-controls="room-peak-times"
          className="flex w-full items-center justify-between gap-3 rounded-md text-left text-lg font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-slate-100 dark:focus-visible:ring-uvm-gold"
          onClick={() => setOpen(!open)}>
          <span className="flex items-center gap-2"><Clock size={19} className="text-uvm-gold" aria-hidden="true" /> Peak Times</span>
          <span className="text-sm font-medium text-uvm-green dark:text-uvm-gold">{open ? 'Hide' : 'Show'}</span>
        </button>
      </h2>
      {!open && quietHours && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Usually quieter from {quietHours} (Burlington time).
        </p>
      )}
      {room.machineRange && (open || quietHours) && (
        <p className={`${open ? 'mt-3 text-sm' : 'mt-1 text-xs'} text-slate-600 dark:text-slate-300`}>
          The provider publishes one usage history for CCRH Floors 6 and 7.
        </p>
      )}
      <div id="room-peak-times" hidden={!open}>
        {open && data && <UsageChart {...data} capturedAt={snapshot.capturedAt} quietHours={quietHours} />}
        {open && historyId && !snapshot && !failed && <p role="status" className="mt-3 text-sm">Loading historical usage…</p>}
        {open && !data && (!historyId || snapshot || failed) && (
          <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {failed ? 'Could not load historical usage.' : 'Historical usage is unavailable for this room.'}
          </p>
        )}
      </div>
    </section>
  );
}
