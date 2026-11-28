# LaundryLink → Automatic Laundry: integration questionnaire

Thanks for authorizing native repair reporting and email/SMS cycle notifications
in UVM LaundryLink. To wire these to your existing systems we need the details
below. We will call your endpoints server-to-server from our Cloudflare Worker
(`alerts.uvmlaundry.com`), apply rate limiting and request idempotency on our
side, and keep each channel disabled until it is verified end to end. We would
rather use your existing systems than stand up any new messaging infrastructure.

## Common to all three channels
1. Base URL and environment(s) — is there a sandbox/test environment for
   coordinated testing, separate from production tickets/messages?
2. Authentication: method (API key, OAuth client credentials, signed request,
   IP allowlist?), where the credential goes (header name?), and how we obtain
   and rotate it.
3. Machine/room identifiers: given a room we hold your location id (e.g.
   `loc_fe37ab`) and the provider room id (e.g. `12254`), plus machine numbers
   (W14 / D20). Which identifiers do your endpoints expect, and how do we map a
   machine to the id your API wants?
4. Response format: success shape (status field, reference/ticket id), and the
   error shape + status codes we should distinguish. Is there a field we can
   treat as an explicit "accepted" acknowledgment?
5. Idempotency: can we send an idempotency key so a retried/uncertain request
   is not duplicated on your side? If so, header/field name and semantics.
6. Rate limits and payload size limits we should respect.
7. CORS vs server-to-server only (we will proxy via our Worker regardless).

## Repair reporting
8. Endpoint + method to create a service request.
9. Exact request body: issue type (is there a fixed list/enum we should present
   instead of free text?), free-text details field name + max length, and the
   reporter name/email field names. Which fields are required?
10. Does a submission return a ticket/reference id we can show the student?

## Email notifications
11. Endpoint + method to register a one-time "cycle finished" email for a
    specific machine.
12. Request body (room, machine, email, timing). Which timing options do you
    support — completion only, or also an early/"almost done" notice?
13. Email verification / double opt-in: do you send the confirmation step, or
    should we verify the address before registering?
14. Unsubscribe and cancellation: how does a student stop or cancel a pending
    email alert?

## SMS notifications
15. Endpoint + method to register a one-time "cycle finished" text for a
    specific machine.
16. Request body (room, machine, phone, timing, and any consent fields you need
    — e.g. a consent timestamp). Supported timing options?
17. Consent & compliance: we collect the student's explicit opt-in on our form.
    On your side, please confirm the messages are sent under your registered
    sender identity / 10DLC campaign, with STOP/HELP handling and consent records
    maintained by your system. What consent metadata should we pass through?
18. Verification: do you send an SMS confirmation (double opt-in) before the
    alert is active?
19. Opt-out / cancellation: how does a student stop a pending text alert?

## Testing
20. A test location/machine, test contact(s), and the agreed window for
    coordinated testing so we do not create real tickets or send real messages
    to uninvolved people.
