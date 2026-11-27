import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const origin = 'https://uvmlaundry.com';
const pushModule = new URL('./push.js', import.meta.url).href;
const mockPush = 'data:text/javascript,' + encodeURIComponent(
  `export { parseSubscription } from ${JSON.stringify(pushModule)};
   export const deliverPush = (subscription, message, env) => env.testDeliver(message);`
);
const mockWorker = 'data:text/javascript,' + encodeURIComponent(
  'export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }'
);
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'cloudflare:workers') return next(mockWorker, context);
    if (specifier === './push') return next(mockPush, context);
    if (/^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/.test(specifier)) {
      return next(specifier + '.js', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.endsWith('.json')) return next(url, context);
    return { format: 'module', shortCircuit: true, source: 'export default ' + readFileSync(new URL(url), 'utf8') };
  },
});
const { default: worker, RoomAlerts } = await import('./worker.js');
hooks.deregister();

const floor6 = 'central_campus_6';
const floor7 = 'central_campus_7';
const roomId = '12247';
const washers = JSON.parse(readFileSync(new URL('./room-washers.json', import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL('./ccrh-machines.json', import.meta.url)));
const dryers = catalog.filter(machine => machine.type === 'Dryer' && Number(machine.number) >= 56);
const { x, y } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey.export({ format: 'jwk' });
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/fixture',
  keys: {
    p256dh: Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]).toString('base64url'),
    auth: randomBytes(16).toString('base64url'),
  },
};

test('next-room alerts survive failed feeds, reject stale reports, use exact floors and machine types, and deep-link after delivery', async (t) => {
  assert.ok(dryers.length, 'Floor 7 dryer fixtures');
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  let alarmTime = null;
  const deliveries = [];
  const env = {
    VAPID_PRIVATE_KEY: 'fixture', VAPID_PUBLIC_KEY: 'fixture',
    ALERT_REQUESTS: { limit: async () => ({ success: true }) },
    testDeliver: async (message) => { deliveries.push(message); return 'accepted'; },
  };
  const alertRoom = new RoomAlerts({
    waitUntil() {},
    storage: {
      getAlarm: async () => alarmTime,
      setAlarm: async (time) => { alarmTime = time; },
      sql: { exec: (sql, ...args) => {
        const statement = db.prepare(sql);
        if (statement.columns().length) return { toArray: () => statement.all(...args) };
        statement.run(...args);
        return { toArray: () => [] };
      } },
    },
  }, env);
  env.ROOM_ALERTS = { getByName: (name) => { assert.equal(name, roomId); return alertRoom; } };

  const machines = Object.fromEntries(catalog.map(({ id }) => [id, { statusId: 'IN_USE', receivedAt: '2026-11-27T05:00:00Z' }]));
  let outage = false;
  t.mock.method(globalThis, 'fetch', async (url) => {
    // The provider's machine directory is not reachable from the Worker; room alerts use bundled catalogs.
    if (url.includes('/washAlert/machines/')) throw new TypeError('Machine directory unavailable');
    return outage ? new Response('', { status: 503 }) : Response.json({ room: { id: roomId }, machines });
  });

  const call = (path, body) => worker.fetch(new Request('https://alerts.uvmlaundry.com' + path, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  const washerIds = washers[floor6].map(([id]) => id);
  const dryerIds = dryers.map(({ id }) => id);
  const register = async (floor, machineId, machineIds) =>
    call('/alerts', { roomId: floor, machineId, machineIds, subscription });
  const status = async (floor, id) => (await call('/alerts/status', { roomId: floor, id })).json();

  machines[washerIds[0]].statusId = 'COMPLETE';
  assert.equal((await register(floor6, 'nextWasher', washerIds)).status, 409);
  machines[washerIds[0]].statusId = 'IN_USE';
  assert.equal((await register(floor7, 'nextDryer', [washerIds[0]])).status, 503);

  const washer = await (await register(floor6, 'nextWasher', washerIds)).json();
  const cancelled = await (await register(floor7, 'nextDryer', dryerIds)).json();
  assert.equal((await status(floor6, washer.id)).active, true);
  assert.equal((await status(floor7, washer.id)).active, false);
  assert.equal((await call('/alerts/cancel', { roomId: floor7, id: cancelled.id })).status, 200);
  assert.equal((await status(floor7, cancelled.id)).active, false);
  const dryer = await (await register(floor7, 'nextDryer', dryerIds)).json();

  outage = true;
  await alertRoom.alarm();
  assert.equal(deliveries.length, 0);
  assert.equal((await status(floor7, dryer.id)).active, true);
  outage = false;
  machines[washers[floor7][0][0]].statusId = 'AVAILABLE';
  await alertRoom.alarm();
  assert.equal(deliveries.length, 0);

  machines[washerIds[0]] = { statusId: 'AVAILABLE', receivedAt: '2026-11-27T04:59:59Z' };
  machines[dryerIds[0]] = { statusId: 'DOOR_OPEN', receivedAt: '2026-11-27T05:00:00Z' };
  await alertRoom.alarm();
  assert.equal(deliveries.length, 0);

  machines[washerIds[0]] = { statusId: 'COMPLETE', receivedAt: '2026-11-27T05:00:01Z' };
  machines[dryerIds[0]] = { statusId: 'DOOR_OPEN', receivedAt: '2026-11-27T05:00:01Z' };
  await alertRoom.alarm();
  assert.deepEqual(new Set(deliveries.map(({ path }) => path)), new Set([
    `#room/ccrh-floor-6?machine=${washerIds[0]}`, `#room/ccrh-floor-7?machine=${dryerIds[0]}`,
  ]));
  assert.equal((await status(floor6, washer.id)).active, false);
  assert.equal((await status(floor7, dryer.id)).active, false);

  const handlers = new Map();
  let opened;
  runInNewContext(readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8'), {
    URL, self: {
      location: { origin },
      addEventListener: (event, handler) => handlers.set(event, handler),
      clients: { matchAll: async () => [], openWindow: (url) => { opened = url; } },
    },
  });
  let clicked;
  handlers.get('notificationclick')({
    notification: { close() {}, data: { path: deliveries[0].path } },
    waitUntil: (promise) => { clicked = promise; },
  });
  await clicked;
  assert.equal(opened, origin + '/' + deliveries[0].path);
});

test('directory analytics accept only aggregate categories and honor privacy signals', async () => {
  const writes = [];
  const env = {
    REFERRALS: { prepare: () => ({ bind: (...values) => ({ run: async () => { writes.push(values); } }) }) },
    REFERRAL_REQUESTS: { limit: async () => ({ success: true }) },
  };
  const pending = [];
  async function post(path, body, headers) {
    const response = await worker.fetch(new Request(origin + path, {
      method: 'POST', body: new URLSearchParams(body), headers: { Origin: origin, ...headers },
    }), env, { waitUntil: (write) => pending.push(write) });
    await Promise.all(pending.splice(0));
    return response.status;
  }

  for (const label of ['campus', 'complex', 'sitemap']) {
    assert.equal(await post('/metrics', { metric: 'page_view', label }), 204);
    assert.equal(await post('/referrals', { category: 'google', page: label }), 204);
  }
  assert.deepEqual(writes.map(values => values.slice(1)), [
    ['page_view', 'campus'], ['google', 'campus'],
    ['page_view', 'complex'], ['google', 'complex'],
    ['page_view', 'sitemap'], ['google', 'sitemap'],
  ]);
  assert.equal(await post('/metrics', { metric: 'page_view', label: 'campus:redstone' }), 400);
  assert.equal(await post('/referrals', { category: 'google', page: 'campus' }, { 'Sec-GPC': '1' }), 204);
  assert.equal(writes.length, 6);
});

test('next-room alerts require usable statuses for every watched machine and keep existing alerts through outages', async (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  let alarmTime = null;
  const deliveries = [];
  const env = {
    VAPID_PRIVATE_KEY: 'fixture', VAPID_PUBLIC_KEY: 'fixture',
    ALERT_REQUESTS: { limit: async () => ({ success: true }) },
    testDeliver: async (message) => { deliveries.push(message); return 'accepted'; },
  };
  const alertRoom = new RoomAlerts({
    waitUntil() {},
    storage: {
      getAlarm: async () => alarmTime,
      setAlarm: async (time) => { alarmTime = time; },
      sql: { exec: (sql, ...args) => {
        const statement = db.prepare(sql);
        if (statement.columns().length) return { toArray: () => statement.all(...args) };
        statement.run(...args);
        return { toArray: () => [] };
      } },
    },
  }, env);
  env.ROOM_ALERTS = { getByName: () => alertRoom };
  const machines = Object.fromEntries(catalog.map(({ id }) => [id, { statusId: 'IN_USE', receivedAt: '2026-11-27T05:00:00Z' }]));
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.includes('/washAlert/machines/')) throw new TypeError('Machine directory unavailable');
    return Response.json({ room: { id: roomId }, machines });
  });
  const call = (path, body) => worker.fetch(new Request('https://alerts.uvmlaundry.com' + path, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  const washerIds = washers[floor6].map(([id]) => id);
  const dryerIds = dryers.map(({ id }) => id);
  const setAll = (ids, statusId) => ids.forEach((id) => { machines[id] = { statusId, receivedAt: '2026-11-27T05:00:00Z' }; });
  const register = (floor, machineId, machineIds) => call('/alerts', { roomId: floor, machineId, machineIds, subscription });
  const status = async (floor, id) => (await call('/alerts/status', { roomId: floor, id })).json();

  for (const statusId of ['OFFLINE', 'UNAVAILABLE', 'NETWORK_ERROR', 'SOMETHING_NEW']) {
    setAll(washerIds, statusId);
    const response = await register(floor6, 'nextWasher', washerIds);
    assert.equal(response.status, 409, statusId);
    assert.match((await response.json()).error ?? '', /Could not confirm/);
  }
  // Mixed offline and unknown, and one nonreporting machine among confirmed running machines.
  setAll(washerIds, 'IN_USE');
  machines[washerIds[0]].statusId = 'OFFLINE';
  assert.equal((await register(floor6, 'nextWasher', washerIds)).status, 409);
  if (washerIds.length > 1) machines[washerIds[1]].statusId = 'SOMETHING_NEW';
  assert.equal((await register(floor6, 'nextWasher', washerIds)).status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM alerts').get().count, 0);

  // One type entirely offline does not block the other type.
  setAll(dryerIds, 'IN_USE');
  setAll(washers[floor7].map(([id]) => id), 'OFFLINE');
  const dryer = await (await register(floor7, 'nextDryer', dryerIds)).json();
  assert.ok(dryer.id);

  // Known out-of-order machines remain a known status, as before.
  setAll(washerIds, 'IN_USE');
  machines[washerIds[0]].statusId = 'OUT_OF_ORDER';
  const washer = await (await register(floor6, 'nextWasher', washerIds)).json();
  assert.ok(washer.id);

  // Existing alerts stay active, re-registration returns the same alert, and nothing is sent while machines report offline.
  setAll(washerIds, 'OFFLINE');
  setAll(dryerIds, 'OFFLINE');
  assert.equal((await (await register(floor6, 'nextWasher', washerIds)).json()).id, washer.id);
  await alertRoom.alarm();
  assert.equal(deliveries.length, 0);
  assert.equal((await status(floor6, washer.id)).active, true);
  assert.equal((await status(floor7, dryer.id)).active, true);
  assert.equal((await call('/alerts/cancel', { roomId: floor7, id: dryer.id })).status, 200);
  assert.equal((await status(floor7, dryer.id)).active, false);

  // Recovery: a watched washer reporting free again delivers the existing alert.
  machines[washerIds[0]] = { statusId: 'AVAILABLE', receivedAt: '2026-11-27T05:00:01Z' };
  await alertRoom.alarm();
  assert.deepEqual(deliveries.map(({ path }) => path), [`#room/ccrh-floor-6?machine=${washerIds[0]}`]);
  assert.equal((await status(floor6, washer.id)).active, false);
});

test('bundled room alert catalogs cover every room, keep CCRH floors separate, and use one status request per registration', async (t) => {
  const rooms = JSON.parse(readFileSync(new URL('../src/laundryRooms.json', import.meta.url)));
  const roomDryers = JSON.parse(readFileSync(new URL('./room-dryers.json', import.meta.url)));
  const ids = new Set();
  for (const room of rooms.filter(({ providerId }) => providerId)) {
    for (const [catalogName, entries] of [['washers', washers[room.id]], ['dryers', roomDryers[room.id]]]) {
      assert.ok(entries?.length, `${room.id} has verified ${catalogName}`);
      for (const [id, number] of entries) {
        assert.match(id, /^\d{1,15}$/);
        assert.ok(!ids.has(id), `${id} appears once`);
        ids.add(id);
        if (room.machineRange) assert.ok(Number(number) >= room.machineRange[0] && Number(number) <= room.machineRange[1], `${room.id} ${number}`);
      }
    }
  }
  assert.deepEqual(roomDryers.central_campus_7.map(([id]) => id).sort(), dryers.map(({ id }) => id).sort());

  const davisDryers = roomDryers.davis.map(([id]) => id);
  const requests = [];
  const store = new DatabaseSync(':memory:');
  t.after(() => store.close());
  const env = { VAPID_PRIVATE_KEY: 'fixture', VAPID_PUBLIC_KEY: 'fixture', ALERT_REQUESTS: { limit: async () => ({ success: true }) } };
  const alertRoom = new RoomAlerts({ waitUntil() {}, storage: {
    getAlarm: async () => null, setAlarm: async () => {},
    sql: { exec: (sql, ...args) => {
      const statement = store.prepare(sql);
      if (statement.columns().length) return { toArray: () => statement.all(...args) };
      statement.run(...args);
      return { toArray: () => [] };
    } },
  } }, env);
  env.ROOM_ALERTS = { getByName: () => alertRoom };
  const statuses = Object.fromEntries(davisDryers.map((id) => [id, { statusId: 'IN_USE' }]));
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url);
    if (url.includes('/washAlert/machines/')) throw new TypeError('Machine directory unavailable');
    return Response.json({ room: { id: '12254' }, machines: statuses });
  });
  const register = (machineIds) => worker.fetch(new Request('https://alerts.uvmlaundry.com/alerts', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: 'davis', machineId: 'nextDryer', machineIds, subscription }),
  }), env);

  assert.equal((await register(davisDryers.slice(1))).status, 503);
  statuses[davisDryers[0]].statusId = 'AVAILABLE';
  const free = await register(davisDryers);
  assert.equal(free.status, 409);
  assert.match((await free.json()).error, /A dryer is free now/);
  statuses[davisDryers[0]].statusId = 'OFFLINE';
  assert.equal((await register(davisDryers)).status, 409);
  statuses[davisDryers[0]].statusId = 'IN_USE';
  const created = await register(davisDryers);
  assert.equal(created.status, 200);
  assert.ok((await created.json()).id);
  assert.equal(requests.filter((url) => url.includes('/washAlert/machines/')).length, 0);
  assert.equal(requests.length, 4);
});
