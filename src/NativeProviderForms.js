import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle, Wrench } from 'lucide-react';

import { TimingSelect } from './PushAlertForm';
import {
  LIMITS, validateContact, validateRepair,
  submitRepairRequest, registerEmailNotification, registerSmsNotification,
} from './providerIntegration';

// Optional contact details a student saved in Settings, read fresh each time a
// form opens so edits there carry over. Never required to use LaundryLink.
const CONTACT_KEYS = { name: 'uvmLaundryContactName', email: 'uvmLaundryContactEmail', phone: 'uvmLaundryContactPhone' };
export function getSavedContact() {
  const read = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? ''; } catch { return ''; }
  };
  return { name: read(CONTACT_KEYS.name), email: read(CONTACT_KEYS.email), phone: read(CONTACT_KEYS.phone) };
}

const REPAIR_ISSUES = [
  'Won’t start', 'Won’t stop or door is stuck', 'Leaking', 'Not draining or spinning',
  'Not heating (dryer)', 'Loud or vibrating', 'Payment or card reader', 'Display off or error code', 'Other',
];

function Field({ id, label, value, onChange, error, type = 'text', ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)}
        className="ll-input mt-1.5 h-12 w-full rounded-lg border px-3 text-sm" autoComplete="off"
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}

function StatusMessage({ tone, children }) {
  const Icon = tone === 'error' ? AlertTriangle : CheckCircle;
  const color = tone === 'error' ? 'text-red-700 dark:text-red-300' : 'text-uvm-green dark:text-uvm-gold';
  return (
    <p role="status" className={`mt-4 flex items-start gap-2 text-sm font-medium ${color}`}>
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" /> <span>{children}</span>
    </p>
  );
}

const primaryButton = 'min-h-[44px] w-full rounded-lg bg-uvm-green px-3 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50';
const secondaryButton = 'min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700';

// Native repair report. Rendered only when the repair channel is live, so a real
// user never reaches a mock submission.
export function NativeRepairForm({ room, machine, submit = submitRepairRequest }) {
  const [issue, setIssue] = useState('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState(() => {
    const saved = getSavedContact();
    return { name: saved.name, email: saved.email };
  });
  const [step, setStep] = useState('form'); // form | confirm
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error | duplicate
  const [errors, setErrors] = useState({});

  const request = { issue, details, machineId: machine.id, room, contact };
  const setField = (key, value) => setContact((previous) => ({ ...previous, [key]: value }));

  function review() {
    const problems = validateRepair(request);
    setErrors(problems);
    if (Object.keys(problems).length === 0) setStep('confirm');
  }

  async function send() {
    setStatus('submitting');
    const result = await submit(request);
    if (result.ok) setStatus('success');
    else if (result.reason === 'duplicate') setStatus('duplicate');
    else if (result.reason === 'invalid') { setErrors(result.problems); setStatus('idle'); setStep('form'); }
    else setStatus('error');
  }

  if (status === 'success') return (
    <div className="mt-4">
      <StatusMessage tone="success">Report sent for {machine.machineName}. Automatic Laundry handles the repair.</StatusMessage>
    </div>
  );

  if (step === 'confirm') return (
    <div className="mt-4 space-y-4">
      <div className="ll-report-steps">
        <p className="ll-report-steps__title">Review your report</p>
        <dl className="mt-2 space-y-1 text-sm">
          <div><dt className="inline font-semibold">Machine: </dt><dd className="inline">{roomMachineLabel(room, machine)}</dd></div>
          <div><dt className="inline font-semibold">Problem: </dt><dd className="inline">{issue}</dd></div>
          {details.trim() && <div><dt className="inline font-semibold">Details: </dt><dd className="inline break-words">{details.trim()}</dd></div>}
          <div><dt className="inline font-semibold">From: </dt><dd className="inline break-words">{contact.name} · {contact.email}</dd></div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryButton + ' sm:w-auto sm:px-5'} disabled={status === 'submitting'} onClick={send}>
          {status === 'submitting' ? 'Sending…' : 'Send report'}
        </button>
        <button type="button" className={secondaryButton} disabled={status === 'submitting'} onClick={() => { setStep('form'); setStatus('idle'); }}>
          Edit
        </button>
      </div>
      {status === 'duplicate' && <StatusMessage tone="error">You just sent this report. Give it a minute before sending again.</StatusMessage>}
      {status === 'error' && <StatusMessage tone="error">That didn’t go through. Try again, or use the official form below.</StatusMessage>}
    </div>
  );

  return (
    <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); review(); }}>
      <div>
        <label htmlFor="repair-issue" className="block text-sm font-medium">What’s wrong?</label>
        <select id="repair-issue" value={issue} onChange={(event) => setIssue(event.target.value)}
          className="ll-input mt-1.5 h-12 w-full rounded-lg border px-3 text-sm"
          aria-invalid={errors.issue ? true : undefined} aria-describedby={errors.issue ? 'repair-issue-error' : undefined}>
          <option value="" disabled>Choose a problem…</option>
          {REPAIR_ISSUES.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {errors.issue && <p id="repair-issue-error" className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.issue}</p>}
      </div>
      <div>
        <label htmlFor="repair-details" className="block text-sm font-medium">Details <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span></label>
        <textarea id="repair-details" value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={LIMITS.details}
          className="ll-input mt-1.5 w-full rounded-lg border px-3 py-2 text-sm"
          aria-invalid={errors.details ? true : undefined} aria-describedby={errors.details ? 'repair-details-error' : undefined} />
        {errors.details && <p id="repair-details-error" className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.details}</p>}
      </div>
      <Field id="repair-name" label="Your name" value={contact.name} onChange={(value) => setField('name', value)} error={errors.name} maxLength={LIMITS.name} />
      <Field id="repair-email" label="Your email" type="email" inputMode="email" value={contact.email} onChange={(value) => setField('email', value)} error={errors.email} maxLength={LIMITS.email} />
      <button type="submit" className={primaryButton}><Wrench size={16} aria-hidden="true" className="mr-1.5 inline" /> Review report</button>
    </form>
  );
}

const CONSENT = {
  email: 'Email me once when this machine’s cycle finishes. I can unsubscribe from the email.',
  sms: 'Text me once when this machine’s cycle finishes, to the number above. Message and data rates may apply; reply STOP to opt out.',
};

// Native email/SMS cycle notification. Rendered only when that channel is live.
export function NativeNotificationForm({ room, machine, channel, submit }) {
  const isSms = channel === 'sms';
  const saved = useMemo(getSavedContact, []);
  const [value, setValue] = useState(isSms ? saved.phone : saved.email);
  const [leadMinutes, setLeadMinutes] = useState(0);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | pending | error | duplicate
  const [fieldError, setFieldError] = useState('');
  const [consentError, setConsentError] = useState('');
  const field = isSms ? 'phone' : 'email';
  const register = submit ?? (isSms ? registerSmsNotification : registerEmailNotification);

  async function onSubmit(event) {
    event.preventDefault();
    const contact = { [field]: value };
    const problems = validateContact(contact, { require: [field] });
    setFieldError(problems[field] ?? '');
    setConsentError(consent ? '' : 'Check the box to confirm you want these alerts.');
    if (problems[field] || !consent) return;
    setStatus('submitting');
    const result = await register({ room, machine, machineId: machine.id, contact, leadMinutes });
    if (result.ok) setStatus('pending');
    else if (result.reason === 'duplicate') setStatus('duplicate');
    else if (result.reason === 'invalid') { setFieldError('Check the details and try again.'); setStatus('idle'); }
    else setStatus('error');
  }

  if (status === 'pending') return (
    <div className="mt-4">
      <StatusMessage tone="success">
        {isSms
          ? `Almost done — we sent a text to confirm. Reply to confirm, then you’ll get one text when ${machine.machineName} finishes. Reply STOP any time to cancel.`
          : `Almost done — we emailed a confirmation link. Confirm it, then you’ll get one email when ${machine.machineName} finishes. Each email has an unsubscribe link.`}
      </StatusMessage>
    </div>
  );

  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      <Field id={`notify-${channel}`} label={isSms ? 'Mobile number' : 'Email address'} type={isSms ? 'tel' : 'email'}
        inputMode={isSms ? 'tel' : 'email'} value={value} onChange={setValue}
        maxLength={isSms ? LIMITS.phone : LIMITS.email} error={fieldError} />
      <TimingSelect id={`notify-${channel}-timing`} label="When should we tell you?" value={leadMinutes} onChange={setLeadMinutes} />
      <div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={consentError ? true : undefined} aria-describedby={consentError ? `notify-${channel}-consent-error` : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-400 text-uvm-green focus:ring-uvm-gold" />
          <span>{CONSENT[channel]}</span>
        </label>
        {consentError && <p id={`notify-${channel}-consent-error`} role="alert" className="mt-1 text-xs text-red-700 dark:text-red-300">{consentError}</p>}
      </div>
      <button type="submit" className={primaryButton} disabled={status === 'submitting'}>
        <Bell size={16} aria-hidden="true" className="mr-1.5 inline" />
        {status === 'submitting' ? 'Setting alert…' : isSms ? 'Text me when it’s done' : 'Email me when it’s done'}
      </button>
      {status === 'duplicate' && <StatusMessage tone="error">You already requested this alert. Check your {isSms ? 'texts' : 'email'}.</StatusMessage>}
      {status === 'error' && <StatusMessage tone="error">That didn’t go through. Try again, or use the official form below.</StatusMessage>}
    </form>
  );
}

function roomMachineLabel(room, machine) {
  const roomName = [room.displayName ?? room.name, room.locationLabel].filter(Boolean).join(' · ');
  return `${roomName} · ${machine.machineName}`;
}
