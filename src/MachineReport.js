import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Wrench, XCircle } from 'lucide-react';

export const SERVICE_REQUEST_URL = 'https://automaticlaundry.com/request-service/';

function ReportDialog({ machine, room, onClose }) {
  const dialog = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');
  const label = room.officialName || room.name;
  const details = `University of Vermont · ${label} · ${machine.machineName}`;
  const roomUrl = room.historyId ? `https://laundryconnectlive.com/live/${room.historyId}` : room.url;

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
    <dialog ref={dialog} onClose={onClose} aria-label={`Report ${machine.machineName}`}
      className="w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/60 dark:bg-slate-800 dark:text-slate-100 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold">Report {machine.machineName}</h3>
        <form method="dialog">
          <button aria-label="Close report" className="rounded focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold"><XCircle size={24} /></button>
        </form>
      </div>
      <p className="mt-3 text-sm">{details}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {room.historyId
          ? `Open the official room page, select ${machine.machineName}, then choose Report a problem.`
          : 'Open the official room page to send a service message, or use the full service request form.'}
      </p>
      <a href={roomUrl} target="_blank" rel="noopener noreferrer"
        className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-uvm-green px-3 py-3 text-sm font-semibold text-white hover:bg-green-900">
        Open Room Reporting <ExternalLink size={16} />
      </a>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-uvm-green dark:text-uvm-gold">
        <a href={SERVICE_REQUEST_URL} target="_blank" rel="noopener noreferrer" className="underline">Full Service Request</a>
        <button type="button" className="underline" onClick={copy}>Copy Machine Details</button>
      </div>
      {copyStatus && <p role="status" className="mt-3 text-sm">{copyStatus}</p>}
    </dialog>
  );
}

export function MachineReport({ machine, room }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={`Report ${machine.machineName}`} onClick={() => setOpen(true)}
        className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-uvm-green hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-uvm-gold dark:hover:bg-slate-700 dark:focus-visible:ring-uvm-gold">
        <Wrench size={16} /> Report a problem
      </button>
      {open && <ReportDialog machine={machine} room={room} onClose={() => setOpen(false)} />}
    </>
  );
}
