import { coverageNote } from './roomLocations.mjs';
export const informationPath = '/information/';
export const trackerTitle = 'UVM Laundry Tracker | UVM LaundryLink';
export const independenceDisclosure = 'Independent student project with no affiliation with UVM or Automatic Laundry.';
export const machineStatusDefinitions = [
  ['Available (Open)', 'The provider reports the machine as available. It may still contain laundry.'],
  ['In Use', 'The provider reports a running cycle. A timer shows the reported time remaining when available.'],
  ['Finishing Soon', 'The provider reports a cycle nearing completion, or its reported time remaining rounds up to five minutes or less.'],
  ['Cycle Finished (Done)', 'The provider reports that the cycle has ended. The machine may still contain laundry.'],
  ['Door Open', 'The provider reports an open door.'],
  ['Ready to Start', 'The provider reports that a cycle is ready to start.'],
  ['Reserved', 'The provider reports a reservation.'],
  ['Out of Order (Error)', 'The provider reports a fault or service condition.'],
  ['Offline', 'The provider reports the machine as unavailable or offline.'],
  ['Status Unknown', 'The latest data has no recognized status for this machine.'],
];
export const requestService = 'https://automaticlaundry.com/request-service/';

export const homeScreenSteps = [
  ['Open UVMLaundry.com in Safari.'],
  ['Tap ', { emphasis: 'Share' }, '. If needed, open the page menu first.'],
  ['Choose ', { emphasis: 'Add to Home Screen' }, '. Tap ', { emphasis: 'View More' }, ' if you don’t see it.'],
  ['Turn on ', { emphasis: 'Open as Web App' }, ' if shown, then tap ', { emphasis: 'Add' }, '.'],
];

export const informationQuestions = [
  ['How do I find my room?', [
    'Open the ', { href: '/residence-halls/', label: 'campus laundry directory' },
    ' and choose your residence hall, then select your floor, tower, or room. Central Campus Residence Hall has separate entries for Floors 2 through 7. Open the room tracker for the latest update and the number of free washers and dryers. A machine may show time remaining when the provider reports it.',
  ]],
  ['Which UVM housing does LaundryLink cover?', [coverageNote]],
  ['What should I bring?', [
    'Bring a laundry bag and detergent suited to the machine. Check garment and machine labels, empty your pockets, avoid overloading the washer, move your load promptly, and clear the dryer lint screen as directed.',
  ]],
  ['Is there a UVM laundry app?', [
    'LaundryLink works in your browser. On iPhone or iPad, follow these steps to open it from your Home Screen.',
  ], 'For push notifications, open it from its icon and allow notifications when prompted.'],
  ['How do I know when a machine is free?', [
    'Free counts include Available, Cycle Finished, and Door Open. A finished cycle may still have laundry inside. Check the room’s last refresh time before relying on the list. When a machine type has no reported free machines, the room summary can show its next estimated cycle finish. Check Peak Times for a historically quieter window.',
  ]],
  ['Can I get a cycle reminder or notification?', [
    'Open Set Cycle Alert on a running machine. LaundryLink sends browser push alerts. Check or cancel saved alerts in My Laundry. If a current finish estimate is available, you can also download a reminder to import into your calendar. It uses the current estimate and won’t update if the cycle changes. For text or email, select the same machine in the Automatic Laundry panel and open Notify Me. If the panel is unavailable, open LaundryConnect in a new tab from the alert dialog. When a room has no free washers or no free dryers, LaundryLink can send a one-time push when a machine of that type becomes free.',
  ]],
  ['What do the status labels mean?', [
    'Room data freshness is shown separately. Live shows the latest successful refresh. Saved snapshot shows an earlier observation with its timestamp. Unavailable means there is no usable room status to show. See ',
    { href: '/status/', label: 'service status' }, ' if a refresh fails.',
  ], undefined, machineStatusDefinitions],
  ['What are Peak Times?', [
    'Peak Times summarize past machine usage. When the history shows a reliably quieter daytime window, it appears under Peak Times in Burlington time. Candidate windows start at 7 AM or later. The quietest individual hour can be overnight. Open the chart for more detail and check the tracker for current availability. CCRH Floors 6 and 7 share a provider history even though LaundryLink separates their live machine lists.',
  ]],
  ['How do I report a broken washer or dryer?', [
    'Use Report a problem on the machine card. Choose Copy Details & Open Reporting to copy the machine identification and open LaundryConnect. You can also ', { href: requestService, label: 'submit a service request to Automatic Laundry' },
    '. Include the building, room, machine number, and any error code shown on the display.',
  ]],
  ['What if a machine will not start?', [
    'Use the report action on the machine card to contact Automatic Laundry. Include the residence hall, floor or room, machine number, and any error code shown on the display.',
  ]],
];

export const informationDisclosure = [
  'LaundryLink is an independent student project and is not affiliated with UVM or Automatic Laundry. ',
  { href: '/about/', label: 'About LaundryLink' },
];

export const informationResources = [
  ['Campus Laundry Directory', '/residence-halls/'],
  ['Compare trackers', '/compare/'],
  ['Service status', '/status/'],
  ['Site map', '/sitemap/'],
  ['Privacy Policy', '/privacy/'],
  ['Terms of Use', '/terms/'],
  ['Request service', requestService, true],
  ['Automatic Laundry app help', 'https://automaticlaundry.com/faq/for-our-apps/', true],
  ['UVM Housing help center', 'https://www.uvm.edu/housingdining/help-center', true],
];

export const urgentMachinePhone = '617-969-4340';
export const urgentMachineTel = 'tel:+16179694340';
