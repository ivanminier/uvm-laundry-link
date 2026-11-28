import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { NativeRepairForm, NativeNotificationForm } from './NativeProviderForms';
import { findLaundryRoom } from './laundryData';

const room = findLaundryRoom('davis');
const machine = { id: '2', number: '2', type: 'Washer', machineName: 'Washer 2' };

function mount(element) {
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  return { container, root, async render() { await act(async () => { root.render(element); }); }, cleanup() { act(() => root.unmount()); container.remove(); } };
}
const type = async (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const setSelect = async (select, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
});

beforeEach(() => { global.IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); });
afterEach(() => { localStorage.clear(); delete global.IS_REACT_ACT_ENVIRONMENT; });

test('repair form validates, confirms, and submits through the injected adapter', async () => {
  localStorage.setItem('uvmLaundryContactName', '"Pat Cat"');
  localStorage.setItem('uvmLaundryContactEmail', '"pat@uvm.edu"');
  const submit = jest.fn(async () => ({ ok: true, reference: 'R-1' }));
  const view = mount(<NativeRepairForm room={room} machine={machine} submit={submit} />);
  try {
    await view.render();
    expect(view.container.querySelector('#repair-name').value).toBe('Pat Cat');
    expect(view.container.querySelector('#repair-email').value).toBe('pat@uvm.edu');

    // Missing issue blocks review; nothing is submitted.
    await act(async () => { view.container.querySelector('form').requestSubmit(); });
    expect(view.container.querySelector('#repair-issue-error').textContent).toBe('Choose what’s wrong.');
    expect(submit).not.toHaveBeenCalled();

    await setSelect(view.container.querySelector('#repair-issue'), 'Leaking');
    await act(async () => { view.container.querySelector('form').requestSubmit(); });
    // Confirmation step before anything is sent.
    expect(view.container.textContent).toContain('Review your report');
    expect(submit).not.toHaveBeenCalled();

    await act(async () => { [...view.container.querySelectorAll('button')].find((b) => b.textContent === 'Send report').click(); });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({ issue: 'Leaking', machineId: '2', contact: { email: 'pat@uvm.edu' } });
    expect(view.container.textContent).toContain('Report sent for Washer 2');
  } finally { view.cleanup(); }
});

test('repair form surfaces a failure without auto-retrying', async () => {
  localStorage.setItem('uvmLaundryContactName', '"Pat"');
  localStorage.setItem('uvmLaundryContactEmail', '"pat@uvm.edu"');
  const submit = jest.fn(async () => ({ ok: false, reason: 'failed' }));
  const view = mount(<NativeRepairForm room={room} machine={machine} submit={submit} />);
  try {
    await view.render();
    await setSelect(view.container.querySelector('#repair-issue'), 'Leaking');
    await act(async () => { view.container.querySelector('form').requestSubmit(); });
    await act(async () => { [...view.container.querySelectorAll('button')].find((b) => b.textContent === 'Send report').click(); });
    expect(view.container.textContent).toContain('That didn’t go through');
    expect(submit).toHaveBeenCalledTimes(1); // no automatic resubmission
  } finally { view.cleanup(); }
});

test('SMS notification requires consent and a valid number before submitting', async () => {
  const submit = jest.fn(async () => ({ ok: true }));
  const view = mount(<NativeNotificationForm room={room} machine={machine} channel="sms" submit={submit} />);
  try {
    await view.render();
    const form = view.container.querySelector('form');
    const number = view.container.querySelector('#notify-sms');
    expect(view.container.textContent).toContain('reply STOP to opt out');

    await type(number, '802');
    await act(async () => { form.requestSubmit(); });
    expect(view.container.querySelector('#notify-sms-error').textContent).toBe('Enter a valid mobile number.');
    expect(submit).not.toHaveBeenCalled();

    await type(number, '8025550100');
    await act(async () => { form.requestSubmit(); });
    expect(view.container.querySelector('#notify-sms-consent-error').textContent).toContain('Check the box');
    expect(submit).not.toHaveBeenCalled();

    await act(async () => { view.container.querySelector('input[type="checkbox"]').click(); });
    await act(async () => { form.requestSubmit(); });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({ machineId: '2', contact: { phone: '8025550100' } });
    expect(view.container.textContent).toContain('we sent a text to confirm');
    expect(view.container.textContent).toContain('Reply STOP');
  } finally { view.cleanup(); }
});

test('email notification prefills from Settings and reports a duplicate', async () => {
  localStorage.setItem('uvmLaundryContactEmail', '"pat@uvm.edu"');
  const submit = jest.fn(async () => ({ ok: false, reason: 'duplicate' }));
  const view = mount(<NativeNotificationForm room={room} machine={machine} channel="email" submit={submit} />);
  try {
    await view.render();
    expect(view.container.querySelector('#notify-email').value).toBe('pat@uvm.edu');
    await act(async () => { view.container.querySelector('input[type="checkbox"]').click(); });
    await act(async () => { view.container.querySelector('form').requestSubmit(); });
    expect(view.container.textContent).toContain('already requested this alert');
  } finally { view.cleanup(); }
});

test('with all channels disabled, the dialog shows the embedded flow and no native form', async () => {
  const { MachineReport } = await import('./MachineReport');
  HTMLDialogElement.prototype.showModal = jest.fn();
  const view = mount(<MachineReport machine={machine} room={room} />);
  try {
    await view.render();
    await act(async () => { view.container.querySelector('[aria-label="Report Washer 2"]').click(); });
    // Embedded reporting steps are present; the native repair form is not.
    expect(view.container.textContent).toContain('How to report Washer 2');
    expect(view.container.querySelector('#repair-issue')).toBeNull();
    expect(view.container.querySelector('#repair-email')).toBeNull();
  } finally { view.cleanup(); }
});

test('notification forms hide timing by default and never pre-check consent from saved contact', async () => {
  localStorage.setItem('uvmLaundryContactEmail', '"pat@uvm.edu"');
  const view = mount(<NativeNotificationForm room={room} machine={machine} channel="email" submit={jest.fn(async () => ({ ok: true }))} />);
  try {
    await view.render();
    // Prefilled address, but consent is unchecked and no completion-timing dropdown is shown.
    expect(view.container.querySelector('#notify-email').value).toBe('pat@uvm.edu');
    expect(view.container.querySelector('input[type="checkbox"]').checked).toBe(false);
    expect(view.container.querySelector('#notify-email-timing')).toBeNull();
  } finally { view.cleanup(); }
});
