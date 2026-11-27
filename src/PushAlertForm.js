import React, { useEffect, useState } from 'react';

import { NEXT_WASHER, NEXT_WASHER_LABEL, NEXT_DRYER, NEXT_DRYER_LABEL } from './laundryData';
import { alertsRequest, getSavedAlert, recordKey, removeSavedAlert, saveAlert } from './pushAlerts';

import { HomeScreenSteps, needsHomeScreenForPush } from './HomeScreenHelp';

export { hasPushAlert } from './pushAlerts';

function decodeApplicationKey(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(88, '=');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function PushAlertForm({ machine, room, canSetAlert, watchType, machines }) {
  const watchRoom = !machine;
  const isDryer = watchType === 'Dryer';
  const machineId = machine?.id ?? (isDryer ? NEXT_DRYER : NEXT_WASHER);
  const machineName = machine?.machineName ?? (isDryer ? NEXT_DRYER_LABEL : NEXT_WASHER_LABEL);
  const key = recordKey(room, machineId);
  const [saved, setSaved] = useState(() => getSavedAlert(key));
  const [leadMinutes, setLeadMinutes] = useState(0);
  const [publicKey, setPublicKey] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [deviceSubscription, setDeviceSubscription] = useState(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsHomeScreen = needsHomeScreenForPush();
  const supported = !needsHomeScreen && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

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
        removeSavedAlert(key, saved.id);
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
        throw new Error('Allow notifications for UVM LaundryLink in your browser settings to set an alert.');
      }
      if (!registration?.active) throw new Error('Reload UVM LaundryLink to finish setting up push notifications.');
      const subscription = deviceSubscription ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }));
      setDeviceSubscription(subscription);
      const alert = await alertsRequest('/alerts', {
        roomId: room.id,
        machineId,
        machineName,
        ...(watchRoom && {
          machineIds: machines.map(({ id }) => String(id)),
          ...(isDryer ? {} : { washerIds: machines.map(({ id }) => String(id)) }),
        }),
        leadMinutes,
        subscription: subscription.toJSON(),
      });
      const savedAlert = { ...alert, machineName, leadMinutes };
      saveAlert(key, savedAlert);
      setSaved(savedAlert);
    } catch (failure) {
      setError(failure.name === 'AbortError'
        ? 'The alert service timed out. Try again.'
        : failure.name === 'NotAllowedError'
          ? 'Allow notifications for UVM LaundryLink in your browser settings to set an alert.'
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
      removeSavedAlert(key, saved.id);
      setSaved(null);
    } catch {
      setError('The alert could not be cancelled. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (needsHomeScreen) return (
    <div className="mt-4 space-y-3 rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-600">
      <p><strong>Add LaundryLink to your Home Screen to get push alerts.</strong></p>
      <HomeScreenSteps />
      <p>Open LaundryLink from its new icon, then return to your room and set the alert.</p>
    </div>
  );

  if (!supported) return (
    <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
      Push alerts are unavailable in this browser.
    </p>
  );

  if (serviceUnavailable) return <p role="status" className="mt-4 text-sm">Push alerts are temporarily unavailable.</p>;

  return (
    <div className="mt-4 space-y-3">
      {saved ? (
        <>
          <p role="status" className="text-sm font-medium">
            {watchRoom
              ? `You’ll get one push when a ${watchType.toLowerCase()} opens in this room.`
              : `You’ll get a push ${saved.leadMinutes ? 'about 5 minutes before the cycle ends' : 'when the cycle ends'}.`}
          </p>
          <button type="button" onClick={cancel} disabled={busy || !publicKey}
            className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600 disabled:opacity-50">
            Cancel Alert
          </button>
        </>
      ) : canSetAlert ? (
        <>
          {!watchRoom && (
            <>
              <label htmlFor="alert-timing" className="block text-sm font-medium">Send a push notification</label>
              <select id="alert-timing" value={leadMinutes} onChange={(event) => setLeadMinutes(Number(event.target.value))}
                className="ll-input min-h-[44px] w-full rounded-lg border px-3 text-sm">
                <option value={0}>When the cycle ends</option>
                <option value={5}>About 5 minutes early</option>
              </select>
            </>
          )}
          <button type="button" onClick={subscribe} disabled={busy || !publicKey}
            className="min-h-[44px] w-full rounded-lg bg-uvm-green px-3 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50">
            {busy ? 'Setting alert…' : watchRoom ? 'Notify me' : 'Set Push Alert'}
          </button>
        </>
      ) : <p role="status" className="text-sm">
        {watchRoom ? `A room alert is available when no ${watchType.toLowerCase()}s are free.` : 'There is no pending alert for this machine.'}
      </p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
