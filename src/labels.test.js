import { act } from 'react';
import { createRoot } from 'react-dom/client';

import App, { machineDescription } from './App';

test('machine subtitles drop the repeated machine type and keep the configuration', () => {
  expect(machineDescription({ type: 'Washer', size: 'Frontload Washer' })).toBe('Frontload washer');
  expect(machineDescription({ type: 'Dryer', size: 'Stack Dryer' })).toBe('Stack dryer');
  expect(machineDescription({ type: 'Dryer', size: 'Single Dryer' })).toBe('Single dryer');
  expect(machineDescription({ type: 'Dryer', size: 'Speed Queen' })).toBe('Speed Queen dryer');
  expect(machineDescription({ type: 'Washer' })).toBe('Washer');
  expect(machineDescription({})).toBe('Machine');
});

async function render(url, run, setup) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  window.scrollTo = jest.fn();
  localStorage.clear();
  setup?.();
  navigator.share = jest.fn(async () => {});
  window.history.replaceState(null, '', url);
  global.fetch = jest.fn(async (request) => ({
    ok: true,
    json: async () => request.includes('/machines/')
      ? [1, 5].map((id) => ({ id, machineNumber: id, washAlertIsVisible: true, machineType: { isWasher: id === 1, isDryer: id === 5, typeName: id === 1 ? 'Frontload Washer' : 'Single Dryer' } }))
      : { room: { id: 12254 }, machines: { 1: { statusId: 'IN_USE', remainingSeconds: 900 }, 5: { statusId: 'AVAILABLE' } } },
  }));
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<App />); });
    await run(container);
  } finally {
    act(() => root.unmount());
    container.remove();
    delete navigator.share;
    window.history.replaceState(null, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
}

test('room controls use sentence case and the new machine subtitles', async () => {
  await render('/#room/davis-hall', async (container) => {
    const text = (selector) => [...container.querySelectorAll(selector)].map((element) => element.textContent.trim());
    expect(text('[id^="machine-card-"] h3 + div span')).toEqual(['Frontload washer', 'Single dryer']);
    expect(container.textContent).not.toMatch(/Washer - |Dryer - /);
    expect(text('.ll-room-header button')).toEqual(expect.arrayContaining(['All rooms', 'Share room']));
    expect(container.querySelector('[aria-label="Set cycle alert for Washer 1"]').textContent.trim()).toBe('Set cycle alert');
    expect(container.textContent).not.toMatch(/Set Cycle Alert|Share Room|All Rooms/);
  });
});

test('Settings wording changes keep the same controls and stored preferences', async () => {
  await render('/?view=settings', async (container) => {
    expect(container.querySelector('label[for="systemThemeToggle"]').textContent).toBe('Use system theme');
    const layout = container.querySelector('#visualLayoutToggle');
    expect(layout.labels[0].textContent).toBe('Expand Room Layout by default');
    expect(layout.getAttribute('aria-checked')).toBe('true');
    await act(async () => { layout.click(); });
    expect(localStorage.getItem('uvmLaundryExpandRoomLayout')).toBe('false');
    expect(container.textContent).toContain('Report a broken machine');
  });
});

test('the report dialog shows numbered steps naming the LaundryConnect machine label', async () => {
  const { MachineReport } = await import('./MachineReport');
  const { findLaundryRoom } = await import('./laundryData');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = jest.fn();
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<MachineReport machine={{ id: '14', number: '14', type: 'Washer', machineName: 'Washer 14' }} room={findLaundryRoom('uheightsn2')} />);
    });
    await act(async () => { container.querySelector('[aria-label="Report Washer 14"]').click(); });
    const steps = container.querySelector('.ll-report-steps');
    expect(steps.querySelector('.ll-report-steps__title').textContent).toBe('How to report Washer 14');
    expect([...steps.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Tap W14 in the panel below.',
      'Choose Report a problem, pick the issue, and add your name and email.',
      'Tap Submit Report. Automatic Laundry handles the repair.',
    ]);
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

const personalSection = (container) =>
  [...container.querySelectorAll('section')].find((element) => element.querySelector('h2')?.textContent === 'Personal Information');

test('with no native channel live, Personal Information is hidden unless details were already saved', async () => {
  // Nothing saved: the editable section does not appear in production.
  await render('/?view=settings', async (container) => {
    expect(personalSection(container)).toBeUndefined();
    expect(container.querySelector('#contactName')).toBeNull();
  });

  // Details saved during development remain and can still be cleared.
  await render('/?view=settings', async (container) => {
    const section = personalSection(container);
    expect(section).toBeTruthy();
    expect(section.querySelector('input')).toBeNull(); // no editable fields while hidden
    expect(section.textContent).toContain('Nothing uses or sends them right now');
    await act(async () => { section.querySelector('button').click(); });
    expect(localStorage.getItem('uvmLaundryContactName')).toBe('""');
    expect(localStorage.getItem('uvmLaundryContactEmail')).toBe('""');
    expect(localStorage.getItem('uvmLaundryContactPhone')).toBe('""');
  }, () => {
    localStorage.setItem('uvmLaundryContactName', '"Pat Cat"');
    localStorage.setItem('uvmLaundryContactEmail', '"pat@uvm.edu"');
    localStorage.setItem('uvmLaundryContactPhone', '"8025550100"');
  });
});
