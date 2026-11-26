import React, { useEffect, useState } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { getOfficialRoomUrl, getRoomHistoryId } from './laundryData';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
const average = (values) => {
  const measured = values.filter((value) => value !== null);
  return measured.length ? measured.reduce((sum, value) => sum + value, 0) / measured.length : null;
};

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

function UsageChart({ grid, totalSamples, capturedAt }) {
  const [selection, setSelection] = useState(null);
  const selectedValue = selection && grid[selection.day][selection.hour];

  return (
    <>
      <dl className="my-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {summarize(grid).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-100 p-3 dark:bg-slate-700/60">
            <dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="relative overflow-x-auto pb-2" tabIndex="0" role="region" aria-label="Weekly usage chart">
        <table className="w-full min-w-[660px] border-separate text-sm" style={{ borderSpacing: '3px' }}>
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
                    <td key={hour}>
                      <button type="button" className={`block h-6 w-full min-w-[22px] rounded-sm focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold ${level.color}`}
                        title={label} aria-label={label} onClick={() => setSelection({ day, hour })} />
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
      <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">
        LaundryConnect Live · {totalSamples.toLocaleString()} samples · Fetched {new Date(capturedAt).toLocaleDateString()}
      </p>
    </>
  );
}

export function RoomPeakTimes({ room }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [failed, setFailed] = useState(false);
  const historyId = getRoomHistoryId(room);

  useEffect(() => {
    if (!open || !historyId || snapshot) return undefined;
    let active = true;
    import('./peakTimesSnapshot.json').then((module) => {
      if (active) setSnapshot(module.default);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [open, historyId, snapshot]);

  const data = snapshot?.rooms[room.historyRoomId ?? room.id];

  return (
    <section className="mb-8 rounded-xl bg-white px-5 py-4 shadow-lg dark:bg-slate-800/70 sm:px-6">
      <h3>
        <button type="button" aria-expanded={open} aria-controls="room-peak-times"
          className="flex w-full items-center justify-between gap-3 rounded-md text-left text-lg font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-slate-100 dark:focus-visible:ring-uvm-gold"
          onClick={() => { setOpen(!open); setFailed(false); }}>
          <span className="flex items-center gap-2"><Clock size={19} className="text-uvm-green dark:text-uvm-gold" /> Peak Times</span>
          <span className="text-sm font-medium text-uvm-green dark:text-uvm-gold">{open ? 'Hide' : 'Show'}</span>
        </button>
      </h3>
      <div id="room-peak-times" hidden={!open}>
        {open && room.machineRange && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            This chart combines Floors 6 and 7. The provider does not publish separate usage history by floor.
          </p>
        )}
        {open && data && <UsageChart {...data} capturedAt={snapshot.capturedAt} />}
        {open && historyId && !snapshot && !failed && <p role="status" className="mt-3 text-sm">Loading historical usage…</p>}
        {open && !data && (!historyId || snapshot || failed) && (
          <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {failed ? 'Could not load historical usage.' : 'Historical usage is unavailable for this room.'}
          </p>
        )}
        {open && historyId && (
          <a className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-uvm-green hover:underline dark:text-uvm-gold"
            target="_blank" rel="noopener noreferrer" href={getOfficialRoomUrl(room)}>
            Open LaundryConnect Live <ExternalLink size={13} />
          </a>
        )}
      </div>
    </section>
  );
}
