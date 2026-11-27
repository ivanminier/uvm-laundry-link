import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Share2 } from 'lucide-react';
import { laundryRooms, roomDisplayName, roomLabel, roomPath } from './laundryData';
import { CAMPUS_SECTIONS, campusHeading, groupCampusRooms } from './campusDirectory.mjs';

const roomSections = CAMPUS_SECTIONS.map(([id, label]) => ({
  label: campusHeading(id, label),
  groups: groupCampusRooms(laundryRooms.filter(room => room.campus === id), id).map(({ title, rooms }) => ({
    label: title,
    options: rooms.map(room => ({ value: room.id, label: roomLabel(room) })),
  })),
}));

const roomChoices = roomSections.flatMap(({ groups }) => groups.flatMap(({ options }) => options));

export function RoomSwitcher({ room, onSelectRoom }) {
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState(room.id);
  const root = useRef(null);
  const trigger = useRef(null);
  const list = useRef(null);
  const typed = useRef({ text: '', at: 0 });

  useEffect(() => {
    if (!open) return undefined;
    function dismissOutside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismissOutside);
    // Wait for focus to land outside. Touch browsers can blur an option before clicking the trigger.
    document.addEventListener('focusin', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const active = list.current.querySelector('[data-active]');
    if (!active) return;
    active.focus({ preventScroll: true });
    const optionBounds = active.getBoundingClientRect();
    const listBounds = list.current.getBoundingClientRect();
    if (optionBounds.top < listBounds.top) list.current.scrollTop += optionBounds.top - listBounds.top;
    if (optionBounds.bottom > listBounds.bottom) list.current.scrollTop += optionBounds.bottom - listBounds.bottom;
  }, [open, activeValue]);

  function openList() {
    typed.current = { text: '', at: 0 };
    setActiveValue(room.id);
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    trigger.current.focus({ preventScroll: true });
  }

  function handleListKey(event) {
    const { key } = event;
    const index = roomChoices.findIndex(option => option.value === activeValue);
    if (key === 'Escape') {
      event.preventDefault();
      closeList();
    } else if (key === 'Tab') {
      trigger.current.focus({ preventScroll: true });
      setOpen(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: roomChoices.length - 1 }[key];
      setActiveValue(roomChoices[Math.max(0, Math.min(next, roomChoices.length - 1))].value);
    } else if (key.length === 1 && key !== ' ' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      const query = (now - typed.current.at < 700 ? typed.current.text : '') + key.toLowerCase();
      typed.current = { text: query, at: now };
      const offset = index + (query.length === 1 ? 1 : 0);
      const ordered = [...roomChoices.slice(offset), ...roomChoices.slice(0, offset)];
      const match = ordered.find(option => option.label.toLowerCase().startsWith(query));
      if (match) setActiveValue(match.value);
    }
  }

  function renderOption(option) {
    return (
      <button key={option.value} type="button" role="option" tabIndex={-1}
        aria-selected={room.id === option.value} data-active={activeValue === option.value ? '' : undefined}
        className="ll-dropdown__option"
        onClick={() => {
          closeList();
          onSelectRoom(option.value);
        }}>
        <span>{option.label}</span>
        {room.id === option.value && <Check size={16} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div className="ll-dropdown" ref={root}>
      <h1 aria-label={roomLabel(room)}>
        <button id="room-switcher" ref={trigger} type="button" className="ll-dropdown__trigger"
          aria-label={'Switch room: ' + roomLabel(room)}
          aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? 'room-switcher-options' : undefined}
          onClick={() => open ? closeList() : openList()}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              openList();
            }
          }}>
          <span className="ll-dropdown__room">
            <span>{roomDisplayName(room)}</span>
            {room.locationLabel && <small>{room.locationLabel}</small>}
          </span>
          <ChevronDown className="ll-dropdown__arrow" size={17} aria-hidden="true" />
        </button>
      </h1>
      {open && (
        <div id="room-switcher-options" ref={list} role="listbox" aria-label="Switch room"
          className="ll-dropdown__list" onKeyDown={handleListKey}>
          {roomSections.map(({ label: campus, groups }) => (
            <div key={campus} className="ll-dropdown__section" role="presentation">
              <div className="ll-dropdown__campus" aria-hidden="true">{campus}</div>
              {groups.map(({ label: complex, options }) => (
                <div key={complex} role="group" aria-label={campus + ' · ' + complex}>
                  <div className="ll-dropdown__complex" aria-hidden="true">{complex}</div>
                  {options.map(renderOption)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
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
      <button type="button" onClick={shareRoom} className="ll-room-share-button" aria-label="Share room">
        <Share2 size={16} aria-hidden="true" /> <span>Share room</span>
      </button>
    </div>
  );
}
