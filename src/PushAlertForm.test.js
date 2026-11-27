import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { PushAlertForm } from './PushAlertForm';
import { findLaundryRoom } from './laundryData';

test('push timing uses the LaundryLink listbox and keeps the native select out of the alert form', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.PushManager = function PushManager() {};
  window.Notification = { permission: 'default' };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => undefined } });
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ publicKey: 'BA' + 'A'.repeat(85) }) }));
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<PushAlertForm machine={{ id: '5', machineName: 'Dryer 5' }} room={findLaundryRoom('jeanne_mance')} canSetAlert />);
    });
    expect(container.querySelector('select')).toBeNull();
    const trigger = container.querySelector('#alert-timing');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-labelledby')).toBe('alert-timing-label alert-timing');
    expect(trigger.textContent).toBe('When the cycle ends');

    await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
    const list = container.querySelector('#alert-timing-options');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect([...list.querySelectorAll('[role="option"]')].map((option) => option.textContent))
      .toEqual(['When the cycle ends', 'About 5 minutes early']);
    expect(document.activeElement.textContent).toBe('When the cycle ends');

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => { document.activeElement.dispatchEvent(escape); });
    expect(escape.defaultPrevented).toBe(true);
    expect(container.querySelector('#alert-timing-options')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await act(async () => { trigger.click(); });
    await act(async () => { document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    expect(document.activeElement.textContent).toBe('About 5 minutes early');
    await act(async () => { document.activeElement.click(); });
    expect(trigger.textContent).toBe('About 5 minutes early');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  } finally {
    act(() => root.unmount());
    container.remove();
    delete window.PushManager;
    delete window.Notification;
    delete navigator.serviceWorker;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
