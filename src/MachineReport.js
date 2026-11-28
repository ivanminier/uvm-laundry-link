import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarPlus, ExternalLink, Smartphone, Wrench, XCircle } from 'lucide-react';
import { BackButton } from './BackButton';
import { getOfficialRoomUrl, getRoomHistoryId, roomLabel, STATUS_MAX_AGE_MS } from './laundryData';
import { hasPushAlert, PushAlertForm } from './PushAlertForm';
import { isChannelLive } from './providerIntegration';
import { NativeNotificationForm, NativeRepairForm } from './NativeProviderForms';
import { downloadCycleCalendar } from './cycleCalendar';
import { cycleFinishAt, isRunningMachine } from './cycleEstimates';

import { requestService as SERVICE_REQUEST_URL } from './informationContent.mjs';

export { SERVICE_REQUEST_URL };

function CalendarReminder({ machine, room, checkedAt }) {
  const [message, setMessage] = useState('');
  const [, setExpiryCheckedAt] = useState(0);
  const finish = cycleFinishAt(machine, checkedAt);

  useEffect(() => {
    if (!finish) return undefined;
    const expires = Math.min(finish, Math.min(checkedAt, machine.observedAt) + STATUS_MAX_AGE_MS + 1);
    const timer = setTimeout(() => setExpiryCheckedAt(Date.now()), Math.max(0, expires - Date.now()));
    return () => clearTimeout(timer);
  }, [checkedAt, finish, machine.observedAt]);

  function download() {
    const now = Date.now();
    const finish = cycleFinishAt(machine, checkedAt, now);
    if (!finish || navigator.onLine === false) {
      setMessage('A current finish estimate is required for a calendar reminder.');
      return;
    }
    try {
      downloadCycleCalendar({ machine, room, finish, now });
      setMessage('Calendar file ready. Open it to add the reminder.');
    } catch {
      setMessage('The calendar file could not be opened or downloaded.');
    }
  }

  return (
    <>
      {finish && (
        <>
          <button type="button" onClick={download}
            className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-uvm-green hover:bg-green-50 dark:border-slate-600 dark:text-uvm-gold dark:hover:bg-slate-700">
            <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
          </button>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Calendar reminders use the current finish estimate and won’t update if the cycle changes.
          </p>
        </>
      )}
      {!finish && !message && isRunningMachine(machine) && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          Calendar reminders need a reliable finish time. This machine has no current estimate.
        </p>
      )}
      {message && <p role="status" className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
    </>
  );
}

// LaundryConnect labels machines "W14" and "D20" in its room view.
const providerMachineLabel = ({ type, number, machineName }) => {
  const digits = number ?? String(machineName ?? '').match(/\d+/)?.[0];
  return type && digits ? `${type[0]}${digits}` : machineName;
};

function MachineDialog({ machine, room, mode, canSetAlert, checkedAt, onClose, onModeChange }) {
  const dialog = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');
  const details = `University of Vermont · ${roomLabel(room)} · ${machine.machineName}`;
  const roomUrl = getOfficialRoomUrl(room);
  const reporting = mode === 'report';
  const contactAlert = mode === 'contactAlert';
  const hasOfficialRoom = Boolean(getRoomHistoryId(room));
  // Native repair/notification submissions only appear once their channel is
  // live (flag on and an authorized endpoint configured). Until then every
  // student sees the embedded official form below, exactly as before.
  const nativeRepair = reporting && isChannelLive('repair');
  const nativeEmail = isChannelLive('email');
  const nativeSms = isChannelLive('sms');
  const nativeContact = contactAlert && (nativeEmail || nativeSms);
  const native = nativeRepair || nativeContact;
  const canShowContactAlert = canSetAlert && (hasOfficialRoom || nativeEmail || nativeSms);
  const showOfficialForm = hasOfficialRoom && (reporting || contactAlert);
  const title = reporting ? `Report ${machine.machineName}` : `Alerts for ${machine.machineName}`;

  useEffect(() => { dialog.current.showModal(); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopyStatus('Machine details copied.');
    } catch {
      setCopyStatus('Machine details couldn’t be copied. You can select and copy the details above.');
    }
  };

  return (
    <dialog ref={dialog} onClose={onClose} aria-label={title}
      className={`ll-dialog w-[calc(100%-2rem)] rounded-xl p-5 shadow-xl backdrop:bg-black/60 sm:p-6 ${showOfficialForm && !native ? 'max-w-3xl' : 'max-w-md'}`}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="min-w-0 break-words text-xl font-bold">{title}</h3>
        <form method="dialog">
          <button aria-label={reporting ? 'Close report' : 'Close alerts'} className="rounded focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold"><XCircle size={24} /></button>
        </form>
      </div>
      <p className="mt-3 break-words text-sm">{details}</p>
      {reporting ? (
        nativeRepair ? (
          <NativeRepairForm room={room} machine={machine} />
        ) : (
        <div className="ll-report-steps">
          <p className="ll-report-steps__title">How to report {machine.machineName}</p>
          <ol>
            <li>{showOfficialForm
              ? <>Tap <strong>{providerMachineLabel(machine)}</strong> in the panel below.</>
              : <>Open the LaundryConnect page and tap <strong>{providerMachineLabel(machine)}</strong>.</>}</li>
            <li>Choose <strong>Report a problem</strong>, pick the issue, and add your name and email.</li>
            <li>Tap <strong>Submit Report</strong>. Automatic Laundry handles the repair.</li>
          </ol>
        </div>
        )
      ) : (
      <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">
        {contactAlert
            ? nativeContact
              ? `Get a text or email when ${machine.machineName}’s cycle finishes.`
              : `Select ${machine.machineName} below, open Notify Me, then choose Text or Email. Automatic Laundry sends the alert.`
            : 'Push alerts work even after you close UVM LaundryLink.'}
      </p>
      )}
      {(reporting || contactAlert) && room.machineRange && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The LaundryConnect page lists CCRH Floors 6 and 7 together under Floor 6.
        </p>
      )}
      {!reporting && !contactAlert && (
        <>
          <PushAlertForm machine={machine} room={room} canSetAlert={canSetAlert} />
          {canShowContactAlert && (
            <button type="button" onClick={() => onModeChange('contactAlert')}
              className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-uvm-green hover:bg-green-50 dark:border-slate-600 dark:text-uvm-gold dark:hover:bg-slate-700">
              <Smartphone size={16} /> Text or email alert
            </button>
          )}
          <CalendarReminder machine={machine} room={room} checkedAt={checkedAt} />
        </>
      )}
      {contactAlert && (
        <>
          <BackButton onClick={() => onModeChange('alerts')} className="my-2">Back to push alerts</BackButton>
          {nativeContact ? (
            <div className="space-y-5">
              {nativeEmail && <NativeNotificationForm room={room} machine={machine} channel="email" />}
              {nativeSms && <NativeNotificationForm room={room} machine={machine} channel="sms" />}
            </div>
          ) : (
            <a href={roomUrl} target="_blank" rel="noopener noreferrer"
              className="mb-2 flex min-h-[44px] w-fit items-center gap-2 rounded px-2 text-sm font-semibold text-uvm-green underline focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-uvm-gold dark:focus-visible:ring-uvm-gold">
              Open LaundryConnect in a new tab <ExternalLink size={16} aria-hidden="true" />
            </a>
          )}
        </>
      )}
      {showOfficialForm && native ? (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-uvm-green dark:text-uvm-gold">Prefer Automatic Laundry’s own form?</summary>
          <iframe src={`${roomUrl}?embed=1`}
            title={reporting ? 'Automatic Laundry repair reporting' : 'Automatic Laundry text or email alert setup'}
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="mt-3 block h-[min(55dvh,32rem)] min-h-[18rem] w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600" />
        </details>
      ) : showOfficialForm && (
        <iframe src={`${roomUrl}?embed=1`}
          title={reporting ? 'Automatic Laundry repair reporting' : 'Automatic Laundry text or email alert setup'}
          sandbox="allow-scripts allow-forms allow-same-origin"
          className="mt-3 block h-[min(55dvh,32rem)] min-h-[18rem] w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600" />
      )}
      {reporting && !nativeRepair && (
        <>
          <a href={roomUrl} target="_blank" rel="noopener noreferrer" onClick={copy}
            className={showOfficialForm
              ? 'mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-uvm-green underline dark:text-uvm-gold'
              : 'mt-5 flex items-center justify-center gap-2 rounded-lg bg-uvm-green px-3 py-3 text-center text-sm font-semibold text-white hover:bg-green-900'}>
            Copy details &amp; open reporting <ExternalLink size={16} aria-hidden="true" />
          </a>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-uvm-green dark:text-uvm-gold">
            <a href={roomUrl} target="_blank" rel="noopener noreferrer" className="underline">Open room reporting</a>
            <a href={SERVICE_REQUEST_URL} target="_blank" rel="noopener noreferrer" className="underline">Full service request</a>
            <button type="button" className="underline" onClick={copy}>Copy machine details</button>
          </div>
        </>
      )}
      {copyStatus && <p role="status" className="mt-3 text-sm">{copyStatus}</p>}
    </dialog>
  );
}

export function MachineReport({ machine, room, canSetAlert, checkedAt }) {
  const [mode, setMode] = useState(null);
  const launchControl = useRef(null);
  const reportButton = useRef(null);
  const existingAlert = hasPushAlert(room, machine);
  const buttonTitle = existingAlert ? 'Manage cycle alert' : 'Set cycle alert';

  function open(event, nextMode) {
    launchControl.current = event.currentTarget;
    setMode(nextMode);
  }

  function close() {
    setMode(null);
    const control = launchControl.current?.isConnected ? launchControl.current : reportButton.current;
    control?.focus({ preventScroll: true });
  }
  return (
    <>
      {(canSetAlert || existingAlert) && (
        <button type="button" onClick={(event) => open(event, 'alerts')}
          aria-label={`${buttonTitle} for ${machine.machineName}`}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-uvm-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-900 focus-visible:ring-2 focus-visible:ring-uvm-gold">
          <Bell size={16} /> {buttonTitle}
        </button>
      )}
      <button type="button" aria-label={`Report ${machine.machineName}`} ref={reportButton} onClick={(event) => open(event, 'report')}
        className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-uvm-green hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-uvm-gold dark:hover:bg-slate-700 dark:focus-visible:ring-uvm-gold">
        <Wrench size={16} /> Report a problem
      </button>
      {mode && <MachineDialog machine={machine} room={room} mode={mode} canSetAlert={canSetAlert} checkedAt={checkedAt} onModeChange={setMode} onClose={close} />}
    </>
  );
}
