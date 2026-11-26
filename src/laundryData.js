import rooms from './laundryRooms.json';

const STATUS_BASE_URL = 'https://vxpjcrk7iorjzymtfpuy5csrzm0rwugg.lambda-url.us-east-1.on.aws/rooms';
const MACHINE_BASE_URL = 'https://api.sqinsights.com/washAlert/machines';
const ORGANIZATION_ID = '4052';

export function roomDisplayName(room) {
  return room.displayName ?? room.name;
}

export function roomMachineLabel(room) {
  const range = room.machineRange ?? room.displayRange;
  return range ? `Machines ${range[0]}–${range[1]}` : null;
}

export function roomLabel(room) {
  return [roomDisplayName(room), roomMachineLabel(room)].filter(Boolean).join(' · ');
}

export const laundryRooms = [...rooms].sort((first, second) =>
  roomLabel(first).localeCompare(roomLabel(second), undefined, { numeric: true })
);

const roomKey = (value) => String(value).toLowerCase().replace(/\bflr\b/g, 'floor').replace(/[^a-z0-9]/g, '');
const roomAliases = new Map(
  rooms.flatMap((room) => [room.id, room.name, room.officialName, room.historyId, roomLabel(room)].filter(Boolean).map((key) => [roomKey(key), room]))
);
for (const room of rooms) {
  if (room.providerId && !roomAliases.has(room.providerId)) roomAliases.set(room.providerId, room);
}
roomAliases.set('mccauleyhall', roomAliases.get('mcauley'));
roomAliases.set('ccrh6', roomAliases.get('centralcampus6'));
roomAliases.set('ccrh7', roomAliases.get('centralcampus7'));

export function findLaundryRoom(value) {
  try {
    return roomAliases.get(roomKey(decodeURIComponent(value)));
  } catch {
    return undefined;
  }
}

export function getRoomHistoryId(room) {
  return room.historyId ?? findLaundryRoom(room.historyRoomId)?.historyId;
}

export function getOfficialRoomUrl(room) {
  const historyId = getRoomHistoryId(room);
  return historyId ? `https://laundryconnectlive.com/live/${historyId}` : room.url;
}

export function roomPath(room) {
  return `#room/${room.name.toLowerCase().replace(/\s+/g, '-')}`;
}

export function filterRoomMachines(room, machines) {
  if (!room.machineRange) return machines;
  const [first, last] = room.machineRange;
  const floorMachines = machines.filter(({ number }) => Number(number) >= first && Number(number) <= last);
  if (floorMachines.length === 0) throw new Error('No machines found in this room’s range');
  return floorMachines;
}

export async function fetchRoomMachines(roomId, signal) {
  const response = await fetch(`${MACHINE_BASE_URL}/${roomId}`, {
    headers: { 'alliancels-organization-id': ORGANIZATION_ID },
    credentials: 'omit',
    signal,
  });
  if (!response.ok) throw new Error(`Machine directory returned ${response.status}`);
  const machines = await response.json();
  if (!Array.isArray(machines)) throw new Error('Invalid machine directory');

  return machines.filter((machine) =>
    machine.washAlertIsVisible && machine.machineNumber &&
    (machine.machineType?.isWasher || machine.machineType?.isDryer)
  ).map((machine) => {
    const type = machine.machineType.isWasher ? 'Washer' : 'Dryer';
    const number = String(machine.machineNumber).replace(/^0+(?=\d)/, '');
    return {
      id: String(machine.id),
      number,
      machineName: `${type} ${number}`,
      type,
      size: machine.machineType.typeName,
    };
  }).sort((first, second) => first.machineName.localeCompare(second.machineName, undefined, { numeric: true }));
}

const IN_USE = new Set(['IN_USE', 'ALMOST_DONE', 'LUCKY_CYCLE']);
const FINISHED = new Set(['COMPLETE', 'END_OF_CYCLE', 'CYCLE_COMPLETE', 'CYCLE_FINISHED', 'CLOTHES_LEFT', 'EOC']);
const OUT_OF_ORDER = new Set(['OUT_OF_ORDER', 'OUT_OF_SERVICE', 'ERROR']);
const OFFLINE = new Set(['OFFLINE', 'NETWORK_ERROR', 'UNAVAILABLE', 'DOWN']);
const OTHER_STATES = new Map([
  ['READY_TO_START', 'Ready to Start'], ['DOOR_OPEN', 'Door Open'], ['RESERVED', 'Reserved'],
]);

export function normalizeRoomStatus(payload, roomId, catalog) {
  if (!payload?.room || String(payload.room.id) !== String(roomId) ||
      !payload.machines || typeof payload.machines !== 'object' || Array.isArray(payload.machines) ||
      (catalog.length > 0 && !catalog.some(({ id }) => Object.prototype.hasOwnProperty.call(payload.machines, id)))) {
    throw new Error('Invalid room status');
  }

  return catalog.map((machine) => {
    const status = payload.machines[machine.id]?.statusId;
    const seconds = payload.machines[machine.id]?.remainingSeconds;
    const timeRemaining = IN_USE.has(status) && Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds / 60)
      : 0;

    if (status === 'AVAILABLE') return { ...machine, status: 'Available', timeRemaining };
    if (IN_USE.has(status)) return {
      ...machine,
      status: timeRemaining ? `${timeRemaining} min` : (status === 'ALMOST_DONE' ? 'Finishing Soon' : 'In Use'),
      timeRemaining,
    };
    if (FINISHED.has(status)) return { ...machine, status: 'Cycle Finished', timeRemaining };
    if (OUT_OF_ORDER.has(status)) return { ...machine, status: 'Out of Order', timeRemaining };
    if (OFFLINE.has(status)) return { ...machine, status: 'Offline', timeRemaining };
    return { ...machine, status: OTHER_STATES.get(status) ?? 'Unknown', timeRemaining };
  });
}

export async function fetchRoomStatus(roomId, signal) {
  const response = await fetch(`${STATUS_BASE_URL}/${roomId}`, {
    cache: 'no-cache',
    credentials: 'omit',
    signal,
  });
  if (!response.ok) throw new Error(`Room status returned ${response.status}`);
  return response.json();
}
