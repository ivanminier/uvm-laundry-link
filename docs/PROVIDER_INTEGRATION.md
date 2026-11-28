# Native provider integration — status and enablement

LaundryLink has native repair-report and email/SMS notification interfaces built
behind `src/providerIntegration.js`. **All three channels ship disabled with no
endpoint configured**, so no real user sees them and nothing is submitted to
Automatic Laundry. Each channel is enabled independently once its provider
requirements below are satisfied and verified.

## How a channel goes live

A channel is "live" only when BOTH are true in `src/providerIntegration.js`:

1. `CHANNEL_ENABLED[channel] = true`
2. `CHANNEL_ENDPOINT[channel] = '<authorized endpoint URL>'` (currently `null`)

`isChannelLive(channel)` gates the native UI. While it is false, the dialog shows
the existing embedded Automatic Laundry form, exactly as before. There are no
guessed or reverse-engineered endpoints in the code; an endpoint is added only
from Automatic Laundry's own documentation.

Submissions route through a new Cloudflare Worker route (not yet added) that
proxies to the authorized endpoint, applies server-side rate limiting and an
origin allowlist, and keeps contact details out of logs and analytics. The
client adapter already validates input, protects against duplicate submissions,
and never auto-retries an uncertain outcome.

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
