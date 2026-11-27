import { isFreeMachine, STATUS_MAX_AGE_MS } from './laundryData';

const isRecent = (timestamp, now) => Number.isFinite(timestamp) &&
  timestamp <= now && now - timestamp <= STATUS_MAX_AGE_MS;

const isRunningMachine = ({ status }) => /^(In Use|Finishing Soon|\d+ min)$/.test(status);

export function cycleFinishAt(machine, checkedAt, now = Date.now()) {
  const { observedAt, remainingSeconds } = machine;
  if (!isRunningMachine(machine) || !isRecent(checkedAt, now) || !isRecent(observedAt, now) ||
      !Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return null;

  const finish = observedAt + remainingSeconds * 1000;
  return finish > now && finish < Date.UTC(10_000, 0, 1) - 6 * 60_000 ? finish : null;
}

export function nextReportedFinish(machines, checkedAt, now = Date.now()) {
  let next = null;
  for (const machine of machines) {
    if (isFreeMachine(machine) || machine.status === 'Unknown' || machine.status === 'Offline') return null;

    const estimatedFinish = cycleFinishAt(machine, checkedAt, now);
    // An untimed running cycle may finish first.
    if (!estimatedFinish && isRunningMachine(machine)) return null;
    // The catalog is already sorted by machine name, so ties keep the first entry.
    if (estimatedFinish && (!next || estimatedFinish < next.estimatedFinish)) {
      next = { machine, estimatedFinish };
    }
  }
  return next;
}
