import { act } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { informationDisclosure } from './informationContent.mjs';
import { MachineReport } from './MachineReport';
import { quieterWindow, RoomPeakTimes } from './RoomPeakTimes';
import { quieterWindows } from './peakTimesGuidance.mjs';
import guidance from './peakTimesGuidance.json';
import snapshot from './peakTimesSnapshot.json';
import { canWatchNextMachine, filterRoomMachines, findLaundryRoom, getRoomHistoryId, laundryRooms, normalizeRoomStatus, roomLabel, roomPath } from './laundryData';

beforeEach(() => jest.spyOn(window, 'scrollTo').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

// Back navigation inside the app uses history.back(), which completes on a later task as in browsers.
const historyTraversal = () => new Promise((resolve) => {
  const done = () => setTimeout(resolve, 0);
  window.addEventListener('popstate', done, { once: true });
  setTimeout(() => { window.removeEventListener('popstate', done); resolve(); }, 100);
});

const statusFixture = (entries) => ({
  room: { id: 12285 },
  machines: Object.fromEntries(entries.map(([id, statusId, remainingSeconds]) => [id, { statusId, remainingSeconds }])),
});

test('joins by provider machine ID and only displays timers for running cycles', () => {
  const catalog = [1, 2, 3, 4, 5, 6].map((id) => ({ id: String(id) }));
  const payload = statusFixture([
    ['3', 'AVAILABLE', 1800], ['2', 'COMPLETE', 1800], ['1', 'IN_USE', 61],
    ['4', 'UNAVAILABLE', 1800], ['6', 'READY_TO_START', 1800],
  ]);
  const result = normalizeRoomStatus(payload, '12285', catalog);
  expect(result.map(({ status, timeRemaining }) => [status, timeRemaining])).toEqual([
    ['2 min', 2], ['Cycle Finished', 0], ['Available', 0], ['Offline', 0], ['Unknown', 0], ['Ready to Start', 0],
  ]);
  expect(() => normalizeRoomStatus(payload, '12300', catalog)).toThrow('Invalid room status');
  expect(() => normalizeRoomStatus(statusFixture([]), '12285', catalog)).toThrow('Invalid room status');
});

test('room alerts can target an unavailable machine type only when its statuses are known', () => {
  const machines = [
    { type: 'Washer', status: 'Cycle Finished' },
    { type: 'Dryer', status: 'Available' },
  ];
  expect(canWatchNextMachine(machines, 'Washer')).toBe(false);
  expect(canWatchNextMachine([{ type: 'Washer', status: 'In Use' }], 'Washer')).toBe(true);
  expect(canWatchNextMachine([{ type: 'Dryer', status: 'Door Open' }], 'Dryer')).toBe(false);
  expect(canWatchNextMachine(machines, 'Dryer')).toBe(false);
  expect(canWatchNextMachine([{ type: 'Dryer', status: 'Unknown' }], 'Dryer')).toBe(false);
  expect(canWatchNextMachine([], 'Washer')).toBe(false);
  const washer = (status) => ({ type: 'Washer', status });
  expect(canWatchNextMachine([washer('Offline'), washer('Offline')], 'Washer')).toBe(false);
  expect(canWatchNextMachine([washer('Offline'), washer('Unknown')], 'Washer')).toBe(false);
  expect(canWatchNextMachine([washer('In Use'), washer('Offline')], 'Washer')).toBe(false);
  expect(canWatchNextMachine([washer('In Use'), washer('Unknown')], 'Washer')).toBe(false);
  expect(canWatchNextMachine([washer('Offline'), { type: 'Dryer', status: 'In Use' }], 'Dryer')).toBe(true);
  expect(canWatchNextMachine([washer('12 min'), washer('Finishing Soon'), washer('Out of Order')], 'Washer')).toBe(true);
  expect(canWatchNextMachine([washer('Out of Order')], 'Washer')).toBe(true);
  expect(canWatchNextMachine([washer('Reserved'), washer('Ready to Start')], 'Washer')).toBe(true);
  expect(canWatchNextMachine([washer('In Use'), washer('Cycle Finished')], 'Washer')).toBe(false);
});

const davisMachines = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
  id, machineNumber: id, washAlertIsVisible: true, machineType: { isWasher: id <= 4, isDryer: id > 4 },
}));

async function renderDavis(statusIds, assertions) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.history.replaceState(null, '', '#room/davis-hall');
  localStorage.clear();
  let current = statusIds;
  const payload = () => ({ room: { id: 12254 }, machines: Object.fromEntries(
    current.map((statusId, index) => [index + 1, { statusId, remainingSeconds: 600, createdAt: new Date().toISOString() }])) });
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes('/machines/') ? davisMachines : payload() }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const summary = () => container.querySelector('[aria-label="Machine availability"]');
  const values = () => [...summary().querySelectorAll('dd')].map(item => item.textContent);
  try {
    await act(async () => { root.render(<App />); });
    await assertions({ container, summary, values, setStatuses: async (next) => {
      current = next;
      const refresh = container.querySelector('button[aria-label="Refresh machine status"]');
      await act(async () => { refresh.click(); });
      await act(async () => { refresh.querySelector('svg').dispatchEvent(new Event('animationend', { bubbles: true })); });
    } });
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
}

const OFFLINE_ROOM = Array(8).fill('OFFLINE');

test('an all-offline room reports unavailable availability instead of zero free machines', async () => {
  await renderDavis(OFFLINE_ROOM, async ({ container, summary, values, setStatuses }) => {
    expect(values()).toEqual(['Availability unavailable · 4 Total', 'Availability unavailable · 4 Total']);
    expect(summary().textContent).not.toContain('Free');
    expect(summary().textContent).toContain('Last checked');
    expect(summary().textContent).not.toContain('Live');
    expect(summary().querySelector('time').dateTime).toBeTruthy();
    const notice = summary().previousElementSibling;
    expect(notice.textContent).toContain('All 8 machines are reporting offline.');
    expect(notice.querySelector('a[href="/status/"]')).not.toBeNull();
    expect(notice.querySelector('a[href="https://laundryconnectlive.com/live/loc_c578c6"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Notify me when a washer opens');
    expect(container.textContent).not.toContain('Notify me when a dryer opens');
    expect(container.querySelectorAll('[id^="machine-card-"]')).toHaveLength(8);
    expect(container.querySelector('#machine-card-1').textContent).toContain('Offline');

    // Recovery to usable statuses restores counts and eligible alerts.
    await setStatuses(['AVAILABLE', 'IN_USE', 'IN_USE', 'IN_USE', 'IN_USE', 'IN_USE', 'IN_USE', 'IN_USE']);
    expect(values()).toEqual(['1 Free / 4 Total', '0 Free / 4 Total', 'Next reported dryer finish in ~10 min · Dryer 5']);
    expect(summary().textContent).toContain('Live · Last updated');
    expect(container.textContent).not.toContain('reporting offline');
    expect(container.textContent).not.toContain('Notify me when a washer opens');
    expect(container.textContent).toContain('Notify me when a dryer opens');
  });
});

test('all-unknown and mixed nonreporting rooms keep the unavailable state', async () => {
  await renderDavis(Array(8).fill('SOMETHING_NEW'), async ({ container, summary, values, setStatuses }) => {
    expect(values()).toEqual(['Availability unavailable · 4 Total', 'Availability unavailable · 4 Total']);
    expect(summary().previousElementSibling.textContent).toContain('The provider returned no usable machine statuses.');
    await setStatuses(['OFFLINE', 'SOMETHING_NEW', 'OFFLINE', 'OFFLINE', 'OFFLINE', 'OFFLINE', 'SOMETHING_NEW', 'OFFLINE']);
    expect(values()).toEqual(['Availability unavailable · 4 Total', 'Availability unavailable · 4 Total']);
    expect(summary().previousElementSibling.textContent).toContain('The provider returned no usable machine statuses.');
    expect(container.textContent).not.toContain('Notify me when');
  });
});

test('partial reporting loss keeps known free counts per machine type', async () => {
  // Washers: two available, two offline. Dryers: all offline.
  await renderDavis(['AVAILABLE', 'DOOR_OPEN', 'OFFLINE', 'OFFLINE', 'OFFLINE', 'OFFLINE', 'OFFLINE', 'OFFLINE'], async ({ container, summary, values, setStatuses }) => {
    expect(values()).toEqual(['2 Free / 4 Total', '2 statuses unavailable', 'Availability unavailable · 4 Total']);
    expect(summary().textContent).toContain('Status unavailable for 6 machines. These aren’t counted as free or in use.');
    expect(summary().querySelector('a[href="/status/"]')).not.toBeNull();
    expect(summary().textContent).toContain('Live · Last updated');
    expect(container.textContent).not.toContain('Notify me when');

    // Washers all offline, dryers reporting normally and all running.
    await setStatuses(['OFFLINE', 'OFFLINE', 'OFFLINE', 'OFFLINE', 'IN_USE', 'IN_USE', 'IN_USE', 'IN_USE']);
    expect(values()).toEqual(['Availability unavailable · 4 Total', '0 Free / 4 Total', 'Next reported dryer finish in ~10 min · Dryer 5']);
    expect(container.textContent).not.toContain('Notify me when a washer opens');
    expect(container.textContent).toContain('Notify me when a dryer opens');

    // A running washer alongside an offline washer is not a confirmed full room.
    await setStatuses(['IN_USE', 'IN_USE', 'IN_USE', 'OFFLINE', 'COMPLETE', 'IN_USE', 'IN_USE', 'IN_USE']);
    expect(values()[0]).toBe('0 Free / 4 Total');
    expect(values()[1]).toBe('1 status unavailable');
    expect(container.textContent).not.toContain('Notify me when a washer opens');
    expect(container.textContent).not.toContain('Notify me when a dryer opens');
  });
});

test('genuinely full and out-of-order rooms keep known zero-free states', async () => {
  await renderDavis(['IN_USE', 'IN_USE', 'READY_TO_START', 'RESERVED', 'OUT_OF_ORDER', 'OUT_OF_ORDER', 'OUT_OF_ORDER', 'OUT_OF_ORDER'], async ({ container, summary, values }) => {
    expect(values()).toEqual(['0 Free / 4 Total', 'Next reported washer finish in ~10 min · Washer 1', '0 Free / 4 Total', 'All reported out of order']);
    expect(summary().textContent).not.toContain('Status unavailable');
    expect(summary().previousElementSibling.textContent).not.toContain('offline');
    expect(container.textContent).toContain('Notify me when a washer opens');
    expect(container.textContent).toContain('Notify me when a dryer opens');
  });
});

test('a stale saved snapshot keeps its label and offers no new room alerts', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.history.replaceState(null, '', '#room/davis-hall');
  localStorage.clear();
  const checkedAt = Date.now() - 30 * 60_000;
  localStorage.setItem('washAlertRoom-v2-davis', JSON.stringify({ checkedAt, machines: [
    { id: '1', number: '1', type: 'Washer', machineName: 'Washer 1', status: 'Offline', timeRemaining: 0 },
    { id: '5', number: '5', type: 'Dryer', machineName: 'Dryer 5', status: 'In Use', timeRemaining: 0 },
  ] }));
  global.fetch = jest.fn(async () => { throw new Error('Network down'); });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<App />); });
    const summary = container.querySelector('[aria-label="Machine availability"]');
    expect(container.textContent).toContain('Live refresh failed. Showing the last saved machine statuses.');
    expect([...summary.querySelectorAll('dd')].map(item => item.textContent)).toEqual(['Availability unavailable · 1 Total', '0 Free / 1 Total']);
    expect(summary.textContent).toContain('Saved snapshot');
    expect(summary.querySelector('time').dateTime).toBe(new Date(checkedAt).toISOString());
    expect(container.textContent).not.toContain('Notify me when');
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Peak Times and Room Layout headings keep their names separate from the disclosure state', async () => {
  await renderDavis(OFFLINE_ROOM, async ({ container }) => {
    for (const name of ['Peak Times', 'Room Layout']) {
      const heading = [...container.querySelectorAll('h2')].find(element => element.textContent.trim().startsWith(name));
      const button = heading.querySelector('button[aria-expanded]');
      const hidden = [...button.querySelectorAll('[aria-hidden="true"]')].filter(element => !element.matches('svg'));
      expect(hidden.map(element => element.textContent)).toEqual([button.getAttribute('aria-expanded') === 'true' ? 'Hide' : 'Show']);
      const visibleName = [...button.childNodes].filter(node => !node.matches?.('[aria-hidden="true"]')).map(node => node.textContent).join('').trim();
      expect(visibleName).toBe(name);
      const expanded = button.getAttribute('aria-expanded');
      await act(async () => { button.click(); });
      expect(button.getAttribute('aria-expanded')).toBe(expanded === 'true' ? 'false' : 'true');
    }
  });
});

test('the bundled room directory accepts known provider IDs and deep-link aliases', () => {
  expect(laundryRooms).toHaveLength(44);
  const liveRooms = laundryRooms.filter((room) => room.providerId);
  expect(new Set(liveRooms.map((room) => room.providerId)).size).toBe(43);
  expect(liveRooms).toHaveLength(44);
  expect(findLaundryRoom('12247').id).toBe('central_campus_6');
  expect(findLaundryRoom('ccrh 7').providerId).toBe('12247');
  expect(findLaundryRoom('12285')).toEqual(findLaundryRoom('wing-hall-1st-flr'));
  expect(roomLabel(findLaundryRoom('austin'))).toBe('Marsh and Austin Hall');
  expect(roomLabel(findLaundryRoom('cottage256'))).toBe('The Cottages · Cottage #256');
  expect(findLaundryRoom('Living%20%26%20Learning%20D140')).toMatchObject({ id: 'lll_d140' });
  expect(findLaundryRoom('university-heights-north-2')).toMatchObject({ id: 'uheightsn2', historyId: 'loc_fe37ab' });
  expect(roomLabel(findLaundryRoom('university-heights-north-2'))).toBe('University Heights North · Towers 2+3');
  expect(roomLabel(findLaundryRoom('uheightsn1'))).toBe('University Heights North · Tower 1');
  expect(roomLabel(findLaundryRoom('uheightss1'))).toBe('University Heights South · Tower 1');
  expect(roomLabel(findLaundryRoom('uheightss2'))).toBe('University Heights South · Towers 2+3');
  expect(laundryRooms.filter(room => room.displayName === 'CCRH').map(roomLabel))
    .toEqual([2, 3, 4, 5, 6, 7].map(floor => `CCRH · Floor ${floor}`));
  expect(laundryRooms.filter(room => room.id.startsWith('lll_')).map(roomLabel)).toEqual([
    'Living-Learning A · Room 140',
    'Living-Learning A · Room 180',
    'Living-Learning B · Room 110',
    'Living-Learning C · Room 131',
    'Living-Learning D · Room 110',
    'Living-Learning D · Room 140',
    'Living-Learning E · Room 110',
    'Living-Learning E · Room 160',
  ]);
  expect(roomLabel(findLaundryRoom('wing-hall-1st-flr'))).toBe('Wing Hall');
  expect(roomPath(findLaundryRoom('ccrh 7'))).toBe('#room/ccrh-floor-7');
  expect(new Set(laundryRooms.map(roomPath)).size).toBe(laundryRooms.length);
  for (const room of laundryRooms) {
    expect(findLaundryRoom(room.name.toLowerCase().replace(/\s+/g, '-'))).toBe(room);
    expect(findLaundryRoom(roomPath(room).slice(6))).toBe(room);
  }
  expect(new Set(laundryRooms.map(roomLabel)).size).toBe(laundryRooms.length);
});

test('opens the room directory without a network request', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  localStorage.setItem('uvmLaundryFavorites', '[]');
  const fetch = jest.fn();
  global.fetch = fetch;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => { root.render(<App />); });
    expect(container.textContent).toContain('All Laundry Rooms');
    expect(container.textContent).toContain('Wing Hall');
    expect(container.querySelector('a[href="/about/"]')).toBeNull();
    expect(container.textContent).not.toContain(informationDisclosure[0].trim());
    expect(document.title).toBe('UVM Laundry Tracker | UVM LaundryLink');
    expect(container.querySelector('.ll-campus-jump-heading').textContent).toBe('Campuses');
    expect(container.querySelectorAll('.ll-room-card__title')).toHaveLength(laundryRooms.length);
    expect(container.querySelectorAll('.ll-room-card')).toHaveLength(laundryRooms.length);
    expect(container.querySelectorAll('.ll-room-card__action')).toHaveLength(laundryRooms.length);
    const cottagesCard = [...container.querySelectorAll('.ll-room-card')]
      .find(card => card.querySelector('.ll-room-card__title').textContent === 'The Cottages');
    expect(cottagesCard.querySelector('.ll-room-card__location').textContent).toBe('Cottage #256');
    const campusGroup = container.querySelector('[aria-label="Jump to campus"]');
    const buttons = [...campusGroup.querySelectorAll('button')];
    expect(buttons.map(button => button.textContent)).toEqual(['Redstone', 'Athletic', 'Central', 'Trinity and North']);
    const cases = [
      ['redstone', 'Wing Hall', ['CWPSCR', 'MSH', 'WDW']],
      ['athletic', 'University Heights North', ['Harris-Millis', 'Living-Learning Complex', 'MAT', 'University Heights North Complex', 'University Heights South Complex']],
      ['central', 'CCRH', ['CCRH', 'Other Buildings']],
      ['north', 'The Cottages', ['The Back Five', 'Other Buildings']],
    ];
    for (const [index, button] of buttons.entries()) {
      const [expectedCampus, expectedExample, expectedGroups] = cases[index];
      expect(button.textContent).toBe(expectedCampus === 'north' ? 'Trinity and North' : expectedCampus[0].toUpperCase() + expectedCampus.slice(1));
      const campusSection = container.querySelector(`#campus-rooms-${expectedCampus}`);
      campusSection.scrollIntoView = jest.fn();
      await act(async () => { button.click(); });
      expect(document.activeElement).toBe(campusSection);
      expect(campusSection.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
      expect(container.querySelectorAll('.ll-campus-section')).toHaveLength(cases.length);
      expect(container.querySelectorAll('.ll-room-card__title')).toHaveLength(laundryRooms.length);
      expect([...campusSection.querySelectorAll('.ll-room-card__title')].some(heading => heading.textContent === expectedExample)).toBe(true);
      expect([...campusSection.querySelectorAll('.ll-complex-section__title')].map(heading => heading.textContent)).toEqual(expectedGroups);
    }
    await act(async () => { container.querySelector('.ll-favorites-toggle').click(); });
    expect(container.querySelector('.ll-empty-state p').textContent).toBe('No Favorite Rooms Yet');
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('room cards separate favorite and room controls accessibly', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn(async () => ({ ok: false }));
  window.history.replaceState(null, '', '/');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => { root.render(<App />); });
    const firstCard = container.querySelector('.ll-room-card');
    const favorite = firstCard.querySelector('.ll-room-card__favorite');
    const roomLink = firstCard.querySelector('.ll-room-card__title');
    expect(firstCard.querySelectorAll('a, button')).toHaveLength(2);
    expect(roomLink.getAttribute('href')).toBe('#room/christie-hall');
    expect(favorite.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { favorite.click(); });
    expect(favorite.getAttribute('aria-pressed')).toBe('true');
    expect(window.location.hash).toBe('');
    await act(async () => { roomLink.click(); });
    expect(window.location.hash).toBe('#room/christie-hall');
    expect(document.title).toBe('Christie Hall Laundry | UVM LaundryLink');
  } finally {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('room search matches directory names and announces full room labels on favorites', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn(async () => ({ ok: false }));
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<App />); });
    const search = container.querySelector('[aria-label="Search rooms"]');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [query, length, example] of [
      ['Trinity Campus', 9, 'Hunt Hall'], ['CWPSCR', 6, 'Christie Hall'],
      ['L&L', 8, 'Living-Learning A · Room 140'],
      ['UHS', 2, 'University Heights South · Towers 2+3'],
      ['CCRH 7', 1, 'CCRH · Floor 7'], ['Christie Hall', 1, 'Christie Hall'],
    ]) {
      await act(async () => {
        setValue.call(search, query);
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(container.querySelectorAll('.ll-room-card')).toHaveLength(length);
      expect(container.querySelector(`button[aria-label="Add ${example} to favorites"]`)).not.toBeNull();
    }
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('overlay navigation resets scroll and Back restores the original position', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.history.replaceState(null, '', '/');
  const initialScrollY = window.scrollY;
  window.scrollY = 450;
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<App />); });
    for (const label of ['Information', 'My Laundry', 'Settings']) {
      await act(async () => { container.querySelector(`header [aria-label="${label}"]`).click(); });
      expect(container.querySelector('main h1').textContent).toBe(label);
      expect(document.title).toBe(`${label} | UVM LaundryLink`);
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    }
    await act(async () => { const traversal = historyTraversal(); container.querySelector('main .ll-overlay-heading .ll-back-button').click(); await traversal; });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 450, behavior: 'instant' });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/');
    expect(document.title).toBe('UVM Laundry Tracker | UVM LaundryLink');
  } finally {
    act(() => root.unmount());
    container.remove();
    window.scrollY = initialScrollY;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Peak Times has one tab stop with keyboard navigation and activation', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<RoomPeakTimes room={findLaundryRoom('christie')} defaultOpen />); });
    const chart = container.querySelector('[role="grid"]');
    expect(chart.querySelectorAll('button')).toHaveLength(168);
    const first = chart.querySelector('button[tabindex="0"]');
    await act(async () => {
      first.focus();
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    const monday = chart.querySelector('[data-usage-cell="1-0"]');
    expect(document.activeElement).toBe(monday);
    expect([...chart.querySelectorAll('button[tabindex="0"]')]).toEqual([monday]);
    await act(async () => { monday.click(); });
    expect(container.querySelector('[role="status"]').textContent).toContain('Monday at 12 AM');
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('static-page header routes open the app overlays', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  localStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: false }));

  for (const [route, expectedText] of [
    ['my-laundry', 'My Laundry'],
    ['information', 'What if a machine will not start?'],
    ['settings', 'Settings'],
  ]) {
    window.history.replaceState(null, '', `/?view=${route}`);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => { root.render(<App />); });
      expect(container.textContent).toContain(expectedText);
      expect(container.querySelector('main h1').className).toBe('text-3xl lg:text-4xl font-bold');
      expect(window.location.search).toBe(route === 'information' ? '' : `?view=${route}`);
      if (route === 'information') {
        const informationHeader = container.querySelector('main h1').parentElement;
        expect(informationHeader.tagName).toBe('HEADER');
        expect(informationHeader.querySelector('.ll-back-button')).not.toBeNull();
        expect(container.textContent).toContain('Frequently Asked Questions');
        expect(container.textContent).toContain('How do I find my room?');
        expect(container.textContent).toContain('What should I bring?');
        expect(container.textContent).not.toContain('Know who to contact');
        expect(container.textContent).not.toContain('Laundry basics and video guides');
        const [aboutLink] = container.querySelectorAll('a[href="/about/"]');
        expect(container.querySelectorAll('a[href="/about/"]')).toHaveLength(1);
        expect(aboutLink.textContent).toBe(informationDisclosure[1].label);
        expect(aboutLink.parentElement.textContent).toBe(informationDisclosure[0] + informationDisclosure[1].label);
        expect(aboutLink.parentElement.parentElement.querySelector('h2').textContent).toBe('More Resources');
        expect(container.querySelector('a[href="/compare/"]')).not.toBeNull();
        expect(container.querySelector('a[href="/sitemap/"]')).not.toBeNull();
        expect(container.querySelector('a[href="/status/"]')).not.toBeNull();
        expect(Array.from(container.querySelectorAll('section li a:is([href="/compare/"], [href="/status/"], [href="/sitemap/"])'), (anchor) => anchor.textContent.trim()))
          .toEqual(['Site map', 'Service status', 'Compare trackers']);
      }
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  }

  localStorage.clear();
  window.history.replaceState(null, '', '/');
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('main views share the same back control', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: false }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const backButton = () => container.querySelector('main .ll-back-button');

  try {
    await act(async () => { root.render(<App />); });
    expect(container.querySelector('[aria-label="My Laundry"]').textContent.trim()).toBe('');
    expect(container.querySelector('footer')).toBeNull();
    await act(async () => { container.querySelector('[aria-label="Information"]').click(); });
    expect(backButton().textContent.trim()).toBe('Back');
    expect(container.textContent).toContain('What if a machine will not start?');
    expect(container.textContent).not.toContain('payment');
    await act(async () => { const traversal = historyTraversal(); backButton().click(); await traversal; });

    await act(async () => { container.querySelector('[aria-label="My Laundry"]').click(); });
    expect(backButton().textContent.trim()).toBe('Back');
    await act(async () => { const traversal = historyTraversal(); backButton().click(); await traversal; });

    await act(async () => { container.querySelector('[aria-label="Settings"]').click(); });
    expect(backButton().textContent.trim()).toBe('Back');
    const rememberRoomToggle = container.querySelector('#rememberRoomToggle');
    expect(rememberRoomToggle.getAttribute('role')).toBe('switch');
    expect(rememberRoomToggle.labels[0].textContent).toBe('Open my last room on startup');
    const roomPreferences = rememberRoomToggle.closest('section');
    expect(roomPreferences.querySelector('h2').textContent).toBe('Room Preferences');
    expect(roomPreferences.querySelector('#visualLayoutToggle').getAttribute('aria-checked')).toBe('true');
    expect(roomPreferences.querySelector('#peakTimesToggle').getAttribute('aria-checked')).toBe('false');
    expect(rememberRoomToggle.getAttribute('aria-checked')).toBe('false');
    await act(async () => { rememberRoomToggle.click(); });
    expect(rememberRoomToggle.getAttribute('aria-checked')).toBe('true');
    expect(localStorage.getItem('uvmLaundryRememberRoom')).toBe('true');
    await act(async () => { const traversal = historyTraversal(); backButton().click(); await traversal; });

    await act(async () => { container.querySelector('.ll-room-card__title').click(); });
    expect(backButton().textContent.trim()).toBe('All Rooms');
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});


test('CCRH uses the shared feed and selects only the machines assigned to each floor', () => {
  const floor6 = findLaundryRoom('ccrh 6');
  const floor7 = findLaundryRoom('ccrh 7');
  const machines = Array.from({ length: 20 }, (_, index) => ({ number: String(index + 44) }));
  expect(filterRoomMachines(floor6, machines).map(machine => Number(machine.number)))
    .toEqual(Array.from({ length: 11 }, (_, index) => index + 45));
  expect(filterRoomMachines(floor7, machines).map(machine => Number(machine.number)))
    .toEqual(Array.from({ length: 7 }, (_, index) => index + 56));
  expect(getRoomHistoryId(floor6)).toBe(getRoomHistoryId(floor7));
});

test('switching CCRH floors excludes the legacy combined cache and saves each floor separately', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.history.replaceState(null, '', '#room/central-campus-flr-6');
  localStorage.clear();
  localStorage.setItem('washAlertRoom-12247', JSON.stringify({
    checkedAt: Date.now(),
    machines: [{ id: '1', type: 'Dryer', machineName: 'Dryer 79', status: 'Available' }],
  }));
  const metadata = [45, 55, 56, 62].map((number) => ({
    id: String(number), machineNumber: String(number).padStart(4, '0'), washAlertIsVisible: true,
    machineType: { isWasher: number < 50 || number === 56, isDryer: number === 55 || number === 62 },
  }));
  const payload = { room: { id: 12247 }, machines: Object.fromEntries(
    metadata.map(({ id }) => [id, {
      statusId: ({ 45: 'COMPLETE', 55: 'DOOR_OPEN', 56: 'IN_USE', 62: 'AVAILABLE' })[id],
      remainingSeconds: 360,
      createdAt: new Date().toISOString(),
    }])
  ) };
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes('/machines/') ? metadata : payload }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => { root.render(<App />); });
    const cards = () => [...container.querySelectorAll('[id^="machine-card-"] h3')].map(node => node.textContent);
    expect(cards()).toEqual(['Washer 45', 'Dryer 55']);
    expect(document.title).toBe('CCRH · Floor 6 Laundry | UVM LaundryLink');
    expect(container.querySelector('#machine-card-45').textContent).toContain('May still contain laundry');
    expect(container.querySelector('button[aria-label="Washer 45 · Cycle Finished"]').title).toBe('Washer 45 · Cycle Finished');
    expect(window.location.hash).toBe('#room/ccrh-floor-6');
    expect(container.textContent).not.toContain('Notify me when a washer opens');
    expect(container.querySelector('main h1').textContent).toContain('CCRH');
    const header = container.querySelector('.ll-room-header');
    const switcher = header.querySelector('#room-switcher');
    expect(switcher.getAttribute('aria-label')).toBe('Switch room: CCRH · Floor 6');
    expect(header.querySelector('a, select')).toBeNull();
    expect([...container.querySelectorAll('[aria-label="Machine availability"] dt')].map(item => item.textContent)).toEqual(['Washers', 'Dryers']);
    expect([...container.querySelectorAll('[aria-label="Machine availability"] dd')].map(item => item.textContent)).toEqual(['1 Free / 1 Total', '1 Free / 1 Total']);
    expect(container.textContent).not.toContain('Notify me when a dryer opens');
    await act(async () => { switcher.click(); });
    const roomOptions = [...header.querySelectorAll('[role="option"]')];
    expect(roomOptions.slice(0, 3).map(option => option.textContent)).toEqual(['Christie Hall', 'Wright Hall', 'Patterson Hall']);
    expect(roomOptions.find(option => option.textContent === 'The Cottages · Cottage #256')
      .closest('[role="group"]').getAttribute('aria-label')).toBe('Trinity and North Campuses · Other Buildings');
    expect(roomOptions.find(option => option.getAttribute('aria-selected') === 'true').textContent).toBe('CCRH · Floor 6');
    await act(async () => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.activeElement).toBe(switcher);

    await act(async () => { switcher.click(); });
    // A tap can blur the selected option before it dispatches a click on the trigger.
    await act(async () => { document.activeElement.blur(); });
    await act(async () => { switcher.click(); });
    expect(switcher.getAttribute('aria-expanded')).toBe('false');

    const availability = container.querySelector('[aria-label="Machine availability"]');
    expect(availability.nextElementSibling.querySelector('h2').textContent).toContain('Peak Times');
    expect(availability.querySelector('time').dateTime).toBeTruthy();
    expect(container.querySelector('#search, #statusFilter')).toBeNull();

    await act(async () => {
      window.history.replaceState(null, '', '#room/central-campus-flr-7?machine=62');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(cards()).toEqual(['Washer 56', 'Dryer 62']);
    expect(document.title).toBe('CCRH · Floor 7 Laundry | UVM LaundryLink');
    expect(window.location.hash).toBe('#room/ccrh-floor-7?machine=62');
    expect(container.textContent).toContain('Notify me when a washer opens');
    expect(document.activeElement.id).toBe('machine-card-62');
    const nextWasher = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Notify me when a washer opens'));
    const nextWasherDialog = container.querySelector('dialog[aria-label="Next available washer"]');
    nextWasherDialog.showModal = jest.fn();
    await act(async () => { nextWasher.click(); });
    expect(nextWasherDialog.showModal).toHaveBeenCalledTimes(1);
    const focus = jest.spyOn(nextWasher, 'focus');
    await act(async () => { nextWasherDialog.dispatchEvent(new Event('close', { bubbles: true })); });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(nextWasher);
    const summary = container.querySelector('[aria-label="Machine availability"]');
    expect(summary.textContent).toContain('Next reported washer finish in ~6 min');
    expect(summary.textContent).not.toContain('Next reported dryer finish');
    const finishLink = summary.querySelector('a');
    expect(finishLink.getAttribute('href')).toBe('#room/ccrh-floor-7?machine=56');
    await act(async () => { finishLink.click(); });
    expect(document.activeElement.id).toBe('machine-card-56');
    expect(container.querySelectorAll('a[aria-label^="Link to "]')).toHaveLength(0);
    expect(container.querySelector('main h1').textContent).toContain('CCRH');
    expect(switcher.getAttribute('aria-label')).toBe('Switch room: CCRH · Floor 7');
    const snapshot = (floor) => JSON.parse(localStorage.getItem(`washAlertRoom-v2-central_campus_${floor}`));
    expect(snapshot(6).machines.map(({ number }) => Number(number)).sort()).toEqual([45, 55]);
    expect(snapshot(7).machines.map(({ number }) => Number(number)).sort()).toEqual([56, 62]);
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});


test('text and email setup uses the vendor embed and keeps the selected CCRH floor in the alert dialog', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const originalShowModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    const room = findLaundryRoom('ccrh 7');
    await act(async () => {
      root.render(<MachineReport machine={{ id: '99', machineName: 'Washer 56' }} room={room} canSetAlert />);
    });
    await act(async () => { container.querySelector('[aria-label="Set Cycle Alert for Washer 56"]').click(); });
    const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent.trim() === 'Text or Email Alert');
    await act(async () => { button.click(); });
    expect(container.querySelector('.ll-back-button').textContent.trim()).toBe('Back to push alerts');
    expect(container.querySelector('iframe').getAttribute('src')).toBe('https://laundryconnectlive.com/live/loc_44963c?embed=1');
    expect(container.querySelector('dialog').textContent).toContain('CCRH · Floor 7 · Washer 56');
    expect(container.querySelector('dialog').textContent).toContain('choose Text or Email');
    const fallback = container.querySelector('dialog a');
    expect(fallback.textContent.trim()).toBe('Open LaundryConnect in a new tab');
    expect(fallback.getAttribute('href')).toBe('https://laundryconnectlive.com/live/loc_44963c');
    expect(fallback.getAttribute('target')).toBe('_blank');
    await act(async () => { container.querySelector('.ll-back-button').click(); });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('dialog a')).toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
    if (originalShowModal) HTMLDialogElement.prototype.showModal = originalShowModal;
    else delete HTMLDialogElement.prototype.showModal;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});


test('the bundled collapsed guidance matches the full historical snapshot', () => {
  expect(guidance).toEqual(quieterWindows(snapshot.rooms));
});

test('quiet guidance requires a recurring signal and sufficient history', () => {
  const grid = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, (_, hour) => hour >= 9 && hour < 12 ? 10 : 45)
  );
  expect(quieterWindow(grid)).toBe('9 AM–12 PM');
  expect(quieterWindow(grid.map((row) => row.map(() => 10)))).toBeNull();
  expect(quieterWindow(grid.map((row, day) => day < 3 ? row : row.map(() => null)))).toBeNull();
});

test('favorite counts distinguish CCRH floors that share a provider feed', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  localStorage.setItem('uvmLaundryFavorites', JSON.stringify(['central_campus_6', 'central_campus_7', 'christie', 'davis']));
  const metadata = [45, 56, 62].map((id) => ({
    id, machineNumber: id, washAlertIsVisible: true,
    machineType: { isWasher: id !== 62, isDryer: id === 62 },
  }));
  const payload = { room: { id: 12247 }, machines: {
    45: { statusId: 'AVAILABLE' }, 56: { statusId: 'IN_USE' }, 62: { statusId: 'AVAILABLE' },
  } };
  const christie = findLaundryRoom('christie');
  global.fetch = jest.fn(async (url) => ({
    ok: true,
    json: async () => url.endsWith('/machines/12254') ? davisMachines.filter(({ id }) => id === 1 || id === 5)
      : url.includes('/machines/') ? metadata
      : url.endsWith('/12247') ? payload
        : url.endsWith('/12254') ? { room: { id: 12254 }, machines: { 1: { statusId: 'OFFLINE' }, 5: { statusId: 'IN_USE' } } }
          : { room: { id: christie.providerId }, machines: { 45: { statusId: 'UNKNOWN' } } },
  }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<App />); });
    const card = (floor) => [...container.querySelectorAll('.ll-room-card')]
      .find((element) => element.textContent.includes(`Floor ${floor}`) && element.textContent.includes('CCRH'));
    expect(card(6).textContent).toContain('1 washer free · 0 dryers free');
    expect(card(7).textContent).toContain('0 washers free · 1 dryer free');
    const christieCard = container.querySelector('[aria-label="Remove Christie Hall from favorites"]').closest('article');
    expect(christieCard.textContent).toContain('All machine statuses are unknown');
    expect(christieCard.textContent).not.toContain('0 washers free');
    const davisCard = container.querySelector('[aria-label="Remove Davis Hall from favorites"]').closest('article');
    expect(davisCard.textContent).toContain('Washer availability unavailable · 0 dryers free');
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('My Laundry loads legacy alerts, shows their machine links and cancels through the alert service', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  const roomId = 'central_campus_7';
  const key = `uvmLaundryPushAlert-${roomId}-56`;
  const id = '00000000-0000-0000-0000-000000000056';
  localStorage.setItem(key, JSON.stringify({ id, expiresAt: Date.now() + 60_000, leadMinutes: 5 }));
  global.fetch = jest.fn(async (url) => {
    let body;
    if (url.endsWith('/alerts/status')) body = { statuses: [{ active: true, machineName: 'Washer 56' }] };
    else if (url.endsWith('/alerts/cancel')) body = { cancelled: true };
    else if (url.includes('/machines/')) body = [{
      id: 56, machineNumber: 56, washAlertIsVisible: true, machineType: { isWasher: true },
    }];
    else body = { room: { id: 12247 }, machines: { 56: { statusId: 'IN_USE', remainingSeconds: 180 } } };
    return { ok: true, json: async () => body };
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<App />); });
    await act(async () => { container.querySelector('[aria-label="My Laundry"]').click(); });
    const header = container.querySelector('main h1').parentElement;
    expect(header.tagName).toBe('HEADER');
    expect(header.querySelector('.ll-back-button')).not.toBeNull();
    const machineLink = container.querySelector('main a');
    expect(machineLink.textContent).toBe('Washer 56');
    expect(machineLink.getAttribute('href')).toBe('#room/ccrh-floor-7?machine=56');
    expect(container.textContent).toContain('CCRH · Floor 7 · About 3 min left');
    await act(async () => { machineLink.click(); });
    expect(document.activeElement.id).toBe('machine-card-56');
    await act(async () => { container.querySelector('[aria-label="My Laundry"]').click(); });
    await act(async () => { container.querySelector('[aria-label="Cancel alert for Washer 56"]').click(); });
    expect(JSON.parse(global.fetch.mock.calls.find(([url]) => url.endsWith('/alerts/cancel'))[1].body)).toEqual({ roomId, id });
    expect(localStorage.getItem(key)).toBeNull();
    expect(container.textContent).toContain('No active push alerts. Set one on a running machine or when a room has no free washers or dryers.');
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Peak Times shows bundled guidance immediately and keeps one recommendation when expanded', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const room = findLaundryRoom('ccrh 7');
  const originalFetch = global.fetch;
  global.fetch = jest.fn();

  try {
    await act(async () => { root.render(<RoomPeakTimes room={room} />); });
    const toggle = container.querySelector('h2 button');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).toMatch(/Usually quieter daytime window: .+\(Burlington time\)/);
    expect(container.textContent).toContain('one usage history for CCRH Floors 6 and 7');
    expect(container.querySelector('[role="grid"]')).toBeNull();

    await act(async () => { toggle.click(); });
    expect(container.textContent.match(/Usually quieter/g)).toHaveLength(1);
    const firstCell = container.querySelector('[data-usage-cell="0-0"]');
    await act(async () => {
      firstCell.focus();
      firstCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(document.activeElement.getAttribute('data-usage-cell')).toBe('0-1');

    await act(async () => { root.render(<RoomPeakTimes key="missing" room={{ id: 'missing' }} defaultOpen />); });
    expect(container.querySelector('h2 button').getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Historical usage is unavailable');
    expect(container.textContent).not.toContain('Usually quieter');
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test.each([true, false])('combined reporting keeps native navigation with clipboard success=%s', async (success) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const originalShowModal = HTMLDialogElement.prototype.showModal;
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  const writeText = jest.fn(async () => {
    if (!success) throw new Error('Clipboard access denied');
  });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    const room = findLaundryRoom('ccrh 7');
    await act(async () => {
      root.render(<MachineReport machine={{ id: '99', machineName: 'Washer 56' }} room={room} />);
    });
    await act(async () => { container.querySelector('[aria-label="Report Washer 56"]').click(); });
    expect(writeText).not.toHaveBeenCalled();
    const [combined, direct, service] = [...container.querySelectorAll('dialog a')];
    expect(combined.textContent).toContain('Copy Details & Open Reporting');
    expect(combined.href).toBe('https://laundryconnectlive.com/live/loc_44963c');
    expect(combined.getAttribute('rel')).toBe('noopener noreferrer');
    expect(combined.target).toBe('_blank');
    expect(direct.href).toBe(combined.href);
    expect(service.href).toBe('https://automaticlaundry.com/request-service/');
    expect(container.textContent).toContain('lists CCRH Floors 6 and 7 together under Floor 6');
    await act(async () => {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      expect(combined.dispatchEvent(click)).toBe(true);
      expect(writeText).toHaveBeenCalledWith('University of Vermont · CCRH · Floor 7 · Washer 56');
    });
    expect(container.querySelector('[role="status"]').textContent).toMatch(success ? /details copied/ : /couldn’t be copied/);
    const copyButton = [...container.querySelectorAll('dialog button')].find(item => item.textContent === 'Copy Machine Details');
    await act(async () => { copyButton.click(); });
    expect(writeText).toHaveBeenCalledTimes(2);
  } finally {
    act(() => root.unmount());
    container.remove();
    if (originalShowModal) HTMLDialogElement.prototype.showModal = originalShowModal;
    else delete HTMLDialogElement.prototype.showModal;
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete navigator.clipboard;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

async function withApp(url, run, { state = null, setup } = {}) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  localStorage.clear();
  setup?.();
  window.history.replaceState(state, '', url);
  global.fetch = jest.fn(async (request) => ({
    ok: true,
    json: async () => request.includes('/machines/') ? davisMachines
      : request.endsWith('/alerts/status') ? { statuses: [{ active: true, machineName: 'Dryer 5' }] }
        : { room: { id: 12254 }, machines: Object.fromEntries(davisMachines.map(({ id }) => [id, { statusId: 'IN_USE', remainingSeconds: 600 }])) },
  }));
  const container = document.body.appendChild(document.createElement('div'));
  let root = createRoot(container);
  const render = async () => { await act(async () => { root.render(<App />); }); };
  const reload = async () => {
    act(() => root.unmount());
    root = createRoot(container);
    await render();
  };
  const heading = () => container.querySelector('main h1')?.textContent;
  const address = () => window.location.pathname + window.location.search + window.location.hash;
  const click = async (element, traverses = false) => {
    const traversal = traverses && historyTraversal();
    await act(async () => { element.click(); await traversal; });
  };
  const traverse = async (direction) => {
    const traversal = historyTraversal();
    await act(async () => { window.history[direction](); await traversal; });
  };
  const back = () => container.querySelector('main .ll-overlay-heading .ll-back-button');
  try {
    await render();
    await run({ container, heading, address, reload, click, traverse, back });
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
}

test('Settings and My Laundry URLs open directly and survive a refresh', async () => {
  for (const [route, title] of [['settings', 'Settings'], ['my-laundry', 'My Laundry']]) {
    await withApp(`/?view=${route}`, async ({ heading, address, reload, click, back }) => {
      expect(heading()).toBe(title);
      expect(address()).toBe(`/?view=${route}`);
      expect(document.title).toBe(`${title} | UVM LaundryLink`);
      await reload();
      expect(heading()).toBe(title);
      expect(address()).toBe(`/?view=${route}`);
      // Opened directly, so Back stays in LaundryLink and returns to the directory.
      await click(back());
      expect(heading()).toBe('All Laundry Rooms');
      expect(address()).toBe('/');
    });
  }
});

test('utility views opened from Home keep their URL through Back and Forward', async () => {
  await withApp('/', async ({ container, heading, address, click, traverse, back }) => {
    const search = container.querySelector('input[aria-label="Search rooms"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'Davis');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(container.querySelector('header [aria-label="Settings"]'));
    expect(heading()).toBe('Settings');
    expect(address()).toBe('/?view=settings');
    await traverse('back');
    expect(heading()).toBe('All Laundry Rooms');
    expect(address()).toBe('/');
    expect(container.querySelector('input[aria-label="Search rooms"]').value).toBe('Davis');
    await traverse('forward');
    expect(heading()).toBe('Settings');
    expect(address()).toBe('/?view=settings');
    // Switching utility views replaces the entry, so one Back returns home.
    await click(container.querySelector('header [aria-label="My Laundry"]'));
    expect(address()).toBe('/?view=my-laundry');
    await click(container.querySelector('header [aria-label="Information"]'));
    expect(heading()).toBe('Information');
    expect(address()).toBe('/');
    await click(container.querySelector('header [aria-label="My Laundry"]'));
    await click(back(), true);
    expect(heading()).toBe('All Laundry Rooms');
    expect(address()).toBe('/');
    await click(container.querySelector('header [aria-label="My Laundry"]'));
    await click(container.querySelector('header [aria-label="UVM LaundryLink home"]'));
    expect(heading()).toBe('All Laundry Rooms');
    expect(address()).toBe('/');
  });
});

test('utility views opened from a room return to that room, including after a refresh', async () => {
  await withApp('/#room/davis-hall', async ({ container, heading, address, reload, click, traverse, back }) => {
    expect(heading()).toContain('Davis Hall');
    await click(container.querySelector('header [aria-label="My Laundry"]'));
    expect(address()).toBe('/?view=my-laundry');
    await click(back(), true);
    expect(heading()).toContain('Davis Hall');
    expect(address()).toBe('/#room/davis-hall');
    await traverse('forward');
    expect(heading()).toBe('My Laundry');
    await traverse('back');
    expect(heading()).toContain('Davis Hall');

    await click(container.querySelector('header [aria-label="Settings"]'));
    expect(address()).toBe('/?view=settings');
    await reload();
    expect(heading()).toBe('Settings');
    expect(address()).toBe('/?view=settings');
    await click(back());
    expect(heading()).toContain('Davis Hall');
    expect(address()).toBe('/#room/davis-hall');
  });
});

test('utility URLs take precedence over the last-room startup preference', async () => {
  const rememberRoom = () => {
    localStorage.setItem('uvmLaundryRememberRoom', 'true');
    localStorage.setItem('uvmLaundryLastRoom', JSON.stringify('davis'));
  };
  await withApp('/?view=settings', async ({ heading, address, click, back, container }) => {
    expect(heading()).toBe('Settings');
    expect(address()).toBe('/?view=settings');
    expect(container.querySelector('#rememberRoomToggle').getAttribute('aria-checked')).toBe('true');
    await click(back());
    expect(heading()).toBe('All Laundry Rooms');
  }, { setup: rememberRoom });
  await withApp('/', async ({ heading, address }) => {
    expect(heading()).toContain('Davis Hall');
    expect(address()).toBe('/#room/davis-hall');
  }, { setup: rememberRoom });
  await withApp('/?view=settings#room/davis-hall?machine=5', async ({ heading, address }) => {
    expect(heading()).toContain('Davis Hall');
    expect(address()).toBe('/#room/davis-hall?machine=5');
  });
});

test('My Laundry links leave the utility URL and saved alerts remain after a refresh', async () => {
  const alertKey = 'uvmLaundryPushAlert-davis-5';
  const id = '00000000-0000-0000-0000-000000000005';
  await withApp('/?view=my-laundry', async ({ container, heading, address, reload, click, traverse }) => {
    expect(container.textContent).toContain('Dryer 5');
    await reload();
    const machineLink = [...container.querySelectorAll('main a')].find(link => link.textContent === 'Dryer 5');
    expect(machineLink.getAttribute('href')).toBe('#room/davis-hall?machine=5');
    await click(machineLink);
    expect(heading()).toContain('Davis Hall');
    expect(address()).toBe('/#room/davis-hall?machine=5');
    expect(document.activeElement.id).toBe('machine-card-5');
    await traverse('back');
    expect(heading()).toBe('My Laundry');
    expect(address()).toBe('/?view=my-laundry');
    expect(JSON.parse(localStorage.getItem(alertKey)).id).toBe(id);
  }, { setup: () => localStorage.setItem(alertKey, JSON.stringify({ id, expiresAt: Date.now() + 60_000, leadMinutes: 0 })) });
});
