const NONREPORTING_MACHINE_STATUSES = new Set(['Unknown', 'Offline']);

// Offline and unknown readings say nothing about whether a machine is free or in use.
export function isReportingMachine({ status }) {
  return !NONREPORTING_MACHINE_STATUSES.has(status);
}

export function filterRoomMachines(room, machines) {
  if (!room.machineRange) return machines;
  const [first, last] = room.machineRange;
  const floorMachines = machines.filter(({ number }) => Number(number) >= first && Number(number) <= last);
  if (floorMachines.length === 0) throw new Error('No machines found in this room’s range');
  return floorMachines;
}

const IN_USE = new Set(['IN_USE', 'ALMOST_DONE', 'LUCKY_CYCLE']);
const FINISHED = new Set(['COMPLETE', 'END_OF_CYCLE', 'CYCLE_COMPLETE', 'CYCLE_FINISHED', 'CLOTHES_LEFT', 'EOC']);
export function isProviderStatusFree(status) {
  return status === 'AVAILABLE' || status === 'DOOR_OPEN' || FINISHED.has(status);
}

const OUT_OF_ORDER = new Set(['OUT_OF_ORDER', 'OUT_OF_SERVICE', 'ERROR']);
const OFFLINE = new Set(['OFFLINE', 'NETWORK_ERROR', 'UNAVAILABLE', 'DOWN']);
const OTHER_STATES = new Map([
  ['READY_TO_START', 'Ready to Start'], ['DOOR_OPEN', 'Door Open'], ['RESERVED', 'Reserved'],
]);

function parseObservationTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) return undefined;
  // The provider's timezone-less machine timestamps are UTC.
  const iso = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function normalizeRoomStatus(payload, roomId, catalog) {
  if (!payload?.room || String(payload.room.id) !== String(roomId) ||
      !payload.machines || typeof payload.machines !== 'object' || Array.isArray(payload.machines) ||
      (catalog.length > 0 && !catalog.some(({ id }) => Object.prototype.hasOwnProperty.call(payload.machines, id)))) {
    throw new Error('Invalid room status');
  }

  return catalog.map((machine) => {
    const reading = payload.machines[machine.id];
    const status = reading?.statusId;
    const seconds = reading?.remainingSeconds;
    const timeRemaining = IN_USE.has(status) && Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds / 60)
      : 0;

    if (status === 'AVAILABLE') return { ...machine, status: 'Available', timeRemaining };
    if (IN_USE.has(status)) return {
      ...machine,
      status: timeRemaining ? `${timeRemaining} min` : (status === 'ALMOST_DONE' ? 'Finishing Soon' : 'In Use'),
      timeRemaining,
      remainingSeconds: timeRemaining ? seconds : undefined,
      observedAt: parseObservationTime(reading.createdAt ?? reading.receivedAt),
    };
    if (FINISHED.has(status)) return { ...machine, status: 'Cycle Finished', timeRemaining };
    if (OUT_OF_ORDER.has(status)) return { ...machine, status: 'Out of Order', timeRemaining };
    if (OFFLINE.has(status)) return { ...machine, status: 'Offline', timeRemaining };
    return { ...machine, status: OTHER_STATES.get(status) ?? 'Unknown', timeRemaining };
  });
}
