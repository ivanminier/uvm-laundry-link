import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { FavoriteSummary } from './FavoriteSummary';
import { findLaundryRoom } from './laundryData';

// A controlled history in which every favorite shares one quieter window.
jest.mock('./RoomPeakTimes', () => ({
  quieterWindow: () => '7 AM–10 AM',
  usePeakTimesSnapshot: () => ({ snapshot: { rooms: new Proxy({}, { get: () => ({ grid: [] }) }) }, failed: false }),
}));

test('the quieter window lists two rooms and expands the rest in place', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const rooms = ['uheightsn1', 'uheightsn2', 'uheightss1', 'uheightss2'].map(findLaundryRoom);
  const onSelectRoom = jest.fn();
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<FavoriteSummary rooms={rooms} statuses={{}} offline={false} onSelectRoom={onSelectRoom} />); });
    const item = () => container.querySelector('.ll-favorite-summary__history li');
    const links = () => [...item().querySelectorAll('a')].map((link) => link.textContent);
    const toggle = () => item().querySelector('button');

    expect(item().textContent).toBe('7 AM–10 AM University Heights North · Tower 1, University Heights North · Towers 2+3 and 2 more');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    await act(async () => { toggle().click(); });
    expect(links()).toEqual(['University Heights North · Tower 1', 'University Heights North · Towers 2+3',
      'University Heights South · Tower 1', 'University Heights South · Towers 2+3']);
    expect(item().textContent).toBe('7 AM–10 AM University Heights North · Tower 1, University Heights North · Towers 2+3, '
      + 'University Heights South · Tower 1 and University Heights South · Towers 2+3 Show fewer');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement === toggle() || document.activeElement === document.body).toBe(true);

    await act(async () => { item().querySelectorAll('a')[3].click(); });
    expect(onSelectRoom).toHaveBeenCalledWith('uheightss2');

    await act(async () => { toggle().click(); });
    expect(links()).toHaveLength(2);
    expect(toggle().textContent).toBe('2 more');
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('two or fewer rooms show no expand control', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<FavoriteSummary rooms={['uheightsn1', 'uheightsn2'].map(findLaundryRoom)} statuses={{}} offline={false} onSelectRoom={() => {}} />);
    });
    const item = container.querySelector('.ll-favorite-summary__history li');
    expect(item.textContent).toBe('7 AM–10 AM University Heights North · Tower 1, University Heights North · Towers 2+3');
    expect(item.querySelector('button')).toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
