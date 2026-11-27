import React, { useState } from 'react';
import { ChevronDown, Share2 } from 'lucide-react';
import { laundryRooms, roomDisplayName, roomLabel, roomPath } from './laundryData';

export function RoomSwitcher({ room, onSelectRoom }) {
  return (
    <div className="ll-room-title-select">
      <div className="ll-room-title-select__text">
        <h2>{roomDisplayName(room)}</h2>
        {room.locationLabel && <p>{room.locationLabel}</p>}
      </div>
      <ChevronDown className="ll-room-title-select__arrow" size={18} aria-hidden="true" />
      <label htmlFor="room-switcher" className="sr-only">Switch room</label>
      <select id="room-switcher" value={room.id} onChange={(event) => onSelectRoom(event.target.value)}>
        {laundryRooms.map((option) => <option key={option.id} value={option.id}>{roomLabel(option)}</option>)}
      </select>
    </div>
  );
}

export function RoomTools({ room }) {
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
    <div className="ll-room-tools">
      <button type="button" onClick={shareRoom} className="ll-room-share-button">
        <Share2 size={16} aria-hidden="true" /> Share Room
      </button>
      {shareStatus && <p role="status" className="ll-room-tools__status">{shareStatus}</p>}
      {manualLink && (
        <label className="ll-room-tools__manual-link">
          Copy this room link
          <input readOnly value={manualLink} onFocus={(event) => event.target.select()}
            className="ll-input mt-1 block w-full rounded-md border p-2" />
        </label>
      )}
    </div>
  );
}
