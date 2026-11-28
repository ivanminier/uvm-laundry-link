export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
export const average = (values) => {
  const measured = values.filter((value) => value !== null);
  return measured.length ? measured.reduce((sum, value) => sum + value, 0) / measured.length : null;
};

export function quieterWindowDetails(grid) {
  const firstHour = 7;
  const windowHours = 3;
  // Compare each window with the same room's daytime/evening use on the same days.
  const coveredDays = grid.filter((row) => row.slice(firstHour).filter(Number.isFinite).length >= 12);
  const windows = HOURS.slice(firstHour, 24 - windowHours + 1).flatMap((start) => {
    const measurements = coveredDays.flatMap((row) => {
      const hours = row.slice(start, start + windowHours);
      if (!hours.every(Number.isFinite)) return [];
      const baselineUsage = average(row.slice(firstHour));
      const windowUsage = average(hours);
      return [{ baselineUsage, windowUsage, difference: baselineUsage - windowUsage }];
    });
    return measurements.length >= 5 && measurements.filter(({ difference }) => difference >= 5).length >= 4
      ? [{
        label: `${hourLabel(start)}–${hourLabel((start + windowHours) % 24)}`,
        improvement: average(measurements.map(({ difference }) => difference)),
        windowUsage: average(measurements.map(({ windowUsage }) => windowUsage)),
        baselineUsage: average(measurements.map(({ baselineUsage }) => baselineUsage)),
      }]
      : [];
  });
  return windows.sort((first, second) => second.improvement - first.improvement)[0] ?? null;
}

export function quieterWindow(grid) {
  return quieterWindowDetails(grid)?.label ?? null;
}

export function quieterWindows(rooms) {
  return Object.fromEntries(Object.entries(rooms).flatMap(([id, { grid }]) => {
    const hours = quieterWindow(grid);
    return hours ? [[id, hours]] : [];
  }));
}
