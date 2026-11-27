import { useMemo } from 'react';
import { Clock, Droplet, LayoutGrid, Wind } from 'lucide-react';
import { getRoomHistoryId, roomLabel, roomPath } from './laundryData';
import { quieterWindow, usePeakTimesSnapshot } from './RoomPeakTimes';

function RoomLink({ room, onSelectRoom }) {
  return (
    <a href={roomPath(room)} className="font-semibold text-uvm-green underline dark:text-uvm-gold" onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onSelectRoom(room.id);
    }}>{roomLabel(room)}</a>
  );
}

function MachineGuidance({ reports, type, onSelectRoom }) {
  const isWasher = type === 'washer';
  const count = isWasher ? 'washers' : 'dryers';
  const next = isWasher ? 'nextWasher' : 'nextDryer';
  const mostFree = reports.reduce((best, report) => report[count] > (best?.[count] ?? 0) ? report : best, null);

  if (mostFree) return (
    <li><strong>Most free {count}</strong> are at <RoomLink room={mostFree.room} onSelectRoom={onSelectRoom} /> ({mostFree[count]}).</li>
  );

  const soonest = reports.reduce((best, report) =>
    report[next] !== null && report[next] < (best?.[next] ?? Infinity) ? report : best, null);
  return (
    <li>
      <strong>No free {count} reported.</strong>{' '}
      {soonest && <>Next reported finish in about {soonest[next]} min at <RoomLink room={soonest.room} onSelectRoom={onSelectRoom} />.</>}
    </li>
  );
}

export function FavoriteSummary({ rooms, statuses, offline, onSelectRoom }) {
  const { snapshot } = usePeakTimesSnapshot(rooms.some(getRoomHistoryId));
  const quieterTimes = useMemo(() => {
    const groups = new Map();
    for (const room of rooms) {
      const history = snapshot?.rooms[room.historyRoomId ?? room.id];
      const hours = history && quieterWindow(history.grid);
      if (hours) groups.set(hours, [...(groups.get(hours) ?? []), room]);
    }
    return [...groups.entries()].sort((first, second) => second[1].length - first[1].length).slice(0, 2);
  }, [rooms, snapshot]);

  const reports = offline ? [] : rooms.flatMap(room => {
    const status = statuses[room.id];
    return status?.current && Date.now() - status.checkedAt < 120_000 ? [{ room, ...status }] : [];
  });
  const pending = !offline && rooms.some(({ id }) => !statuses[id] || statuses[id].pending);
  const indicators = [
    ['Washers free', Droplet, reports.reduce((sum, status) => sum + status.washers, 0)],
    ['Dryers free', Wind, reports.reduce((sum, status) => sum + status.dryers, 0)],
    ['Rooms with both', LayoutGrid, reports.filter(status => status.washers > 0 && status.dryers > 0).length],
  ];

  return (
    <section aria-labelledby="favorite-summary-heading" className="ll-panel mb-6 px-4 py-4 sm:px-6">
      <h2 id="favorite-summary-heading" className="text-base font-semibold">Availability at a glance</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {offline ? 'Live availability is unavailable while you’re offline.'
          : reports.length ? `Recent reports from ${reports.length} of ${rooms.length} favorite ${rooms.length === 1 ? 'room' : 'rooms'}.`
            : pending ? 'Checking availability in your favorite rooms…'
              : 'Recent machine counts are unavailable for your favorite rooms.'}
      </p>
      {reports.length > 0 && (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {indicators.map(([label, Icon, value]) => (
              <div key={label} className="ll-subpanel flex min-w-0 flex-col rounded-lg p-2 sm:p-3">
                <dt className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Icon size={15} aria-hidden="true" className="hidden shrink-0 text-uvm-green dark:text-uvm-gold sm:block" />
                  {label}
                </dt>
                <dd className="mt-auto pt-1 text-xl font-bold leading-none">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <MachineGuidance reports={reports} type="washer" onSelectRoom={onSelectRoom} />
            <MachineGuidance reports={reports} type="dryer" onSelectRoom={onSelectRoom} />
          </ul>
        </>
      )}
      {quieterTimes.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">
          <h3 className="flex items-center gap-2 font-semibold">
            <Clock size={16} aria-hidden="true" className="text-uvm-gold" />
            Usually quieter <span className="font-normal text-xs text-slate-600 dark:text-slate-300">· Peak Times, Burlington time</span>
          </h3>
          <ul className="mt-1 space-y-1">
            {quieterTimes.map(([hours, [first, second, ...others]]) => (
              <li key={hours}>{hours} at <RoomLink room={first} onSelectRoom={onSelectRoom} />
                {second && <>{others.length ? ', ' : ' and '}<RoomLink room={second} onSelectRoom={onSelectRoom} /></>}
                {others.length > 0 && ` and ${others.length} more`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
