import { DurableObject } from 'cloudflare:workers';
import { fetchRoomStatus, filterRoomMachines, findLaundryRoom, roomLabel, roomPath } from '../src/laundryData';
import { deliverPush, parseSubscription } from './push';
import ccrhMachines from './ccrh-machines.json';

const LISTEN_ORIGIN = 'https://uvmlaundry.com';
const ORIGINS = new Set([LISTEN_ORIGIN, 'https://www.uvmlaundry.com']);
const POLL_INTERVAL = 30_000;
const ALERT_LIFETIME = 4 * 60 * 60 * 1000;
const MAX_ALERTS_PER_ROOM = 60;
const RUNNING = new Set(['IN_USE', 'ALMOST_DONE', 'LUCKY_CYCLE']);
const FINISHED = new Set(['COMPLETE', 'END_OF_CYCLE', 'CYCLE_COMPLETE', 'CYCLE_FINISHED', 'CLOTHES_LEFT', 'EOC']);

const rejected = (status, error) => ({ status, error });

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('Expected JSON');
  }
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  for await (const chunk of request.body ?? []) {
    size += chunk.byteLength;
    if (size > 4096) throw new Error('Request too large');
    text += decoder.decode(chunk, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    const origin = request.headers.get('Origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Vary': 'Origin' });
    const reply = (body, status = 200) => Response.json(body, { status, headers });

    if (origin && !ORIGINS.has(origin)) return reply({ error: 'Origin is not allowed.' }, 403);
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    if (pathname === '/config' && request.method === 'GET') {
      return reply({ publicKey: env.VAPID_PUBLIC_KEY ?? null });
    }
    if (request.method !== 'POST' || !['/alerts', '/alerts/cancel', '/alerts/status'].includes(pathname)) {
      return reply({ error: 'Route not found.' }, 404);
    }
    if (!origin) return reply({ error: 'Origin is required.' }, 403);
    if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return reply({ error: 'Push alerts are unavailable.' }, 503);

    const limit = await env.ALERT_REQUESTS.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' });
    if (!limit.success) return reply({ error: 'Too many requests. Try again in a minute.' }, 429);

    let data;
    try { data = await readJson(request); } catch { return reply({ error: 'Invalid request.' }, 400); }
    if (typeof data?.roomId !== 'string' || data.roomId.length > 80) return reply({ error: 'Room not found.' }, 404);
    const room = findLaundryRoom(data.roomId);
    if (!room?.providerId || room.id !== data.roomId) return reply({ error: 'Room not found.' }, 404);
    const roomAlerts = env.ROOM_ALERTS.getByName(room.providerId);

    if (pathname !== '/alerts') {
      if (typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/.test(data.id)) return reply({ error: 'Invalid alert.' }, 400);
      if (pathname === '/alerts/status') return reply({ active: await roomAlerts.isPending(room.id, data.id) });
      await roomAlerts.cancel(room.id, data.id);
      return reply({ cancelled: true });
    }
    const subscription = parseSubscription(data.subscription);
    if (!subscription || typeof data.machineId !== 'string' || !/^\d{1,15}$/.test(data.machineId) ||
        ![0, 5].includes(data.leadMinutes)) {
      return reply({ error: 'Invalid machine or browser subscription.' }, 400);
    }

    try {
      const result = await roomAlerts.register(room.id, data.machineId, data.machineName, data.leadMinutes, subscription);
      return reply(result, result.status ?? 200);
    } catch (failure) {
      console.warn('alert_registration_failed', { roomId: room.id, reason: String(failure.message).slice(0, 150) });
      return reply({ error: 'The alert service could not check this machine. Try again shortly.' }, 503);
    }
  },
};

export class RoomAlerts extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY, dedupe_key TEXT NOT NULL UNIQUE, room_id TEXT NOT NULL,
        machine_id TEXT NOT NULL, machine_name TEXT NOT NULL, lead_minutes INTEGER NOT NULL,
        subscription TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  async register(roomId, machineId, name, leadMinutes, subscription) {
    const room = findLaundryRoom(roomId);
    const now = Date.now();
    this.sql.exec('DELETE FROM alerts WHERE expires_at <= ?', now);
    const dedupe = JSON.stringify([roomId, machineId, leadMinutes, subscription.endpoint]);
    const existing = this.sql.exec(
      'SELECT id, expires_at AS expiresAt FROM alerts WHERE dedupe_key = ?', dedupe
    ).toArray()[0];
    if (existing) {
      await this.arm();
      return existing;
    }

    const mappedMachine = room.machineRange && filterRoomMachines(room, ccrhMachines).find(({ id }) => id === machineId);
    if (room.machineRange && !mappedMachine) return rejected(404, 'Machine not found in this room.');

    const payload = await fetchRoomStatus(room.providerId, AbortSignal.timeout(8_000));
    if (String(payload?.room?.id) !== room.providerId || !payload.machines) {
      return rejected(503, 'The provider could not verify this room.');
    }
    if (!Object.prototype.hasOwnProperty.call(payload.machines, machineId)) {
      return rejected(404, 'Machine not found in this room.');
    }
    if (!RUNNING.has(payload.machines[machineId]?.statusId)) {
      return rejected(409, 'This machine is no longer running. Refresh the room to check its current status.');
    }
    const machineName = mappedMachine
      ? `${mappedMachine.type} ${mappedMachine.number}`
      : (typeof name === 'string' && /^(Washer|Dryer) [0-9]{1,6}[A-Za-z]?$/.test(name) ? name : 'Your laundry machine');

    const id = crypto.randomUUID();
    const expiresAt = now + ALERT_LIFETIME;
    const inserted = this.sql.exec(`
      INSERT INTO alerts (id, dedupe_key, room_id, machine_id, machine_name, lead_minutes, subscription, expires_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM alerts) < ?
      ON CONFLICT(dedupe_key) DO NOTHING
      RETURNING id, expires_at AS expiresAt
    `, id, dedupe, roomId, machineId, machineName, leadMinutes, JSON.stringify(subscription),
    expiresAt, MAX_ALERTS_PER_ROOM).toArray()[0];
    const saved = inserted ?? this.sql.exec(
      'SELECT id, expires_at AS expiresAt FROM alerts WHERE dedupe_key = ?', dedupe
    ).toArray()[0];
    if (!saved) return rejected(429, 'This room has reached its active alert limit. Try again shortly.');
    await this.arm();
    return saved;
  }

  isPending(roomId, id) {
    return this.sql.exec('SELECT 1 FROM alerts WHERE room_id = ? AND id = ? AND expires_at > ?', roomId, id, Date.now())
      .toArray().length > 0;
  }

  cancel(roomId, id) {
    this.sql.exec('DELETE FROM alerts WHERE room_id = ? AND id = ?', roomId, id);
  }

  async arm() {
    const next = Date.now() + POLL_INTERVAL;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > next) await this.ctx.storage.setAlarm(next);
  }

  async alarm() {
    this.sql.exec('DELETE FROM alerts WHERE expires_at <= ?', Date.now());
    const alerts = this.sql.exec('SELECT * FROM alerts').toArray();
    if (!alerts.length) return;
    const providerId = findLaundryRoom(alerts[0].room_id).providerId;

    try {
      const payload = await fetchRoomStatus(providerId, AbortSignal.timeout(8_000));
      if (String(payload?.room?.id) !== providerId || !payload.machines) return;

      const due = alerts.map((alert) => {
        const data = payload.machines[alert.machine_id];
        const minutes = Math.ceil(data?.remainingSeconds / 60);
        let status;
        if (FINISHED.has(data?.statusId)) status = 'has finished';
        else if (data?.statusId === 'AVAILABLE') status = 'is now available';
        else if (alert.lead_minutes && RUNNING.has(data?.statusId) && minutes > 0 && minutes <= alert.lead_minutes) {
          status = `has about ${minutes} min left`;
        }
        return { alert, status };
      }).filter(({ status }) => status);

      // Bound concurrent outbound deliveries. Remaining alerts are picked up on the next poll.
      for (const { alert, status } of due.slice(0, 4)) {
        if (this.sql.exec('SELECT 1 FROM alerts WHERE id = ?', alert.id).toArray().length === 0) continue;
        const room = findLaundryRoom(alert.room_id);
        let terminal = false;
        try {
          terminal = await deliverPush(JSON.parse(alert.subscription), {
            title: `${alert.machine_name} ${status}`,
            body: roomLabel(room),
            path: roomPath(room),
            tag: alert.id,
          }, this.env);
        } catch {
          // A temporary push-provider failure can be retried on the next poll.
        }
        if (terminal || alert.attempts >= 2) this.sql.exec('DELETE FROM alerts WHERE id = ?', alert.id);
        else this.sql.exec('UPDATE alerts SET attempts = attempts + 1 WHERE id = ?', alert.id);
      }
    } catch {
      // Keep pending alerts while the upstream status feed is temporarily unavailable.
    } finally {
      if (this.sql.exec('SELECT 1 FROM alerts LIMIT 1').toArray().length) await this.arm();
    }
  }
}
