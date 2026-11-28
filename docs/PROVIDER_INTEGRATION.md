# Native provider integration — status and enablement

LaundryLink has native repair-report and email/SMS notification interfaces built
behind `src/providerIntegration.js`. **All three channels ship disabled with no
endpoint configured**, so no real user sees them and nothing is submitted to
Automatic Laundry. Each channel is enabled independently once its provider
requirements below are satisfied and verified.

## Authorization status

Automatic Laundry has given written authorization for native integration of all
three channels — repair reporting, email notifications, and SMS notifications —
and for controlled, coordinated integration testing. Their technical team is to
provide the request specifications, authentication requirements, machine
identifiers, response formats, and notification-handling procedures. The concise
questionnaire for their engineers is in `docs/PROVIDER_QUESTIONNAIRE.md`.

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
