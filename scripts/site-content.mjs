export const handbook = 'https://www.uvm.edu/housingdining/hallways-handbook';
export const service = 'https://automaticlaundry.com/request-service/';
const officialRoomSelector = 'https://laundryconnectlive.com/uvm';

export const articles = [
  {
    slug: 'about',
    title: 'About UVM LaundryLink',
    description: 'Who built UVM LaundryLink, where its laundry data comes from, and how it differs from the official laundry provider.',
    intro: 'UVM LaundryLink is an independent, student-created website by Ivan Minier for tracking residence hall laundry at the University of Vermont.',
    layout: 'about',
    html: `<div class="site-panel-grid">
      <section class="site-panel site-panel-wide">
        <h2>Check your room before you go</h2>
        <p>Find a room by campus, see reported washer and dryer availability, and check Peak Times before carrying a load downstairs. Save favorite rooms and set browser alerts for a running cycle or when the next machine of the type you need opens.</p>
        <div class="site-page-actions"><a class="site-page-action" href="/residence-halls/">Find your laundry room</a><a class="site-page-action" href="/compare/">Compare trackers</a></div>
      </section>
      <section class="site-panel">
        <h2>Where the data comes from</h2>
        <p>Automatic Laundry provides the machine status and usage history. The <a href="/status/">service status page</a> shows the latest automated checks. For repairs, use <a href="${service}">Automatic Laundry’s service form</a>. For residential access rules, see <a href="${handbook}">UVM’s Hallways Handbook</a>.</p>
      </section>
      <section class="site-panel">
        <h2>Privacy</h2>
        <p>Your room preferences are saved on this device. When you request a push alert, LaundryLink uses the browser’s push subscription to send it. Automatic Laundry receives the details you enter in its text and email form.</p>
        <p>LaundryLink counts page views, room views, broad referral sources, and push service outcomes in aggregate. The analytics totals contain no cookies, account IDs, or full referrer URLs.</p>
      </section>
    </div>`,
  },
  {
    slug: 'compare',
    title: 'UVM LaundryLink and LaundryConnect',
    description: 'Compare UVM LaundryLink and Automatic Laundry’s LaundryConnect for machine status, alerts, usage history, and repairs.',
    intro: 'UVM LaundryLink is an independent student-built tracker for residence hall laundry. Automatic Laundry runs LaundryConnect.',
    layout: 'compare',
    html: `<div class="site-panel-grid site-comparison-overview">
      <section class="site-panel"><h2>UVM LaundryLink</h2><p>Find your room quickly, save the spots you use, and get a push when the next machine you need opens.</p><a class="site-page-action" href="/residence-halls/">Find your laundry room</a></section>
      <section class="site-panel"><h2>LaundryConnect</h2><p>Automatic Laundry’s own room view, with machine status, usage history, and access to service requests.</p><a class="site-page-action" href="${officialRoomSelector}">Open UVM rooms on LaundryConnect</a></section>
    </div>
    <div class="site-comparison-grid">
      ${[
        ['Get to your usual room faster', 'Search across UVM halls and complexes, filter by campus, or open your favorites. Favorite cards show reported free machine counts when status is available.', 'Start at the UVM room selector, then open the room you want to check.'],
        ['Find an open machine', 'CCRH Floors 6 and 7 have separate machine lists. Check counts, search for a machine number, or filter by status.', 'Open the provider’s room view for its machine list and reported status. The provider lists CCRH Floors 6 and 7 together.'],
        ['Plan a quieter visit', 'Peak Times display historical usage. CCRH Floors 6 and 7 share one history.', 'The room’s Peak Times chart summarizes past machine use where history is available.'],
        ['Get an alert', 'Set browser push for a running cycle or the next washer or dryer when that type is full in your room. The embedded text and email form comes from Automatic Laundry.', 'Use the provider’s text or email options when they are offered for a running machine.'],
        ['Set up the tracker the way you like', 'Choose light or dark mode, set whether Room Layout and Peak Times start expanded, or open your last room on startup.', 'Open a provider room page to see its machine layout and status list.'],
        ['Know how fresh a status is', 'Each live check shows its time. During a temporary outage, a saved result is labeled with the earlier timestamp when your device has one.', 'Use the provider’s room page as a second place to check when LaundryLink’s feed is unavailable.'],
        ['Report a broken machine', 'Open the report action on the machine card to see which machine you’re reporting and open the provider’s service form.', 'Automatic Laundry receives service requests and handles repairs. Include the building, room, and machine number.'],
      ].map(([task, laundryLink, laundryConnect]) => `<section class="site-panel site-comparison-row">
        <h2>${task}</h2><dl><div><dt>UVM LaundryLink</dt><dd>${laundryLink}</dd></div><div><dt>LaundryConnect</dt><dd>${laundryConnect}</dd></div></dl>
      </section>`).join('')}
    </div>`,
  },
];
