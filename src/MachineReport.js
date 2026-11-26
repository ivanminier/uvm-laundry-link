import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, ExternalLink, Smartphone, Wrench, XCircle } from 'lucide-react';
import { getOfficialRoomUrl, getRoomHistoryId, roomLabel } from './laundryData';
import { hasPushAlert, PushAlertForm } from './PushAlertForm';

export const SERVICE_REQUEST_URL = 'https://automaticlaundry.com/request-service/';

function MachineDialog({ machine, room, mode, canSetAlert, onClose, onModeChange }) {
  const dialog = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');
  const details = `University of Vermont · ${roomLabel(room)} · ${machine.machineName}`;
  const roomUrl = getOfficialRoomUrl(room);
  const reporting = mode === 'report';
  const contactAlert = mode === 'contactAlert';
  const canShowContactAlert = canSetAlert && !!getRoomHistoryId(room);
  const title = reporting ? `Report ${machine.machineName}` : `Alerts for ${machine.machineName}`;

  useEffect(() => { dialog.current.showModal(); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopyStatus('Machine details copied.');
    } catch {
      setCopyStatus('Select and copy the details shown above.');
    }
  };

  return (
    <dialog ref={dialog} onClose={onClose} aria-label={title}
      className={`w-[calc(100%-2rem)] rounded-xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/60 dark:bg-slate-800 dark:text-slate-100 sm:p-6 ${contactAlert ? 'max-w-3xl' : 'max-w-md'}`}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <form method="dialog">
          <button aria-label={reporting ? 'Close report' : 'Close alerts'} className="rounded focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold"><XCircle size={24} /></button>
        </form>
      </div>
      <p className="mt-3 text-sm">{details}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {reporting
          ? `Select ${machine.machineName} on the official room page, then choose Report a problem.`
          : contactAlert
            ? `Select ${machine.machineName} below, then choose Text or Email. Automatic Laundry sends the alert.`
            : 'Push alerts work even after you close LaundryLink.'}
      </p>
      {(reporting || contactAlert) && room.machineRange && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The official page lists CCRH Floors 6 and 7 together under Floor 6.
        </p>
      )}
      {!reporting && !contactAlert && (
        <>
          <PushAlertForm machine={machine} room={room} canSetAlert={canSetAlert} />
          {canShowContactAlert && (
            <button type="button" onClick={() => onModeChange('contactAlert')}
              className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-uvm-green hover:bg-green-50 dark:border-slate-600 dark:text-uvm-gold dark:hover:bg-slate-700">
              <Smartphone size={16} /> Text or Email Alert
            </button>
          )}
        </>
      )}
      {contactAlert && (
        <>
          <button type="button" onClick={() => onModeChange('alerts')}
            className="my-2 inline-flex min-h-[44px] items-center gap-2 rounded px-2 text-sm font-semibold text-uvm-green dark:text-uvm-gold">
            <ArrowLeft size={16} /> Back to push alerts
          </button>
          <iframe src={`${roomUrl}?embed=1`} title="Automatic Laundry text or email alert setup"
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="block h-[min(55dvh,32rem)] min-h-[18rem] w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600" />
        </>
      )}
      {reporting && <>
      <a href={roomUrl} target="_blank" rel="noopener noreferrer"
        className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-uvm-green px-3 py-3 text-sm font-semibold text-white hover:bg-green-900">
        Open Room Reporting <ExternalLink size={16} />
      </a>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-uvm-green dark:text-uvm-gold">
          <a href={SERVICE_REQUEST_URL} target="_blank" rel="noopener noreferrer" className="underline">Full Service Request</a>
          <button type="button" className="underline" onClick={copy}>Copy Machine Details</button>
        </div>
      </>}
      {copyStatus && <p role="status" className="mt-3 text-sm">{copyStatus}</p>}
    </dialog>
  );
}

export function MachineReport({ machine, room, canSetAlert }) {
  const [mode, setMode] = useState(null);
  const existingAlert = hasPushAlert(room, machine);
  const buttonTitle = existingAlert ? 'Manage Cycle Alert' : 'Set Cycle Alert';
  return (
    <>
      {(canSetAlert || existingAlert) && (
        <button type="button" onClick={() => setMode('alerts')}
          aria-label={`${buttonTitle} for ${machine.machineName}`}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-uvm-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-900 focus-visible:ring-2 focus-visible:ring-uvm-gold">
          <Bell size={16} /> {buttonTitle}
        </button>
      )}
      <button type="button" aria-label={`Report ${machine.machineName}`} onClick={() => setMode('report')}
        className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-uvm-green hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-uvm-gold dark:hover:bg-slate-700 dark:focus-visible:ring-uvm-gold">
        <Wrench size={16} /> Report a problem
      </button>
      {mode && <MachineDialog machine={machine} room={room} mode={mode} canSetAlert={canSetAlert} onModeChange={setMode} onClose={() => setMode(null)} />}
    </>
  );
}
