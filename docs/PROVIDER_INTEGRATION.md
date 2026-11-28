# Native provider integration — status and enablement

LaundryLink has native repair-report and email/SMS notification interfaces built
behind `src/providerIntegration.js`. **All three channels ship disabled with no
endpoint configured**, so no real user sees them and nothing is submitted to
Automatic Laundry. Each channel is enabled independently once its provider
requirements below are satisfied and verified.

## Authorization status

Automatic Laundry has given written authorization for native integration of all
three channels — repair reporting, email notifications, and SMS notifications —
plus moving machine-status reads behind the Worker, and for controlled,
coordinated sandbox testing. Their technical team has sent a full specification
(summarized below). The architecture is diagrammed in `docs/architecture.svg`.

### Specification received — still outstanding before any sandbox call
The spec contains placeholders that must arrive (out-of-band, as Worker secrets)
before anything can be wired or tested. **Nothing is enabled until these land and
each channel is verified end to end.**
- Sandbox + production base URLs (`[STAGING_API_HOST]` / `[PROD_API_HOST]`).
- `STAGING_WORKER_TOKEN` / `PROD_WORKER_TOKEN` (Bearer), and the secure handoff
  method + expiry.
- Test room id and the two test machine ids.
- SMS sender number/short code for START/STOP/HELP.
- Approved email consent + verification disclosures (SMS disclosure text is
  provided verbatim; email is pending).
- Approved troubleshooting guidance text for the Speed Queen error codes.
- Auth/ownership model for subscription verify and cancel.
- Retention terms for the operational records needed to enforce dedupe and caps.
- Optional consolidated status endpoint, if provided.

## Received API contract (implementation target)

All writes and status reads originate only from the Worker
(`alerts.uvmlaundry.com`); tokens live as Worker secrets, never in the frontend
or git. Required headers on every Worker→provider request: `Authorization:
Bearer <token>`, `X-Organization-Id: 4052`, `X-Client-Source: uvm-laundry-link`,
`User-Agent: UVM-LaundryLink-Worker/1.0 (+https://uvmlaundry.com/status/)`,
`Idempotency-Key: <UUIDv4>` on POSTs, `Content-Type: application/json`.

- **Status/directory/peak-times (reads):** Worker read-proxy with Cache API —
  room status 30s shared per room (stale-while-revalidate 60s), directory
  12–24h with an admin purge route, peak-times daily via staggered GitHub
  Actions. Hide machines whose visibility flag is false/unset; treat
  Offline/Unknown/>5-min-old as unavailable; keep the stale-snapshot banner and
  LaundryConnect fallback. D1/git keep aggregate room percentages only.
- **Repair:** `POST /repairs` → `201 {status:"accepted", ticketId, duplicate}`.
  Body includes organizationId, roomId, machineId (upstream UUID), machineNumber,
  machineType, issueCategory, optional errorCode, description (10–500), reporter
  {name,email,phone?}, submittedAt. 2-hour dedupe per machineId+issueCategory;
  reuse the same Idempotency-Key on timeout retries; open ticket → 200/409.
- **Notifications:** `POST /notifications/subscriptions` → `201/202
  {subscriptionId, status:"ACTIVE|PENDING_VERIFICATION", expiresAt}`. Body: channel
  EMAIL|SMS, destination, timing CYCLE_COMPLETE|FIVE_MIN_REMAINING|
  MACHINE_AVAILABLE, consent {accepted, disclosureVersion, acceptedAt, scope}.
  Verify: `POST /notifications/subscriptions/{id}/verify {code}`. Cancel: `DELETE
  …/{id}` → 204. No custom message bodies. Verbatim SMS consent disclosure +
  unchecked box. 4-hour auto-expiry. Caps: 1 active per machine per destination,
  6 registrations/24h per destination.
- **Rate limits:** repair 75/day (3/hr), email/SMS 1000/day (10/hr, 6/hr).
- **Errors:** 400 field error (no retry); 401/403 no retry (403
  RECIPIENT_OPTED_OUT → show START-to-reenable); 409 duplicate → show existing
  confirmation; 429 → honor Retry-After + fallback link; 5xx/timeout → no
  auto-retry except with the same Idempotency-Key, honest "couldn't confirm" +
  fallback.
- **Security:** never log reporter/destination PII (only requestId, machineId,
  status, latency); per-channel kill switches `ENABLE_REPAIR_API` /
  `ENABLE_EMAIL_API` / `ENABLE_SMS_API`; 90-day secret rotation; retain "Powered
  by Automatic Laundry" + portal fallback.

## Implementation checklist (when credentials arrive)
1. Store base URL + token as Worker secrets; add `ENABLE_*_API` env flags (off).
2. Worker write routes `/repairs`, `/notifications/subscriptions`, verify,
   cancel — headers, Idempotency-Key, dedupe store, caps, rate limits, error
   mapping, PII-redacted logs.
3. Worker read-proxy + Cache API TTLs; switch the frontend status path behind a
   flag defaulting to today's direct fetch, verify, then cut over per rollout.
4. Point the client adapter at the Worker routes; map the documented responses
   (`accepted`/`ticketId`, `subscriptionId`/`status`); add the OTP verify step,
   cancel, and 403/409/429 handling.
5. Repair form: emergency-call banner, issueCategory + machineType, errorCode +
   troubleshooting deflection (approved text), description 10–500.
6. Notification forms: the three provider timing values, verbatim SMS
   disclosure + consent object, PENDING_VERIFICATION → OTP, cancel, opt-out copy
   with the real sender/short code.
7. Update Privacy Policy ("what we send/retain") and Terms; set `CHANNEL_VERIFIED`
   per channel only after the sandbox walkthrough; enable one channel at a time.

The concise questionnaire for their engineers is in
`docs/PROVIDER_QUESTIONNAIRE.md`.

Authorization removes the permission question. It does **not** remove the
requirement for recipient consent (collected in the form), carrier/sender
obligations for SMS (provider-side), or end-to-end verification before enabling.
Automatic Laundry's existing authorized systems are the intended backend; no new
third-party messaging service or duplicate infrastructure will be introduced if
those systems can support these functions.

## How a channel goes live

A channel is "live" (`isChannelLive`) only when ALL THREE are set in
`src/providerIntegration.js` — a flag plus an endpoint string is deliberately
not enough:

1. `CHANNEL_ENABLED[channel] = true`
2. `CHANNEL_ENDPOINT[channel] = '<authorized endpoint URL>'` (currently `null`)
3. `CHANNEL_VERIFIED[channel] = true` — set only after the server-side
   integration has been built and verified end to end against the real endpoint.

While `isChannelLive` is false the dialog shows the existing embedded Automatic
Laundry form, exactly as before. There are no guessed or reverse-engineered
endpoints in the code; an endpoint is added only from Automatic Laundry's
documentation.

Additional runtime safeguards already in the adapter:

- **Success requires explicit acknowledgment.** A live submission is only
  reported as successful when the provider response contains `accepted: true`. A
  bare 200 from a stub or misconfigured endpoint is treated as a failure, so a
  confirmation is never shown without a real registration.
- **Timing is provider-gated.** `CHANNEL_TIMING` lists the notification timing
  options a channel actually supports (currently completion-only). The form only
  offers what is listed, so it never advertises unsupported timing.
- **No automatic resubmission.** An uncertain outcome returns a failure the user
  can retry manually; the client never auto-retries.
- **Consent is never inferred.** The consent checkbox starts unchecked every
  time and is required on each submission; saved contact details only prefill the
  address/number field.

Submissions route through a new Cloudflare Worker route (not yet added) that
proxies to the authorized endpoint, applies server-side rate limiting, an origin
allowlist, and request idempotency, and keeps contact details out of logs and
analytics.

## Outstanding provider requirements

### Repair reporting
- Authorized endpoint URL + HTTP method.
- Authentication model (token/header, or server-to-server only).
- Request body schema: how a room and a machine are identified (their location
  id vs. our `providerId`, and machine id/number), the accepted issue values,
  and the reporter name/email field names.
- Success response shape (ticket/reference id) and error response shapes.
- Confirmation that our Worker origin may call it (we proxy either way).

### Email notifications
- Authorized endpoint + auth + request schema (room, machine, email, timing).
- Who performs email verification: does the provider send the confirmation/
  double opt-in, or must LaundryLink verify before calling?
- Unsubscribe mechanism and how a registration is cancelled.
- Duplicate/idempotency handling and response/error shapes.

### SMS notifications
- Authorized endpoint + auth + request schema (room, machine, phone, timing,
  consent timestamp).
- Written confirmation that the path carries, on the provider side: recipient
  double opt-in, a registered sender identity / 10DLC campaign, STOP/HELP
  handling, and storage of the consent record. (A blanket "we consent for
  carriers and users" does not satisfy this; the concrete mechanism does.)
- If LaundryLink collects the opt-in on its own page, the agreed division of who
  holds the consent record and under whose sender identity messages are sent.

## Before enabling any channel in production
- Add the authorized endpoint + Worker proxy route with validation and rate
  limiting, and turn on the channel flag.
- Update the Privacy Policy to state exactly what is transmitted and retained,
  and update the Terms of Use. (The Privacy Policy already covers the locally
  saved contact details.)
- Verify end to end against the real endpoint, then enable.
