// Boundary between LaundryLink's native repair/notification forms and Automatic
// Laundry's provider integration.
//
// Safety model: production submission for each channel is disabled, and no
// provider endpoint is present in the code. A channel can only reach the
// provider once BOTH an authorized, documented endpoint is configured here and
// its flag is turned on. Until then every call validates input and returns a
// mock result without making any network request. This keeps the native UI,
// validation, consent and tests fully exercisable with zero live submissions.

export const CHANNELS = ['repair', 'email', 'sms'];

// Turned on only alongside a documented, consent-preserving provider mechanism.
const CHANNEL_ENABLED = { repair: false, email: false, sms: false };

// Intentionally null. Filled in only when Automatic Laundry documents a
// supported endpoint for that channel. No guessed or reverse-engineered URLs.
const CHANNEL_ENDPOINT = { repair: null, email: null, sms: null };

// Set true only after the channel's server-side integration has been built and
// verified end to end against the real provider endpoint. A flag plus an
// endpoint string is deliberately NOT enough to go live.
const CHANNEL_VERIFIED = { repair: false, email: false, sms: false };

// Notification timing options a channel actually supports, as leadMinutes before
// the cycle ends. Defaults to completion-only; other options are added per
// channel only once the provider confirms support. Repair has no timing.
const CHANNEL_TIMING = { repair: [], email: [0], sms: [0] };

export function isChannelEnabled(channel) {
  return CHANNEL_ENABLED[channel] === true;
}

// Live requires all three: the flag on, a configured endpoint, AND a verified
// server-side integration. This is the client gate; the Worker proxy enforces
// the server side at request time.
export function isChannelLive(channel) {
  return isChannelEnabled(channel) && typeof CHANNEL_ENDPOINT[channel] === 'string' && CHANNEL_VERIFIED[channel] === true;
}

export function supportedTiming(channel) {
  return CHANNEL_TIMING[channel] ?? [];
}

export const LIMITS = { name: 80, email: 254, phone: 20, details: 500 };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(value) {
  const trimmed = String(value ?? '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  const e164 = trimmed.startsWith('+') ? `+${digits}` : digits;
  return { digits, e164 };
}

export function validateContact({ name, email, phone } = {}, { require: required = [] } = {}) {
  const problems = {};
  const has = (value) => String(value ?? '').trim().length > 0;

  if (required.includes('name') && !has(name)) problems.name = 'Enter your name.';
  else if (has(name) && String(name).trim().length > LIMITS.name) problems.name = `Keep your name under ${LIMITS.name} characters.`;

  if (required.includes('email') && !has(email)) problems.email = 'Enter your email address.';
  else if (has(email) && (String(email).trim().length > LIMITS.email || !EMAIL_PATTERN.test(String(email).trim()))) {
    problems.email = 'Enter a valid email address.';
  }

  if (required.includes('phone') && !has(phone)) problems.phone = 'Enter your mobile number.';
  else if (has(phone)) {
    const { digits } = normalizePhone(phone);
    if (digits.length < 10 || digits.length > 15) problems.phone = 'Enter a valid mobile number.';
  }

  return problems;
}

export function validateRepair({ issue, details, contact } = {}) {
  const problems = {};
  if (!issue) problems.issue = 'Choose what’s wrong.';
  if (details != null && String(details).length > LIMITS.details) problems.details = `Keep details under ${LIMITS.details} characters.`;
  Object.assign(problems, validateContact(contact, { require: ['name', 'email'] }));
  return problems;
}

// Short-lived, in-memory guard so a double-tap or an impatient re-submit of the
// same request is ignored. Not a security control; the server-side rate limit is
// added with the authorized endpoint.
const recentSubmissions = new Map();
const DUPLICATE_WINDOW_MS = 60_000;

export function isRecentDuplicate(key, now = Date.now()) {
  const at = recentSubmissions.get(key);
  return typeof at === 'number' && now - at < DUPLICATE_WINDOW_MS;
}

export function rememberSubmission(key, now = Date.now()) {
  recentSubmissions.set(key, now);
  for (const [existing, at] of recentSubmissions) {
    if (now - at >= DUPLICATE_WINDOW_MS) recentSubmissions.delete(existing);
  }
}

// A submit returns one of:
//   { ok: true, mock: true }      — validated, nothing sent (channel not live)
//   { ok: true, reference }       — accepted by the provider (only when live)
//   { ok: false, problems }       — input rejected before any send
//   { ok: false, reason }         — 'duplicate' | 'not_configured' | 'failed'
// It never auto-resubmits on an uncertain outcome.
async function submit(channel, { validate, payload, dedupeKey }, deps = {}) {
  const { now = Date.now() } = deps;
  const problems = validate();
  if (Object.keys(problems).length > 0) return { ok: false, reason: 'invalid', problems };

  if (dedupeKey && isRecentDuplicate(dedupeKey, now)) return { ok: false, reason: 'duplicate' };

  if (!isChannelLive(channel)) {
    // No authorized endpoint and/or channel disabled: validate only, send nothing.
    if (dedupeKey) rememberSubmission(dedupeKey, now);
    return { ok: true, mock: true };
  }

  // Reached only when an authorized endpoint has been configured for this
  // channel. A documented request/response contract replaces this block.
  const { fetchImpl = fetch } = deps;
  try {
    const response = await fetchImpl(CHANNEL_ENDPOINT[channel], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return { ok: false, reason: 'failed', status: response.status };
    const body = await response.json().catch(() => ({}));
    // Success is only ever claimed when the provider explicitly acknowledges the
    // request. A bare 200 (e.g. from a stub or misconfigured endpoint) is treated
    // as a failure, so a confirmation is never shown without a real registration.
    if (body.accepted !== true) return { ok: false, reason: 'failed' };
    if (dedupeKey) rememberSubmission(dedupeKey, now);
    return { ok: true, reference: body.reference ?? null };
  } catch {
    // Uncertain outcome: report it, never retry automatically.
    return { ok: false, reason: 'failed' };
  }
}

export function submitRepairRequest(request, deps = {}) {
  return submit('repair', {
    validate: () => validateRepair(request),
    payload: request,
    dedupeKey: `repair:${request?.room?.id}:${request?.machineId}:${request?.contact?.email}`,
  }, deps);
}

export function registerEmailNotification(request, deps = {}) {
  return submit('email', {
    // A machine-specific cycle notice only — no free-form message content.
    validate: () => validateContact(request?.contact, { require: ['email'] }),
    payload: { roomId: request?.room?.id, machineId: request?.machineId, email: request?.contact?.email },
    dedupeKey: `email:${request?.room?.id}:${request?.machineId}:${request?.contact?.email}`,
  }, deps);
}

export function registerSmsNotification(request, deps = {}) {
  return submit('sms', {
    validate: () => validateContact(request?.contact, { require: ['phone'] }),
    payload: { roomId: request?.room?.id, machineId: request?.machineId, phone: normalizePhone(request?.contact?.phone).e164 },
    dedupeKey: `sms:${request?.room?.id}:${request?.machineId}:${normalizePhone(request?.contact?.phone).digits}`,
  }, deps);
}
