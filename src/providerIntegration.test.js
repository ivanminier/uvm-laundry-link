import {
  CHANNELS, isChannelEnabled, isChannelLive, validateContact, validateRepair,
  normalizePhone, isRecentDuplicate, rememberSubmission,
  submitRepairRequest, registerEmailNotification, registerSmsNotification,
} from './providerIntegration';

const room = { id: 'davis' };
const contact = { name: 'Pat Cat', email: 'pat@uvm.edu', phone: '(802) 555-0100' };

test('every provider channel ships disabled with no configured endpoint', () => {
  for (const channel of CHANNELS) {
    expect(isChannelEnabled(channel)).toBe(false);
    expect(isChannelLive(channel)).toBe(false);
  }
});

test('contact validation enforces required fields, formats and limits', () => {
  expect(validateContact({}, { require: ['name', 'email'] })).toEqual({
    name: 'Enter your name.', email: 'Enter your email address.',
  });
  expect(validateContact({ email: 'nope' }, { require: ['email'] })).toEqual({ email: 'Enter a valid email address.' });
  expect(validateContact({ phone: '12' }, { require: ['phone'] })).toEqual({ phone: 'Enter a valid mobile number.' });
  expect(validateContact({ name: 'A'.repeat(81) })).toEqual({ name: 'Keep your name under 80 characters.' });
  expect(validateContact(contact, { require: ['name', 'email', 'phone'] })).toEqual({});
});

test('normalizePhone keeps digits and an E.164 form', () => {
  expect(normalizePhone('(802) 555-0100')).toEqual({ digits: '8025550100', e164: '8025550100' });
  expect(normalizePhone('+1 802 555 0100')).toEqual({ digits: '18025550100', e164: '+18025550100' });
});

test('repair validation requires an issue and valid contact', () => {
  expect(validateRepair({ contact })).toEqual({ issue: 'Choose what’s wrong.' });
  expect(validateRepair({ issue: 'Leaking', details: 'x'.repeat(501), contact })).toEqual({
    details: 'Keep details under 500 characters.',
  });
  expect(validateRepair({ issue: 'Leaking', contact })).toEqual({});
});

test('a disabled channel validates and returns a mock result without any network call', async () => {
  const fetchImpl = jest.fn();
  const result = await submitRepairRequest({ issue: 'Leaking', machineId: '1', room, contact }, { fetchImpl });
  expect(result).toEqual({ ok: true, mock: true });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('invalid submissions are rejected before anything is sent', async () => {
  const fetchImpl = jest.fn();
  const result = await registerEmailNotification({ machineId: '1', room, contact: { email: 'bad' } }, { fetchImpl });
  expect(result).toEqual({ ok: false, reason: 'invalid', problems: { email: 'Enter a valid email address.' } });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('SMS registration ships disabled and never sends, even with valid consent-ready input', async () => {
  const fetchImpl = jest.fn();
  const result = await registerSmsNotification({ machineId: '1', room, contact }, { fetchImpl, now: 10 });
  expect(result).toEqual({ ok: true, mock: true });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('a repeated identical submission within the window is treated as a duplicate', async () => {
  const request = { issue: 'Leaking', machineId: '7', room, contact };
  const first = await submitRepairRequest(request, { now: 1_000 });
  expect(first).toEqual({ ok: true, mock: true });
  const again = await submitRepairRequest(request, { now: 2_000 });
  expect(again).toEqual({ ok: false, reason: 'duplicate' });
  const later = await submitRepairRequest(request, { now: 1_000 + 61_000 });
  expect(later).toEqual({ ok: true, mock: true });
});

test('the duplicate guard is keyed and time-bounded', () => {
  rememberSubmission('k', 0);
  expect(isRecentDuplicate('k', 10_000)).toBe(true);
  expect(isRecentDuplicate('k', 61_000)).toBe(false);
  expect(isRecentDuplicate('other', 10_000)).toBe(false);
});
