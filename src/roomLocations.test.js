import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import rooms from './laundryRooms.json';
import { coverageNote, locationLine, roomLocations, sharedFacilities } from './roomLocations.mjs';
import { hallGuidePath, roomPath } from './roomLinks.mjs';

const catalog = (name) => JSON.parse(readFileSync(new URL(`../alerts/${name}.json`, `file://${__filename}`)));

test('every tracker has one location record with string room numbers and leading zeroes', () => {
  expect(Object.keys(roomLocations).sort()).toEqual(rooms.map(({ id }) => id).sort());
  const numbers = Object.values(roomLocations).flatMap(({ rooms: roomNumbers }) => roomNumbers);
  expect(numbers).toHaveLength(46);
  expect(numbers.every((number) => typeof number === 'string' && /^\d{3}[A-Z]?$/.test(number))).toBe(true);
  expect(roomLocations.harris.rooms).toEqual(['030', '031']);
  expect(roomLocations.millis.rooms).toEqual(['014', '015']);
  expect([roomLocations.christie, roomLocations.slade, roomLocations.coolidge, roomLocations.austin, roomLocations.tupper,
    roomLocations.mcauley, roomLocations.mercy, roomLocations.uheightsn1, roomLocations.uheightss1].map(({ rooms: [number] }) => number))
    .toEqual(['013', '004', '004', '012', '006', '017', '009D', '010', '005']);
  expect(roomLocations.simpson).toMatchObject({ floor: 'Ground floor', rooms: ['201G'] });
  expect(locationLine(rooms.find(({ id }) => id === 'simpson'))).toBe('Ground floor · Room 201G');
  expect(locationLine(rooms.find(({ id }) => id === 'harris'))).toBe('Basement · Rooms 030 and 031');
  expect(locationLine(rooms.find(({ id }) => id === 'central_campus_6'))).toBe('Floor 6 · Room 601');
  expect(locationLine(rooms.find(({ id }) => id === 'central_campus_7'))).toBe('Floor 7 · Room 701');
  expect(locationLine(rooms.find(({ id }) => id === 'austin'))).toBe('Austin Hall basement · Room 012');
});

test('multi-room halls keep separate records and machine counts match the bundled catalogs', () => {
  const washers = catalog('room-washers');
  const dryers = catalog('room-dryers');
  for (const room of rooms) {
    expect([room.id, roomLocations[room.id].washers, roomLocations[room.id].dryers])
      .toEqual([room.id, washers[room.id].length, dryers[room.id].length]);
  }
  const total = (key) => Object.values(roomLocations).reduce((sum, location) => sum + location[key], 0);
  expect([total('washers'), total('dryers')]).toEqual([169, 185]);
  expect(Object.keys(roomLocations).filter((id) => id.startsWith('lll_'))).toHaveLength(8);
  expect(new Set(['uheightsn1', 'uheightsn2', 'uheightss1', 'uheightss2'].map((id) => roomLocations[id].rooms[0])).size).toBe(4);
  expect(new Set(rooms.map(hallGuidePath)).size).toBe(30);
});

test('access notes stay qualified, never call a room public, and keep McAuley out of the Back Five', () => {
  const text = JSON.stringify({ roomLocations, sharedFacilities, coverageNote });
  expect(text).not.toMatch(/public/i);
  expect(sharedFacilities.backFive).not.toMatch(/McAuley/);
  expect(sharedFacilities.cwpscr).toMatch(/authorized residents/);
  expect(text).not.toMatch(/\?view=/);
  expect(coverageNote).toMatch(/Hillel.*202B/);
  expect(coverageNote).not.toMatch(/will|future|soon/i);
});

test('the live tracker shows the room location and hall guide link below the heading', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.scrollTo = jest.fn();
  localStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: false }));
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    for (const [id, line, guide] of [
      ['simpson', 'Ground floor · Room 201G', '/residence-halls/simpson-hall/'],
      ['harris', 'Basement · Rooms 030 and 031', '/residence-halls/harris-hall/'],
      ['central_campus_7', 'Floor 7 · Room 701', '/residence-halls/central-campus-residence-hall/'],
    ]) {
      const room = rooms.find((candidate) => candidate.id === id);
      window.history.replaceState(null, '', '/' + roomPath(room));
      await act(async () => { root.render(<App key={id} />); });
      const header = container.querySelector('.ll-room-header');
      const location = header.nextElementSibling;
      expect(location.className).toBe('ll-room-location');
      expect(location.textContent).toBe(`${line} · Hall guide`);
      expect(location.querySelector('a').getAttribute('href')).toBe(guide);
      expect(location.querySelector('a').getAttribute('aria-label')).toMatch(/hall guide$/);
      expect(header.querySelector('a, select')).toBeNull();
    }
  } finally {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
