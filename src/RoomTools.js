import React, { useRef } from 'react';
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
  const sharing = useRef(false);
  if (typeof navigator.share !== 'function') return null;

  async function shareRoom() {
    if (sharing.current) return;
    sharing.current = true;

    const url = new URL(roomPath(room), window.location.origin + '/').href;
    try {
      await navigator.share({ title: `${roomLabel(room)} · UVM LaundryLink`, url });
    } catch {
      // The native share sheet handles its own UI, including cancellation.
    } finally {
      sharing.current = false;
    }
  }

  return (
    <div className="ll-room-tools">
      <button type="button" onClick={shareRoom} className="ll-room-share-button">
        <Share2 size={16} aria-hidden="true" /> Share Room
      </button>
    </div>
  );
}
