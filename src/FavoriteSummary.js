import { useMemo } from 'react';
import { ArrowRight, Clock, Droplet, LayoutGrid, Wind } from 'lucide-react';
import { getRoomHistoryId, roomLabel, roomPath } from './laundryData';
import { quieterWindow, usePeakTimesSnapshot } from './RoomPeakTimes';

function RoomLink({ room, onSelectRoom, className, children }) {
  return (
    <a href={roomPath(room)} className={className} onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onSelectRoom(room.id);
    }}>{children ?? roomLabel(room)}</a>
  );
}

function MachineGuidance({ reports, type, onSelectRoom }) {
  const isWasher = type === 'washer';
  const count = isWasher ? 'washers' : 'dryers';
  const known = reports.filter(report => report[isWasher ? 'washerStatuses' : 'dryerStatuses']);
  const next = isWasher ? 'nextWasher' : 'nextDryer';
  const best = known.reduce((room, report) => report[count] > (room?.[count] ?? 0) ? report : room, null);
  const soonest = known.reduce((room, report) =>
    report[next] !== null && report[next] < (room?.[next] ?? Infinity) ? report : room, null);
  const recommendation = best ?? soonest;
  const Icon = isWasher ? Droplet : Wind;
  const label = best ? `${best[count]} ${best[count] === 1 ? type : count} free`
    : soonest ? `Next ${type} finish · ~${soonest[next]} min`
      : known.length ? `No free ${count} reported` : `${isWasher ? 'Washer' : 'Dryer'} availability unavailable`;

  return (
    <div className="ll-favorite-guidance">
      <span><Icon size={17} aria-hidden="true" /> {label}</span>
      {recommendation && <RoomLink className="ll-favorite-room-link" room={recommendation.room} onSelectRoom={onSelectRoom} />}
    </div>
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
  const roomsWithBoth = reports.filter(({ washers, dryers }) => washers > 0 && dryers > 0);
  // Count complete washer-and-dryer pairs first, then total free machines.
  const best = roomsWithBoth.reduce((best, report) => {
    if (!best) return report;
    const pairs = Math.min(report.washers, report.dryers);
    const bestPairs = Math.min(best.washers, best.dryers);
    return pairs > bestPairs || (pairs === bestPairs && report.washers + report.dryers > best.washers + best.dryers)
      ? report : best;
  }, null);
  const total = (type, reported) => reports.some(report => report[reported])
    ? reports.reduce((sum, report) => sum + report[type], 0) : '—';
  const indicators = [
    ['Washers free', Droplet, total('washers', 'washerStatuses')],
    ['Dryers free', Wind, total('dryers', 'dryerStatuses')],
    ['Rooms with both', LayoutGrid, roomsWithBoth.length],
  ];

  return (
    <section aria-labelledby="favorite-summary-heading" className="ll-panel ll-favorite-summary mb-6">
      <header className="ll-favorite-summary__header">
        <h2 id="favorite-summary-heading">Availability at a glance</h2>
        {reports.length > 0 && (
          <p className="ll-favorite-summary__coverage">
            <span aria-hidden="true" />
            {reports.length} of {rooms.length} favorite rooms reporting
          </p>
        )}
      </header>
      {reports.length > 0 ? (
        <div className="ll-favorite-summary__grid">
          {best ? (
            <RoomLink room={best.room} onSelectRoom={onSelectRoom} className="ll-favorite-recommendation">
              <span className="ll-favorite-recommendation__label">Wash and dry in one room</span>
              <strong>{roomLabel(best.room)}</strong>
              <span className="ll-favorite-recommendation__counts">
                <span><Droplet size={16} aria-hidden="true" /> {best.washers} {best.washers === 1 ? 'washer' : 'washers'} free</span>
                <span><Wind size={16} aria-hidden="true" /> {best.dryers} {best.dryers === 1 ? 'dryer' : 'dryers'} free</span>
              </span>
              <ArrowRight className="ll-favorite-recommendation__arrow" size={20} aria-hidden="true" />
            </RoomLink>
          ) : (
            <div className="ll-favorite-guidance-list">
              <MachineGuidance reports={reports} type="washer" onSelectRoom={onSelectRoom} />
              <MachineGuidance reports={reports} type="dryer" onSelectRoom={onSelectRoom} />
            </div>
          )}
          <dl className="ll-favorite-summary__totals" aria-label="Totals from recent reports">
            {indicators.map(([label, Icon, value]) => (
              <div key={label}>
                <dt><Icon size={17} aria-hidden="true" />{label}</dt>
                <dd>{value === '—' ? <><span aria-hidden="true">—</span><span className="sr-only">Unavailable</span></> : value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="ll-favorite-summary__message" role="status">
          {offline ? 'Live availability is unavailable while you’re offline.'
            : pending ? 'Checking availability in your favorite rooms…'
              : 'Recent machine counts are unavailable for your favorite rooms.'}
        </p>
      )}
      {quieterTimes.length > 0 && (
        <div className="ll-favorite-summary__history">
          <h3><Clock size={17} aria-hidden="true" /> Usually quieter</h3>
          <ul>
            {quieterTimes.map(([hours, [first, second, ...others]]) => (
              <li key={hours}><strong>{hours}</strong>{' '}
                <RoomLink className="ll-favorite-room-link" room={first} onSelectRoom={onSelectRoom} />
                {second && <>{', '}<RoomLink className="ll-favorite-room-link" room={second} onSelectRoom={onSelectRoom} /></>}
                {others.length > 0 && <> and {others.length} more</>}
              </li>
            ))}
          </ul>
          <p>Historical usage · Burlington time</p>
        </div>
      )}
    </section>
  );
}
