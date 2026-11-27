export const handbook = 'https://www.uvm.edu/housingdining/hallways-handbook';
export const service = 'https://automaticlaundry.com/request-service/';
const officialRoomSelector = 'https://laundryconnectlive.com/uvm';

export const articles = [
  {
    slug: 'laundry-guide',
    title: 'First-year laundry guide for UVM students',
    description: 'Find the laundry room in your UVM residence hall, check which machines are free, and learn what to do when a machine breaks.',
    intro: 'Start with your residence hall. Check for a free washer before carrying your laundry downstairs, and use an alert if you want a reminder during your cycle.',
    html: `<h2>Find your room and check availability</h2>
      <ol><li>Open the <a href="/residence-halls/">campus laundry directory</a> and choose your residence hall.</li>
      <li>Pick your floor, tower, or room if your building lists more than one. At Central Campus Residence Hall, Floors 2 through 7 have separate entries.</li>
      <li>Open the live tracker and check the latest update and the number of available washers or dryers. If the room is full, check Peak Times for a historically quieter window.</li>
      <li>On a running machine, choose Set Cycle Alert. Use push on a supported browser or open the embedded text and email options.</li></ol>
      <h2>Bring the basics</h2><p>Bring a laundry bag and detergent suited to the machine. Check the garment and machine labels, empty your pockets, and avoid overloading the washer. Move your load promptly and clear the dryer lint screen as directed on the machine.</p>
      <h2>Know who to contact</h2><p>UVM’s <a href="${handbook}">Hallways Handbook</a> describes its residential laundry facilities and resident access. For a broken machine, note the hall, room, and washer or dryer number, then use <a href="${service}">Automatic Laundry’s service request form</a>.</p>
      <p>See the <a href="/faq/">laundry FAQ</a> for saved counts, notifications, and using LaundryLink on your phone.</p>`,
  },
  {
    slug: 'faq',
    title: 'UVM laundry tracker FAQ',
    description: 'Answers about tracking UVM laundry on your phone, cycle reminders, Peak Times, saved statuses, and broken machines.',
    intro: 'How to check your room, read machine status, and choose the right alert.',
    html: `<h2>How do I track my laundry at UVM?</h2><p>Find your hall in the <a href="/residence-halls/">laundry directory</a>, open the live tracker for your particular room, and select your machine. A machine may show time remaining if the provider reports it.</p>
      <h2>Is there a UVM laundry app?</h2><p>LaundryLink is a website you can use on a phone or computer. You can add it to your phone’s Home Screen. For push notifications on iPhone or iPad, open LaundryLink from its Home Screen icon and allow notifications when prompted.</p>
      <h2>Can I get a text, email, or push notification?</h2><p>Open Set Cycle Alert on a running machine. LaundryLink supplies push alerts. Automatic Laundry’s embedded panel supplies text and email setup. When the tracker confirms no washer or dryer of the selected type is available in a room, LaundryLink can send a one-time push when one opens there.</p>
      <h2>What do the status labels mean?</h2><p>Available means the provider reports an open machine. Cycle Finished means a cycle has ended. A saved snapshot shows a past observation with its timestamp. When there’s no usable status, the tracker says it is unavailable. See <a href="/status/">service status</a> if a refresh fails.</p>
      <h2>What are Peak Times?</h2><p>Peak Times summarize past machine usage. Use the chart to plan a visit and the tracker to check current availability. The provider publishes a shared history for CCRH Floors 6 and 7 even though LaundryLink separates their live machine lists.</p>
      <h2>How do I report a broken washer or dryer?</h2><p>Use Report a problem on the machine card or <a href="${service}">submit a service request to Automatic Laundry</a>. Include the building, room, and machine number.</p>`,
  },
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
      <section class="site-panel"><h2>UVM LaundryLink</h2><p>Find your room by campus, save favorites, check Peak Times, and manage push alerts.</p><a class="site-page-action" href="/residence-halls/">Find your hall</a></section>
      <section class="site-panel"><h2>LaundryConnect</h2><p>Automatic Laundry’s own room view, with machine status, usage history, and access to service requests.</p><a class="site-page-action" href="${officialRoomSelector}">Open UVM rooms on LaundryConnect</a></section>
    </div>
    <div class="site-comparison-grid">
      ${[
        ['Find an open machine', 'Search rooms by name, filter by campus, and save favorites. CCRH Floors 6 and 7 have separate machine lists. Each check displays its timestamp.', 'Open the provider’s room view for its machine list and reported status. The provider lists CCRH Floors 6 and 7 together.'],
        ['Plan a quieter visit', 'Peak Times display historical usage. CCRH Floors 6 and 7 share one history.', 'The room’s Peak Times chart summarizes past machine use where history is available.'],
        ['Get an alert', 'Set browser push for a running cycle or the next washer or dryer when that type is full in your room. The embedded text and email form comes from Automatic Laundry.', 'Use the provider’s text or email options when they are offered for a running machine.'],
        ['Report a broken machine', 'Open the report action on the machine card to see which machine you’re reporting and open the provider’s service form.', 'Automatic Laundry receives service requests and handles repairs. Include the building, room, and machine number.'],
      ].map(([task, laundryLink, laundryConnect]) => `<section class="site-panel site-comparison-row">
        <h2>${task}</h2><dl><div><dt>UVM LaundryLink</dt><dd>${laundryLink}</dd></div><div><dt>LaundryConnect</dt><dd>${laundryConnect}</dd></div></dl>
      </section>`).join('')}
    </div>`,
  },
];
