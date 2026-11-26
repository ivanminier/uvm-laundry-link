import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MachineReport } from './MachineReport';
import { filterRoomMachines, findLaundryRoom, getRoomHistoryId, laundryRooms, normalizeRoomStatus, roomLabel, roomPath } from './laundryData';

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

test('the bundled room directory accepts known provider IDs and deep-link aliases', () => {
  expect(laundryRooms).toHaveLength(44);
  const liveRooms = laundryRooms.filter((room) => room.providerId);
  expect(new Set(liveRooms.map((room) => room.providerId)).size).toBe(43);
  expect(liveRooms).toHaveLength(44);
  expect(findLaundryRoom('12247').id).toBe('central_campus_6');
  expect(findLaundryRoom('ccrh 7').providerId).toBe('12247');
  expect(findLaundryRoom('12285')).toEqual(findLaundryRoom('wing-hall-1st-flr'));
  expect(findLaundryRoom('Living%20%26%20Learning%20D140')).toMatchObject({ id: 'lll_d140' });
  expect(findLaundryRoom('university-heights-north-2')).toMatchObject({ id: 'uheightsn2', historyId: 'loc_fe37ab' });
  expect(roomLabel(findLaundryRoom('university-heights-north-2'))).toBe('UHeights North · Machines 13–27');
  expect(roomLabel(findLaundryRoom('L/L D140'))).toBe('L/L D140');
  expect(roomLabel(findLaundryRoom('wing-hall-1st-flr'))).toBe('Wing Hall');
  expect(roomPath(findLaundryRoom('ccrh 7'))).toBe('#room/central-campus-flr-7');
  expect(new Set(laundryRooms.map(roomLabel)).size).toBe(laundryRooms.length);
});

test('opens the room directory without a network request', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  const fetch = jest.fn();
  global.fetch = fetch;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => { root.render(<App />); });
    expect(container.textContent).toContain('All Laundry Rooms');
    expect(container.textContent).toContain('Wing Hall');
    expect(container.querySelectorAll('h3')).toHaveLength(laundryRooms.length);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
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
    metadata.map(({ id }) => [id, { statusId: 'AVAILABLE' }])
  ) };
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes('/machines/') ? metadata : payload }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => { root.render(<App />); });
    const cards = () => [...container.querySelectorAll('[id^="machine-card-"] h3')].map(node => node.textContent);
    expect(cards()).toEqual(['Washer 45', 'Dryer 55']);
    expect(container.querySelector('main h2').textContent).toBe('CCRH');
    expect(container.querySelector('#room-switcher').selectedOptions[0].textContent).toBe('CCRH · Machines 45–55');
    expect(container.querySelector('#room-switcher option[value="cottage256"]').textContent).toBe('The Cottages');

    await act(async () => {
      window.history.replaceState(null, '', '#room/central-campus-flr-7');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(cards()).toEqual(['Washer 56', 'Dryer 62']);
    expect(container.querySelector('main h2').textContent).toBe('CCRH');
    expect(container.querySelector('#room-switcher').selectedOptions[0].textContent).toBe('CCRH · Machines 56–62');
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


test('SMS setup uses the vendor embed and keeps the selected CCRH floor in the alert dialog', async () => {
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
    const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent.trim() === 'Set Text Alert');
    await act(async () => { button.click(); });
    expect(container.querySelector('iframe').getAttribute('src')).toBe('https://laundryconnectlive.com/live/loc_44963c?embed=1');
    expect(container.querySelector('dialog').textContent).toContain('CCRH · Washer 56');
    expect(container.querySelector('dialog').textContent).toContain('choose Text');
  } finally {
    act(() => root.unmount());
    container.remove();
    if (originalShowModal) HTMLDialogElement.prototype.showModal = originalShowModal;
    else delete HTMLDialogElement.prototype.showModal;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
