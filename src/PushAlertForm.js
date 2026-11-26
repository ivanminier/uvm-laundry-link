import React, { useEffect, useState } from 'react';

const ALERTS_API = 'https://alerts.uvmlaundry.com';
const recordKey = (room, machine) => `uvmLaundryPushAlert-${room.id}-${machine.id}`;

function getSavedAlert(key) {
  try {
    const alert = JSON.parse(localStorage.getItem(key));
    return alert?.expiresAt > Date.now() ? alert : null;
  } catch {
    return null;
  }
}

export function hasPushAlert(room, machine) {
  return !!getSavedAlert(recordKey(room, machine));
}

function saveAlert(key, alert) {
  try {
    if (alert) localStorage.setItem(key, JSON.stringify(alert));
    else localStorage.removeItem(key);
  } catch {
    // The alert can still be managed until the dialog closes.
  }
}

function decodeApplicationKey(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(88, '=');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function alertsRequest(path, data, signal) {
  const controller = signal ? null : new AbortController();
  const timeout = controller && setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${ALERTS_API}${path}`, {
      ...(data && {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
      signal: signal ?? controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? 'The alert service is temporarily unavailable.');
    }
    return await response.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function PushAlertForm({ machine, room, canSetAlert }) {
  const key = recordKey(room, machine);
  const [saved, setSaved] = useState(() => getSavedAlert(key));
  const [leadMinutes, setLeadMinutes] = useState(0);
  const [publicKey, setPublicKey] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [deviceSubscription, setDeviceSubscription] = useState(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!supported) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let active = true;
    Promise.all([
      alertsRequest('/config', null, controller.signal),
      navigator.serviceWorker.getRegistration('/'),
    ]).then(async ([{ publicKey }, registration]) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (active) {
        setPublicKey(publicKey && decodeApplicationKey(publicKey));
        setRegistration(registration);
        setDeviceSubscription(subscription ?? null);
        setServiceUnavailable(!publicKey);
      }
    }).catch(() => {
      if (active) setServiceUnavailable(true);
    }).finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [supported]);

  useEffect(() => {
    if (!saved?.id || !publicKey) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    alertsRequest('/alerts/status', { roomId: room.id, id: saved.id }, controller.signal)
      .then(({ active }) => {
        if (active || controller.signal.aborted) return;
        saveAlert(key, null);
        setSaved(null);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [key, publicKey, room.id, saved?.id]);

  async function subscribe() {
    setBusy(true);
    setError('');
    try {
      if (Notification.permission === 'denied') {
        throw new Error('Allow notifications for LaundryLink in your browser settings to set an alert.');
      }
      if (!registration?.active) throw new Error('Reload LaundryLink to finish setting up push notifications.');
      const subscription = deviceSubscription ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }));
      setDeviceSubscription(subscription);
      const alert = await alertsRequest('/alerts', {
        roomId: room.id,
        machineId: machine.id,
        machineName: machine.machineName,
        leadMinutes,
        subscription: subscription.toJSON(),
      });
      const savedAlert = { ...alert, leadMinutes };
      saveAlert(key, savedAlert);
      setSaved(savedAlert);
    } catch (failure) {
      setError(failure.name === 'AbortError'
        ? 'The alert service timed out. Try again.'
        : failure.name === 'NotAllowedError'
          ? 'Allow notifications for LaundryLink in your browser settings to set an alert.'
          : failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await alertsRequest('/alerts/cancel', { roomId: room.id, id: saved.id });
      saveAlert(key, null);
      setSaved(null);
    } catch {
      setError('The alert could not be cancelled. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return (
    <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
      Push alerts are unavailable in this browser. On iPhone or iPad, add LaundryLink to your Home Screen and reopen it from there.
    </p>
  );

  if (serviceUnavailable) return <p role="status" className="mt-4 text-sm">Push alerts are temporarily unavailable.</p>;

  return (
    <div className="mt-4 space-y-3">
      {saved ? (
        <>
          <p role="status" className="text-sm font-medium">
            Alert set for this device {saved.leadMinutes ? 'about 5 minutes before the cycle ends' : 'when the cycle ends'}.
          </p>
          <button type="button" onClick={cancel} disabled={busy || !publicKey}
            className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600 disabled:opacity-50">
            Cancel Alert
          </button>
        </>
      ) : canSetAlert ? (
        <>
          <label htmlFor="alert-timing" className="block text-sm font-medium">Send a push notification</label>
          <select id="alert-timing" value={leadMinutes} onChange={(event) => setLeadMinutes(Number(event.target.value))}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700">
            <option value={0}>When the cycle ends</option>
            <option value={5}>About 5 minutes early</option>
          </select>
          <button type="button" onClick={subscribe} disabled={busy || !publicKey}
            className="min-h-[44px] w-full rounded-lg bg-uvm-green px-3 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50">
            {busy ? 'Setting alert…' : 'Set Push Alert'}
          </button>
        </>
      ) : <p role="status" className="text-sm">There is no pending alert for this machine.</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
