import rooms from './laundryRooms.json';
import { roomLabel, roomPath } from './roomLinks.mjs';
import { isReportingMachine } from './laundryStatus.mjs';

export { roomDisplayName, roomLabel, roomPath } from './roomLinks.mjs';
export { filterRoomMachines, isProviderStatusFree, isReportingMachine, normalizeRoomStatus } from './laundryStatus.mjs';

const STATUS_BASE_URL = 'https://vxpjcrk7iorjzymtfpuy5csrzm0rwugg.lambda-url.us-east-1.on.aws/rooms';
const MACHINE_BASE_URL = 'https://api.sqinsights.com/washAlert/machines';
const ORGANIZATION_ID = '4052';

export const STATUS_MAX_AGE_MS = 60_000;

export const laundryRooms = [...rooms].sort((first, second) =>
  roomLabel(first).localeCompare(roomLabel(second), undefined, { numeric: true })
);

const roomKey = (value) => String(value).toLowerCase().replace(/\bflr\b/g, 'floor').replace(/[^a-z0-9]/g, '');
const roomAliases = new Map(
  rooms.flatMap((room) => [room.id, room.name, room.officialName, room.historyId, roomLabel(room), roomPath(room).slice(6)].filter(Boolean).map((key) => [roomKey(key), room]))
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

export const NEXT_WASHER = 'nextWasher';
export const NEXT_WASHER_LABEL = 'Next available washer';
export const NEXT_DRYER = 'nextDryer';
export const NEXT_DRYER_LABEL = 'Next available dryer';

const FREE_MACHINE_STATUSES = new Set(['Available', 'Cycle Finished', 'Door Open']);

export function isFreeMachine({ status }) {
  return FREE_MACHINE_STATUSES.has(status);
}

export function canWatchNextMachine(machines, type) {
  const matchingMachines = machines.filter((machine) => machine.type === type);
  return matchingMachines.length > 0 &&
    matchingMachines.every(machine => isReportingMachine(machine) && !isFreeMachine(machine));
}

export function machinePath(room, machineId) {
  return `${roomPath(room)}?machine=${encodeURIComponent(machineId)}`;
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

export async function fetchRoomStatus(roomId, signal) {
  const response = await fetch(`${STATUS_BASE_URL}/${roomId}`, {
    cache: 'no-cache',
    credentials: 'omit',
    signal,
  });
  if (!response.ok) throw new Error(`Room status returned ${response.status}`);
  return response.json();
}
