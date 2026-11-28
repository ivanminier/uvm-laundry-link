import { filterRoomMachines, isReportingMachine, normalizeRoomStatus } from './laundryStatus.mjs';
import { roomLocation } from './roomLocations.mjs';

export function machineStatusCoverage(room, payload, catalog) {
  try {
    const machines = filterRoomMachines(room, catalog);
    const location = roomLocation(room);
    const washers = machines.filter(({ type }) => type === 'Washer').length;
    const dryers = machines.filter(({ type }) => type === 'Dryer').length;
    if (!machines.length || !location || washers !== location.washers || dryers !== location.dryers ||
        new Set(machines.map(({ id }) => id)).size !== machines.length) {
      return { category: 'unevaluated' };
    }

    const statuses = normalizeRoomStatus(payload, room.providerId, machines);
    const reporting = statuses.filter(isReportingMachine).length;
    const expected = machines.length;
    const category = reporting === expected ? 'full' : reporting > 0 ? 'partial' : 'none';
    return { category, reporting, expected };
  } catch {
    // A failed feed, invalid response or no matching machine IDs leaves coverage unverified.
    return { category: 'unevaluated' };
  }
}
