import { findLaundryRoom } from './laundryData';

const ALERTS_API = 'https://alerts.uvmlaundry.com';
const alertPrefix = 'uvmLaundryPushAlert-';
export const recordKey = (room, machine) => `${alertPrefix}${room.id}-${machine.id}`;

export function getSavedAlert(key) {
  try {
    const alert = JSON.parse(localStorage.getItem(key));
    return typeof alert?.id === 'string' && alert.expiresAt > Date.now() ? alert : null;
  } catch {
    return null;
  }
}

export function hasPushAlert(room, machine) {
  return !!getSavedAlert(recordKey(room, machine));
}

export function saveAlert(key, alert) {
  try {
    if (alert) localStorage.setItem(key, JSON.stringify(alert));
    else localStorage.removeItem(key);
  } catch {
    // The alert can still be managed until the dialog closes.
  }
}

export async function alertsRequest(path, data, signal) {
  const controller = signal ? null : new AbortController();
  const timeout = controller && setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${ALERTS_API}${path}`, {
      ...(data && {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
      signal: signal ?? controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? 'The alert service is temporarily unavailable.');
    }
    return await response.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function listSavedAlerts() {
  try {
    return Object.keys(localStorage).flatMap((key) => {
      if (!key.startsWith(alertPrefix)) return [];
      const [roomId, machineId] = key.slice(alertPrefix.length).split('-', 2);
      const room = findLaundryRoom(roomId);
      const alert = getSavedAlert(key);
      return room && machineId && alert ? [{ ...alert, room, machineId, key }] : [];
    }).sort((first, second) => first.expiresAt - second.expiresAt);
  } catch {
    return [];
  }
}

export function removeSavedAlert(key, id) {
  if (getSavedAlert(key)?.id === id) saveAlert(key, null);
}
