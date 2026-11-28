import { machineStatusCoverage } from './machineStatusCoverage.mjs';
import rooms from './laundryRooms.json';
import sharedFloorMachines from '../alerts/ccrh-machines.json';

const room = rooms.find(({ id }) => id === 'central_campus_3');
const catalog = [
  ...['12', '13', '14', '16'].map(id => ({ id, type: 'Washer' })),
  ...['17', '18', '19', '20'].map(id => ({ id, type: 'Dryer' })),
];
const readings = (machines, status) => Object.fromEntries(machines.map(({ id }) => [id, { statusId: status }]));
const payload = (machines, id = room.providerId) => ({ room: { id }, machines });

test('counts out-of-order readings as known and ignores unverified machines', () => {
  const result = machineStatusCoverage(room, payload({
    ...readings(catalog, 'OUT_OF_ORDER'),
    15: { statusId: 'OFFLINE' },
  }), catalog);
  expect(result).toEqual({ category: 'full', reporting: 8, expected: 8 });
});

test('counts missing, unknown and offline readings against the expected room inventory', () => {
  const result = machineStatusCoverage(room, payload({
    12: { statusId: 'AVAILABLE' },
    13: { statusId: 'UNRECOGNIZED' },
    14: { statusId: 'OFFLINE' },
  }), catalog);
  expect(result).toEqual({ category: 'partial', reporting: 1, expected: 8 });
});

test.each(['OFFLINE', 'UNKNOWN'])('categorizes a room with only %s readings as having no usable availability', (status) => {
  expect(machineStatusCoverage(room, payload(readings(catalog, status)), catalog))
    .toEqual({ category: 'none', reporting: 0, expected: 8 });
});

test('leaves failed responses, missing matches and incomplete catalogs unevaluated', () => {
  const status = payload(readings(catalog, 'AVAILABLE'));
  expect(machineStatusCoverage(room, null, catalog)).toEqual({ category: 'unevaluated' });
  expect(machineStatusCoverage(room, payload(status.machines, 'wrong'), catalog)).toEqual({ category: 'unevaluated' });
  expect(machineStatusCoverage(room, payload({ 15: { statusId: 'AVAILABLE' } }), catalog))
    .toEqual({ category: 'unevaluated' });
  expect(machineStatusCoverage(room, status, catalog.slice(1))).toEqual({ category: 'unevaluated' });
});

test('evaluates the two floors sharing one feed using only their respective machine ranges', () => {
  const [floor6, floor7] = ['central_campus_6', 'central_campus_7'].map(id => rooms.find(room => room.id === id));
  const six = sharedFloorMachines.filter(({ number }) => number <= 55);
  const seven = sharedFloorMachines.filter(({ number }) => number >= 56);
  const both = payload({ ...readings(six, 'OFFLINE'), ...readings(seven, 'AVAILABLE') }, floor6.providerId);
  expect(machineStatusCoverage(floor6, both, sharedFloorMachines)).toEqual({ category: 'none', reporting: 0, expected: 11 });
  expect(machineStatusCoverage(floor7, both, sharedFloorMachines)).toEqual({ category: 'full', reporting: 7, expected: 7 });
  expect(machineStatusCoverage(floor7, payload(readings(six, 'AVAILABLE'), floor6.providerId), sharedFloorMachines))
    .toEqual({ category: 'unevaluated' });
});
