import { DurableObject } from 'cloudflare:workers';
import { fetchRoomStatus, filterRoomMachines, findLaundryRoom, roomLabel, machinePath, normalizeRoomStatus, canWatchNextMachine, isFreeMachine, isProviderStatusFree, NEXT_WASHER, NEXT_WASHER_LABEL, NEXT_DRYER, NEXT_DRYER_LABEL } from '../src/laundryData';
import { deliverPush, parseSubscription } from './push';
import ccrhMachines from './ccrh-machines.json';
import roomWashers from './room-washers.json';
import roomDryers from './room-dryers.json';

const LISTEN_ORIGIN = 'https://uvmlaundry.com';
const ORIGINS = new Set([LISTEN_ORIGIN, 'https://www.uvmlaundry.com']);
const REFERRERS = new Set(['chatgpt', 'perplexity', 'gemini', 'copilot', 'claude', 'google', 'bing', 'duckduckgo', 'other']);
const REFERRAL_PAGES = new Set(['tracker', 'hall', 'information', 'campus', 'complex', 'sitemap']);
const POLL_INTERVAL = 30_000;
const ALERT_LIFETIME = 4 * 60 * 60 * 1000;
const MAX_ALERTS_PER_ROOM = 60;
const RUNNING = new Set(['IN_USE', 'ALMOST_DONE', 'LUCKY_CYCLE']);
const FINISHED = new Set(['COMPLETE', 'END_OF_CYCLE', 'CYCLE_COMPLETE', 'CYCLE_FINISHED', 'CLOTHES_LEFT', 'EOC']);
const ROOM_WATCH_ALERTS = new Map([
  [NEXT_WASHER, { type: 'Washer', label: NEXT_WASHER_LABEL, metric: 'next_washer' }],
  [NEXT_DRYER, { type: 'Dryer', label: NEXT_DRYER_LABEL, metric: 'next_dryer' }],
]);

const providerReportTime = (machine) => Date.parse(machine?.receivedAt);

const validAlertId = (id) => typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id);

async function countMetric(db, metric, label) {
  if (!db) return;
  try {
    await db.prepare(`
      INSERT INTO daily_metrics(day, metric, label, events) VALUES (?, ?, ?, 1)
      ON CONFLICT(day, metric, label) DO UPDATE SET events = events + 1
    `).bind(new Date().toISOString().slice(0, 10), metric, label).run();
  } catch {
    console.warn('daily_metric_write_failed', { metric });
  }
}

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
  async fetch(request, env, ctx) {
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

    if (['/referrals', '/metrics'].includes(pathname) && request.method === 'POST') {
      if (!origin || !env.REFERRALS) return new Response(null, { status: 403, headers });
      if (request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') {
        return new Response(null, { status: 204, headers });
      }
      const limit = await env.REFERRAL_REQUESTS.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' });
      if (!limit.success) return new Response(null, { status: 429, headers });
      const chunks = [];
      let size = 0;
      for await (const chunk of request.body ?? []) {
        size += chunk.byteLength;
        if (size > 96) return new Response(null, { status: 400, headers });
        chunks.push(new TextDecoder().decode(chunk));
      }
      const params = new URLSearchParams(chunks.join(''));
      if (pathname === '/metrics') {
        const metric = params.get('metric');
        const label = params.get('label');
        const room = label && findLaundryRoom(label);
        const valid = metric === 'page_view' && /^(tracker|directory|guide|faq|information|status|about|compare|campus|complex|sitemap|hall:[a-z0-9-]{1,75})$/.test(label)
          || metric === 'room_view' && room?.id === label;
        if (!valid) return new Response(null, { status: 400, headers });
        ctx.waitUntil(countMetric(env.REFERRALS, metric, label));
        return new Response(null, { status: 204, headers });
      }
      const category = params.get('category');
      const page = params.get('page');
      if (!REFERRERS.has(category) || !REFERRAL_PAGES.has(page)) {
        return new Response(null, { status: 400, headers });
      }
      const day = new Date().toISOString().slice(0, 10);
      await env.REFERRALS.prepare(`
        INSERT INTO referral_counts (day, source, page, landings)
        VALUES (?, ?, ?, 1)
        ON CONFLICT (day, source, page) DO UPDATE SET landings = landings + 1
      `).bind(day, category, page).run();
      return new Response(null, { status: 204, headers });
    }

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
    if (pathname === '/alerts/status' && Array.isArray(data?.alerts)) {
      if (data.alerts.length > 20) return reply({ error: 'Too many alerts to check together.' }, 400);
      const statuses = await Promise.all(data.alerts.map(async (entry) => {
        const room = typeof entry?.roomId === 'string' && findLaundryRoom(entry.roomId);
        if (!room?.providerId || room.id !== entry.roomId || !validAlertId(entry.id)) return null;
        try {
          return await env.ROOM_ALERTS.getByName(room.providerId).status(room.id, entry.id);
        } catch {
          return null;
        }
      }));
      return reply({ statuses });
    }
    if (typeof data?.roomId !== 'string' || data.roomId.length > 80) return reply({ error: 'Room not found.' }, 404);
    const room = findLaundryRoom(data.roomId);
    if (!room?.providerId || room.id !== data.roomId) return reply({ error: 'Room not found.' }, 404);
    const roomAlerts = env.ROOM_ALERTS.getByName(room.providerId);

    if (pathname !== '/alerts') {
      if (!validAlertId(data.id)) return reply({ error: 'Invalid alert.' }, 400);
      if (pathname === '/alerts/status') return reply(await roomAlerts.status(room.id, data.id));
      await roomAlerts.cancel(room.id, data.id);
      return reply({ cancelled: true });
    }
    const subscription = parseSubscription(data.subscription);
    const watchAlert = ROOM_WATCH_ALERTS.get(data.machineId);
    const machineIds = data.machineIds ?? (data.machineId === NEXT_WASHER ? data.washerIds : null);
    if (watchAlert) {
      if (!subscription || !Array.isArray(machineIds) ||
          machineIds.length < 1 || machineIds.length > 128 ||
          new Set(machineIds).size !== machineIds.length ||
          machineIds.some((id) => typeof id !== 'string' || !/^\d{1,15}$/.test(id))) {
        return reply({ error: 'Invalid machine list or browser subscription.' }, 400);
      }
    } else if (!subscription || typeof data.machineId !== 'string' || !/^\d{1,15}$/.test(data.machineId) ||
        ![0, 5].includes(data.leadMinutes)) {
      return reply({ error: 'Invalid machine or browser subscription.' }, 400);
    }

    try {
      const result = await roomAlerts.register(room.id, data.machineId, data.machineName,
        watchAlert ? 0 : data.leadMinutes, subscription, watchAlert ? machineIds : null,
        request.headers.get('Sec-GPC') !== '1' && request.headers.get('DNT') !== '1');
      return reply(result, result.status ?? 200);
    } catch (failure) {
      console.warn('alert_registration_failed', { roomId: room.id, reason: String(failure.message).slice(0, 150) });
      return reply({ error: 'Could not check live availability. Try again shortly.' }, 503);
    }
  },
};

// Room alerts use bundled, verified machine catalogs instead of fetching the provider's machine directory.
function verifiedMachines(room, type) {
  const catalog = type === 'Dryer' ? roomDryers : roomWashers;
  return (catalog[room.id] ?? []).map(([id, number]) => ({ id, number, type, machineName: `${type} ${number}` }));
}

export class RoomAlerts extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY, dedupe_key TEXT NOT NULL UNIQUE, room_id TEXT NOT NULL,
        machine_id TEXT NOT NULL, machine_name TEXT NOT NULL, lead_minutes INTEGER NOT NULL,
        subscription TEXT NOT NULL, watch_machines TEXT,
        expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
      )
    `);
    if (!this.sql.exec('PRAGMA table_info(alerts)').toArray().some(({ name }) => name === 'watch_machines')) {
      this.sql.exec('ALTER TABLE alerts ADD COLUMN watch_machines TEXT');
    }
  }

  async register(roomId, machineId, name, leadMinutes, subscription, machineIds, countSubscription) {
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

    const watchAlert = ROOM_WATCH_ALERTS.get(machineId);
    const mappedMachine = !watchAlert && room.machineRange && filterRoomMachines(room, ccrhMachines).find(({ id }) => id === machineId);
    if (!watchAlert && room.machineRange && !mappedMachine) return rejected(404, 'Machine not found in this room.');

    const catalog = watchAlert ? verifiedMachines(room, watchAlert.type) : null;
    const payload = await fetchRoomStatus(room.providerId, AbortSignal.timeout(8_000));
    if (String(payload?.room?.id) !== room.providerId || !payload.machines) {
      return rejected(503, 'The provider could not verify this room.');
    }
    let machineName = watchAlert?.label ?? '';
    let watchMachines = null;
    if (watchAlert) {
      const ids = new Set(machineIds);
      if (!catalog.length || ids.size !== catalog.length || !catalog.every(({ id }) => ids.has(id))) {
        return rejected(503, `The ${watchAlert.type.toLowerCase()} list changed. This room alert is temporarily unavailable.`);
      }
      const statuses = normalizeRoomStatus(payload, room.providerId, catalog);
      if (!canWatchNextMachine(statuses, watchAlert.type)) {
        return rejected(409, statuses.some(isFreeMachine)
          ? `A ${watchAlert.type.toLowerCase()} is free now. Refresh the room to see which one.`
          : `Could not confirm that all ${watchAlert.type.toLowerCase()}s are unavailable. Try again shortly.`);
      }
      watchMachines = catalog.map(({ id, machineName }) => ({
        id, machineName, initialReportTime: providerReportTime(payload.machines[id]),
      }));
    } else {
      if (!Object.prototype.hasOwnProperty.call(payload.machines, machineId)) {
        return rejected(404, 'Machine not found in this room.');
      }
      if (!RUNNING.has(payload.machines[machineId]?.statusId)) {
        return rejected(409, 'This machine is no longer running. Refresh the room to check its current status.');
      }
      machineName = mappedMachine
        ? `${mappedMachine.type} ${mappedMachine.number}`
        : (typeof name === 'string' && /^(Washer|Dryer) [0-9]{1,6}[A-Za-z]?$/.test(name) ? name : 'Your laundry machine');
    }

    const id = crypto.randomUUID();
    const expiresAt = now + ALERT_LIFETIME;
    const inserted = this.sql.exec(`
      INSERT INTO alerts (id, dedupe_key, room_id, machine_id, machine_name, lead_minutes, subscription, watch_machines, expires_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM alerts) < ?
      ON CONFLICT(dedupe_key) DO NOTHING
      RETURNING id, expires_at AS expiresAt
    `, id, dedupe, roomId, machineId, machineName, leadMinutes, JSON.stringify(subscription),
    watchMachines ? JSON.stringify(watchMachines) : null, expiresAt, MAX_ALERTS_PER_ROOM).toArray()[0];
    const saved = inserted ?? this.sql.exec(
      'SELECT id, expires_at AS expiresAt FROM alerts WHERE dedupe_key = ?', dedupe
    ).toArray()[0];
    if (inserted && countSubscription) this.ctx.waitUntil(countMetric(this.env.REFERRALS, 'subscription', watchAlert?.metric ?? 'cycle'));
    if (!saved) return rejected(429, 'This room has reached its active alert limit. Try again shortly.');
    await this.arm();
    return saved;
  }

  status(roomId, id) {
    const alert = this.sql.exec(
      'SELECT machine_name AS machineName FROM alerts WHERE room_id = ? AND id = ? AND expires_at > ?',
      roomId, id, Date.now()
    ).toArray()[0];
    return alert ? { active: true, machineName: alert.machineName } : { active: false };
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

      const due = alerts.flatMap((alert) => {
        const watchAlert = ROOM_WATCH_ALERTS.get(alert.machine_id);
        if (watchAlert) {
          const room = findLaundryRoom(alert.room_id);
          const watchedMachines = alert.watch_machines
            ? JSON.parse(alert.watch_machines)
            : watchAlert.type === 'Washer' ? verifiedMachines(room, 'Washer') : [];
          const open = watchedMachines.find(({ id, initialReportTime }) => {
            const machine = payload.machines[id];
            if (!isProviderStatusFree(machine?.statusId)) return false;
            // Older alerts and feeds without a timestamp can still use the reported status.
            const reportTime = providerReportTime(machine);
            return !Number.isFinite(initialReportTime) || !Number.isFinite(reportTime) || reportTime > initialReportTime;
          });
          return open ? [{ alert, title: `${open.machineName} is reported free`, machineId: open.id }] : [];
        }

        const data = payload.machines[alert.machine_id];
        const minutes = Math.ceil(data?.remainingSeconds / 60);
        const name = alert.machine_name;
        let title;
        if (FINISHED.has(data?.statusId)) title = `${name} is done`;
        else if (data?.statusId === 'AVAILABLE') title = `${name} is free`;
        else if (alert.lead_minutes && RUNNING.has(data?.statusId) && minutes > 0 && minutes <= alert.lead_minutes) {
          title = `${name} · About ${minutes} min left`;
        }
        return title ? [{ alert, title, machineId: alert.machine_id }] : [];
      });

      // Bound concurrent outbound deliveries. Remaining alerts are picked up on the next poll.
      for (const { alert, title, machineId } of due.slice(0, 4)) {
        if (this.sql.exec('SELECT 1 FROM alerts WHERE id = ?', alert.id).toArray().length === 0) continue;
        const room = findLaundryRoom(alert.room_id);
        let outcome = 'retry';
        try {
          outcome = await deliverPush(JSON.parse(alert.subscription), {
            title,
            body: roomLabel(room),
            path: machinePath(room, machineId),
            tag: alert.id,
          }, this.env);
        } catch {
          // A temporary push-provider failure can be retried on the next poll.
        }
        if (outcome !== 'retry' || alert.attempts >= 2) {
          this.sql.exec('DELETE FROM alerts WHERE id = ?', alert.id);
          this.ctx.waitUntil(countMetric(this.env.REFERRALS, 'push_result', outcome === 'accepted' ? 'provider_accepted' : 'stopped_without_acceptance'));
        }
        else this.sql.exec('UPDATE alerts SET attempts = attempts + 1 WHERE id = ?', alert.id);
      }
    } catch {
      // Keep pending alerts while the upstream status feed is temporarily unavailable.
    } finally {
      if (this.sql.exec('SELECT 1 FROM alerts LIMIT 1').toArray().length) await this.arm();
    }
  }
}
