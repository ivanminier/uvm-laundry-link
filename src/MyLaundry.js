import React, { useEffect, useState } from 'react';
import { BackButton } from './BackButton';
import { machinePath, roomLabel, roomPath, NEXT_WASHER, NEXT_WASHER_LABEL, NEXT_DRYER, NEXT_DRYER_LABEL } from './laundryData';
import { alertsRequest, listSavedAlerts, removeSavedAlert } from './pushAlerts';
import { useLaundryStatus } from './useLaundryStatus';

async function checkSavedAlerts(alerts, signal) {
  const batches = [];
  for (let start = 0; start < alerts.length; start += 20) batches.push(alerts.slice(start, start + 20));
  const results = await Promise.all(batches.map(async (batch) => {
    try {
      const { statuses } = await alertsRequest('/alerts/status', {
        alerts: batch.map(({ room, id }) => ({ roomId: room.id, id })),
      }, signal);
      return batch.map((alert, index) => ({ alert, status: statuses?.[index] }));
    } catch {
      return batch.map((alert) => ({ alert, status: null }));
    }
  }));
  return results.flat();
}

function AlertRow({ alert, roomStatus, onOpenMachine, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const watchType = alert.machineId === NEXT_WASHER ? 'Washer' : alert.machineId === NEXT_DRYER ? 'Dryer' : null;
  const watchRoom = !!watchType;
  const machine = roomStatus.machines?.find(({ id }) => id === alert.machineId);
  const machineName = watchType === 'Washer' ? NEXT_WASHER_LABEL : watchType === 'Dryer' ? NEXT_DRYER_LABEL
    : machine?.machineName ?? alert.machineName ?? `Machine ${alert.machineId}`;

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await alertsRequest('/alerts/cancel', { roomId: alert.room.id, id: alert.id });
      onCancel(alert);
    } catch {
      setError('Could not cancel this alert. Try again.');
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div>
        <a href={watchRoom ? roomPath(alert.room) : machinePath(alert.room, alert.machineId)}
          onClick={(event) => onOpenMachine(event, alert.room, watchRoom ? null : alert.machineId)}
          className="font-semibold text-uvm-green underline underline-offset-4 dark:text-uvm-gold">
          {machineName}
        </a>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          {roomLabel(alert.room)}{!roomStatus.stale && machine?.timeRemaining > 0 && ` · About ${machine.timeRemaining} min left`}
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {watchRoom ? `One push when a ${watchType.toLowerCase()} opens` : alert.leadMinutes ? 'Push about 5 min before the cycle ends' : 'Push when the cycle ends'}
        </p>
        {error && <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </div>
      <button type="button" onClick={cancel} disabled={busy} aria-label={`Cancel alert for ${machineName}`}
        className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">
        {busy ? 'Cancelling…' : 'Cancel alert'}
      </button>
    </li>
  );
}

function RoomAlerts({ alerts, onOpenMachine, onCancel }) {
  const roomStatus = useLaundryStatus(alerts[0].room);
  return alerts.map((alert) => (
    <AlertRow key={alert.id} alert={alert} roomStatus={roomStatus} onOpenMachine={onOpenMachine} onCancel={onCancel} />
  ));
}

export function MyLaundry({ onBack, onOpenMachine }) {
  const [alerts, setAlerts] = useState(listSavedAlerts);
  const [statusFailed, setStatusFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    let request;

    async function checkAlerts() {
      if (running || document.hidden) return;
      const saved = listSavedAlerts();
      setAlerts((current) => saved.map((alert) => ({
        ...alert, machineName: alert.machineName ?? current.find(({ id }) => id === alert.id)?.machineName,
      })));
      if (!saved.length) {
        setStatusFailed(false);
        return;
      }
      running = true;
      setChecking(true);
      request = new AbortController();
      const timeout = setTimeout(() => request.abort(), 10_000);
      const results = await checkSavedAlerts(saved, request.signal);
      clearTimeout(timeout);
      running = false;
      if (controller.signal.aborted) return;
      const names = new Map();
      for (const { alert, status } of results) {
        if (status?.active === false) removeSavedAlert(alert.key, alert.id);
        if (status?.machineName) names.set(alert.id, status.machineName);
      }
      setAlerts((current) => listSavedAlerts().map((alert) => ({
        ...alert, machineName: names.get(alert.id) ?? alert.machineName ?? current.find(({ id }) => id === alert.id)?.machineName,
      })));
      setStatusFailed(results.some(({ status }) => !status));
      setChecking(false);
    }

    checkAlerts();
    const interval = setInterval(checkAlerts, 30_000);
    window.addEventListener('storage', checkAlerts);
    document.addEventListener('visibilitychange', checkAlerts);
    return () => {
      controller.abort();
      request?.abort();
      clearInterval(interval);
      window.removeEventListener('storage', checkAlerts);
      document.removeEventListener('visibilitychange', checkAlerts);
    };
  }, []);

  function cancelAlert(alert) {
    removeSavedAlert(alert.key, alert.id);
    setAlerts((current) => current.filter(({ id }) => id !== alert.id));
  }

  const rooms = new Map();
  for (const alert of alerts) {
    const group = rooms.get(alert.room.id) ?? [];
    group.push(alert);
    rooms.set(alert.room.id, group);
  }

  return (
    <section className="ll-panel mx-auto max-w-2xl p-5 sm:p-8 animate-fadeIn">
      <header className="ll-overlay-heading mb-6">
        <h2 className="text-3xl lg:text-4xl font-bold">My Laundry</h2>
        <BackButton onClick={onBack} />
      </header>
      <h3 className="mb-3 mt-6 text-lg font-semibold">Push alerts on this device</h3>
      {statusFailed && <p role="status" className="mb-3 text-sm text-amber-800 dark:text-amber-300">Could not check all alerts. Saved alerts are shown below.</p>}
      {alerts.length ? (
        <ul className="space-y-3" aria-busy={checking}>
          {Array.from(rooms, ([id, group]) => <RoomAlerts key={id} alerts={group} onOpenMachine={onOpenMachine} onCancel={cancelAlert} />)}
        </ul>
      ) : <p className="text-sm text-slate-700 dark:text-slate-200">No active push alerts. Set one on a running machine or when a room has no free washers or dryers.</p>}
      <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        Automatic Laundry handles text and email alerts.
      </p>
    </section>
  );
}
