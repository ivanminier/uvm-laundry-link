import React, { useState } from 'react';
import { ExternalLink, Share2 } from 'lucide-react';
import { getOfficialRoomUrl, laundryRooms, roomLabel, roomPath } from './laundryData';

export function RoomTools({ room, onSelectRoom }) {
  const [shareStatus, setShareStatus] = useState('');
  const [manualLink, setManualLink] = useState('');

  async function shareRoom() {
    const url = new URL(roomPath(room), window.location.origin + '/').href;
    setManualLink('');
    setShareStatus('');

    if (navigator.share) {
      try {
        await navigator.share({ title: `${roomLabel(room)} · UVM LaundryLink`, url });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Room link copied.');
    } catch {
      setManualLink(url);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="room-switcher" className="sr-only">Switch room</label>
        <select id="room-switcher" value={room.id} onChange={(event) => onSelectRoom(event.target.value)}
          className="min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-uvm-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-uvm-gold sm:w-auto">
          {laundryRooms.map((option) => <option key={option.id} value={option.id}>{roomLabel(option)}</option>)}
        </select>
        <button type="button" onClick={shareRoom}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-uvm-green hover:bg-green-50 dark:border-slate-600 dark:bg-slate-800 dark:text-uvm-gold dark:hover:bg-slate-700">
          <Share2 size={16} /> Share Room
        </button>
        <a href={getOfficialRoomUrl(room)} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm text-slate-600 underline underline-offset-4 hover:text-uvm-green dark:text-slate-300 dark:hover:text-uvm-gold">
          Official Room Page <ExternalLink size={14} />
        </a>
      </div>
      {shareStatus && <p role="status" className="mt-2 text-sm text-slate-700 dark:text-slate-200">{shareStatus}</p>}
      {manualLink && (
        <label className="mt-2 block text-sm">
          Copy this room link
          <input readOnly value={manualLink} onFocus={(event) => event.target.select()}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800" />
        </label>
      )}
    </div>
  );
}
