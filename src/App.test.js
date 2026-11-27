import { act } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { MachineReport } from './MachineReport';
import { quieterWindow, RoomPeakTimes } from './RoomPeakTimes';
import { canWatchNextMachine, filterRoomMachines, findLaundryRoom, getRoomHistoryId, laundryRooms, normalizeRoomStatus, roomLabel, roomPath } from './laundryData';

beforeEach(() => jest.spyOn(window, 'scrollTo').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

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
    expect(container.querySelector('.ll-home-hero').textContent).not.toContain('Independent student project');
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
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    }
    await act(async () => { container.querySelector('main .ll-overlay-heading .ll-back-button').click(); });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 450, behavior: 'instant' });
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
      expect(window.location.search).toBe('');
      if (route === 'information') {
        const informationHeader = container.querySelector('main h1').parentElement;
        expect(informationHeader.tagName).toBe('HEADER');
        expect(informationHeader.querySelector('.ll-back-button')).not.toBeNull();
        expect(container.textContent).toContain('Frequently Asked Questions');
        expect(container.textContent).toContain('How do I find my room?');
        expect(container.textContent).toContain('What should I bring?');
        expect(container.textContent).not.toContain('Know who to contact');
        expect(container.textContent).not.toContain('Laundry basics and video guides');
        expect(container.querySelector('a[href="/about/"]')).not.toBeNull();
        expect(container.querySelector('a[href="/compare/"]')).not.toBeNull();
        expect(container.querySelector('a[href="/sitemap/"]')).not.toBeNull();
        expect(container.querySelector('a[href="/status/"]')).not.toBeNull();
        expect(Array.from(container.querySelectorAll('section li a:is([href="/about/"], [href="/compare/"], [href="/status/"], [href="/sitemap/"])'), (anchor) => anchor.textContent.trim()))
          .toEqual(['About UVM LaundryLink', 'Compare trackers', 'Service status', 'Site map']);
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
    await act(async () => { backButton().click(); });

    await act(async () => { container.querySelector('[aria-label="My Laundry"]').click(); });
    expect(backButton().textContent.trim()).toBe('Back');
    await act(async () => { backButton().click(); });

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
    await act(async () => { backButton().click(); });

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
    metadata.map(({ id }) => [id, { statusId: ({ 45: 'COMPLETE', 55: 'DOOR_OPEN', 56: 'IN_USE', 62: 'AVAILABLE' })[id] }])
  ) };
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes('/machines/') ? metadata : payload }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => { root.render(<App />); });
    const cards = () => [...container.querySelectorAll('[id^="machine-card-"] h3')].map(node => node.textContent);
    expect(cards()).toEqual(['Washer 45', 'Dryer 55']);
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
    expect(window.location.hash).toBe('#room/ccrh-floor-7?machine=62');
    expect(container.textContent).toContain('Notify me when a washer opens');
    expect(document.activeElement.id).toBe('machine-card-62');
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
  localStorage.setItem('uvmLaundryFavorites', JSON.stringify(['central_campus_6', 'central_campus_7', 'christie']));
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
    json: async () => url.includes('/machines/') ? metadata
      : url.endsWith('/12247') ? payload : { room: { id: christie.providerId }, machines: { 45: { statusId: 'UNKNOWN' } } },
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
