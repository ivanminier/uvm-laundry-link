import { useEffect, useRef, useState } from 'react';
import { fetchRoomMachines, fetchRoomStatus, normalizeRoomStatus } from './laundryData';

const REFRESH_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;

function readSnapshot(roomId) {
  try {
    const snapshot = JSON.parse(localStorage.getItem(`washAlertRoom-${roomId}`));
    if (Array.isArray(snapshot?.machines) && Number.isFinite(snapshot.checkedAt)) return snapshot;
  } catch {
    // Status still works if storage is unavailable.
  }
  return null;
}

export function useLaundryStatus(room) {
  const roomId = room?.providerId;
  const [state, setState] = useState(null);
  const refresh = useRef(null);

  useEffect(() => {
    if (!roomId) return undefined;

    let snapshot = readSnapshot(roomId);
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
          catalog ?? fetchRoomMachines(roomId, controller.signal),
          fetchRoomStatus(roomId, controller.signal),
        ]);
        if (!active || controller.signal.aborted) return;
        const normalized = normalizeRoomStatus(payload, roomId, machines);
        catalog = machines;
        snapshot = { machines: normalized, checkedAt: Date.now() };
        try {
          localStorage.setItem(`washAlertRoom-${roomId}`, JSON.stringify(snapshot));
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
      if (!snapshot || Date.now() - snapshot.checkedAt >= REFRESH_INTERVAL_MS) update();
    };

    show(true);
    refresh.current = update;
    update();
    const poll = setInterval(update, REFRESH_INTERVAL_MS);
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
  }, [roomId]);

  const current = roomId && state?.roomId === roomId ? state : null;
  return {
    machines: current?.snapshot?.machines,
    checkedAt: current?.snapshot?.checkedAt,
    stale: !!current?.stale,
    failed: !!current?.failed,
    busy: !!roomId && (!current || current.busy),
    refresh: () => refresh.current?.(),
  };
}
