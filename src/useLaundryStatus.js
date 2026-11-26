import { useEffect, useRef, useState } from 'react';
import { fetchRoomMachines, filterRoomMachines, fetchRoomStatus, normalizeRoomStatus } from './laundryData';

const REFRESH_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;

function readSnapshot(room) {
  try {
    const stored = localStorage.getItem(`washAlertRoom-v2-${room.id}`)
      ?? (room.machineRange ? null : localStorage.getItem(`washAlertRoom-${room.providerId}`));
    const snapshot = JSON.parse(stored);
    if (Array.isArray(snapshot?.machines) && Number.isFinite(snapshot.checkedAt)) return snapshot;
  } catch {
    // Status still works if storage is unavailable.
  }
  return null;
}

export function useLaundryStatus(room, refreshInterval = REFRESH_INTERVAL_MS) {
  const roomId = room?.id;
  const [state, setState] = useState(null);
  const refresh = useRef(null);

  useEffect(() => {
    if (!room?.providerId) return undefined;

    const providerId = room.providerId;
    let snapshot = readSnapshot(room);
    let catalog;
    let request;
    let active = true;
    let failed = false;

    function show(busy) {
      setState({ roomId, snapshot, busy, failed, stale: !!snapshot && (failed || Date.now() - snapshot.checkedAt > REFRESH_INTERVAL_MS * 2) });
    }

    async function update() {
      if (document.hidden || request) return;

      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      show(true);

      try {
        const [machines, payload] = await Promise.all([
          catalog ?? fetchRoomMachines(providerId, controller.signal).then((machines) => filterRoomMachines(room, machines)),
          fetchRoomStatus(providerId, controller.signal),
        ]);
        if (!active || controller.signal.aborted) return;
        const normalized = normalizeRoomStatus(payload, providerId, machines);
        catalog = machines;
        snapshot = { machines: normalized, checkedAt: Date.now() };
        try {
          localStorage.setItem(`washAlertRoom-v2-${roomId}`, JSON.stringify(snapshot));
        } catch {
          // An in-memory snapshot is available for this visit.
        }
        failed = false;
        show(false);
      } catch {
        if (active) {
          failed = true;
          show(false);
        }
      } finally {
        clearTimeout(timeout);
        controller.abort();
        request = undefined;
      }
    }

    const resume = () => {
      if (!snapshot || Date.now() - snapshot.checkedAt >= refreshInterval) update();
    };

    show(true);
    refresh.current = update;
    update();
    const poll = setInterval(update, refreshInterval);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', update);

    return () => {
      active = false;
      request?.abort();
      refresh.current = null;
      clearInterval(poll);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', update);
    };
  }, [room, roomId, refreshInterval]);

  const current = roomId && state?.roomId === roomId ? state : null;
  return {
    machines: current?.snapshot?.machines,
    checkedAt: current?.snapshot?.checkedAt,
    stale: !!current?.stale,
    failed: !!current?.failed,
    busy: !!room?.providerId && (!current || current.busy),
    refresh: () => refresh.current?.(),
  };
}
