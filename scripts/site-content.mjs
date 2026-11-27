export const handbook = 'https://www.uvm.edu/housingdining/hallways-handbook';
export const service = 'https://automaticlaundry.com/request-service/';
const officialRoomSelector = 'https://laundryconnectlive.com/uvm';

export const articles = [
  {
    slug: 'about',
    title: 'About UVM LaundryLink',
    description: 'Who built UVM LaundryLink, where its laundry data comes from, and how it differs from the official laundry provider.',
    intro: `Independent student project by Ivan Minier · ${new Date().getFullYear()}`,
    layout: 'about',
    html: `<div class="site-panel-grid">
      <section class="site-panel site-panel-wide">
        <h2>Check your room before you go</h2>
        <p>Find a room by campus, see reported washer and dryer availability, and check Peak Times before carrying a load downstairs. Save favorite rooms and set browser alerts for a running cycle or when the next machine of the type you need opens.</p>
        <div class="site-page-actions"><a class="site-page-action" href="/residence-halls/">Find your laundry room</a><a class="site-page-action" href="/compare/">Compare trackers</a></div>
      </section>
      <section class="site-panel">
        <h2>Where the data comes from</h2>
        <p>LaundryLink operates independently of the University of Vermont and Automatic Laundry. Machine status and usage history are based on data reported by Automatic Laundry.</p>
        <p>The <a href="/status/">service status page</a> shows the latest automated checks. For repairs, use <a href="${service}">Automatic Laundry’s service form</a>. For residential access rules, see <a href="${handbook}">UVM’s Hallways Handbook</a>.</p>
        <p>For feedback about LaundryLink, <a href="mailto:ivan.minier@uvm.edu">email Ivan Minier</a>.</p>
      </section>
      <section class="site-panel">
        <h2>Privacy</h2>
        <p>Read the <a href="/privacy/">Privacy Policy</a> for information about browser storage, alerts, and analytics. The <a href="/terms/">Terms of Use</a> cover using the tracker and its reported data.</p>
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
        ['Get to your usual room faster', 'Search by room, campus, or complex, jump to a campus section, or open your favorites. Favorite cards show reported free machine counts when status is available.', 'Start at the UVM room selector, then open the room you want to check.'],
        ['Find an open machine', 'Check reported free washer and dryer counts, then use the room layout or machine list to find a machine. CCRH Floors 6 and 7 have separate machine lists.', 'Open the provider’s room view for its machine list and reported status. The provider lists CCRH Floors 6 and 7 together.'],
        ['Plan a quieter visit', 'Peak Times show a quieter window when supported by the history. CCRH Floors 6 and 7 share one history.', 'The room’s Peak Times chart summarizes past machine use where history is available.'],
        ['Get an alert', 'Set browser push for a running cycle or the next washer or dryer when that type is full in your room. Download a calendar reminder when a current finish estimate is available. The embedded text and email form comes from Automatic Laundry.', 'Use the provider’s text or email options when they are offered for a running machine.'],
        ['Set up the tracker the way you like', 'Choose light or dark mode, set whether Room Layout and Peak Times start expanded, or open your last room on startup.', 'Open a provider room page to see its machine layout and status list.'],
        ['Know how fresh a status is', 'Each live check shows its time. During a temporary outage, a saved result is labeled with the earlier timestamp when your device has one.', 'Use the provider’s room page as a second place to check when LaundryLink’s feed is unavailable.'],
        ['Report a broken machine', 'Open the report action on the machine card to see which machine you’re reporting and open the provider’s service form.', 'Automatic Laundry receives service requests and handles repairs. Include the building, room, and machine number.'],
      ].map(([task, laundryLink, laundryConnect]) => `<section class="site-panel site-comparison-row">
        <h2>${task}</h2><dl><div><dt>UVM LaundryLink</dt><dd>${laundryLink}</dd></div><div><dt>LaundryConnect</dt><dd>${laundryConnect}</dd></div></dl>
      </section>`).join('')}
    </div>`,
  },
];

// Set to the actual publication date in the approved release commit.
const legalEffectiveDate = 'Effective date will be set at publication.';

export const legalArticles = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: 'How UVM LaundryLink uses browser storage, push alert data, and aggregate site analytics.',
    intro: legalEffectiveDate,
    html: `<h2>Who runs LaundryLink</h2>
      <p>UVM LaundryLink is an independent student project created and maintained by Ivan Minier. It operates independently of the University of Vermont and Automatic Laundry. You can use the tracker without an account, name, email address, or phone number.</p>
      <h2>What stays in your browser</h2>
      <p>Your browser stores favorites, room and appearance preferences, saved alert IDs and expiration times, and the last saved machine statuses. The service worker caches site files so the tracker can open offline after it has been downloaded. To remove this information, clear the site data for uvmlaundry.com in your browser. To stop a pending push alert, cancel it in My Laundry before clearing site data. You can change notification permission separately in your browser settings.</p>
      <h2>Browser push alerts</h2>
      <p>When you set a push alert, the alerts service stores your browser’s push subscription endpoint and keys, the room and relevant machine IDs, the requested timing or availability condition, and an alert ID and expiration time. Cancel pending alerts from the browser where you set them. Alerts expire after four hours. The service deletes the alert record after successful cancellation, when it checks for expired alerts, after handoff to the push service, or when delivery attempts end. The browser’s push service handles delivery. A successful handoff does not guarantee that your device shows the alert.</p>
      <h2>Analytics and hosting</h2>
      <p>LaundryLink stores daily aggregate counts for page and room views, broad referral categories, alert registrations, and push service outcomes. The aggregate tables contain counts and labels, without browser cookies, account IDs, or full referrer URLs. LaundryLink’s page, room, and referral counters respect supported Global Privacy Control and Do Not Track signals. Cloudflare provides site delivery and the alerts and metrics infrastructure. The alerts service uses connection IP information for rate limiting. Hosting, network, and push services can process connection information as part of operating their services. Cloudflare Web Analytics measures site visits and performance separately from LaundryLink’s own aggregate counts.</p>
      <h2>Automatic Laundry</h2>
      <p>Machine status and historical usage are based on information reported by Automatic Laundry. Automatic Laundry handles the information you enter in its text, email, and equipment service forms, including the forms you open through LaundryLink. Its websites and embedded interfaces follow its own privacy practices.</p>
      <h2>Calendar reminders</h2>
      <p>LaundryLink creates the calendar file in your browser without accessing a calendar account. Your calendar app controls import and reminders.</p>
      <h2>Contact</h2>
      <p>For a privacy question, use the email link on <a href="/about/">About UVM LaundryLink</a>.</p>`,
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    description: 'The intended use of UVM LaundryLink and the limits of its data, estimates, and reminders.',
    intro: legalEffectiveDate,
    html: `<h2>Using LaundryLink</h2>
      <p>UVM LaundryLink is a free, independent student project by Ivan Minier for UVM residence hall students and other people authorized to use campus laundry facilities. It is separate from UVM and Automatic Laundry and has no official endorsement. Follow <a href="${handbook}">UVM’s residence hall and facility rules</a>. Access to the website gives you no additional access to residence halls or laundry rooms.</p>
      <h2>Reported data and estimates</h2>
      <p>LaundryLink shows machine status from third-party reports. A status may be delayed, inaccurate, or unavailable. A machine shown as free may still be occupied or contain laundry. Check the machine when you arrive. Estimated cycle finish times can change. Peak Times summarize past usage and current availability can differ.</p>
      <h2>Alerts and reminders</h2>
      <p>Browser push alerts depend on the data feed, network, push service, browser permissions, and device settings. They can arrive late or fail to arrive. A downloaded calendar reminder uses the estimate at download time. Your calendar app controls delivery. Automatic Laundry handles its own text and email alerts.</p>
      <h2>Repairs and external services</h2>
      <p>Use <a href="${service}">Automatic Laundry’s service form</a> for equipment problems. Automatic Laundry handles servicing. When you open an external site or use an embedded provider form, that service’s own terms and privacy practices apply.</p>
      <h2>Reasonable use and availability</h2>
      <p>Use the tracker in a way that keeps it available to other students. Avoid automated traffic that burdens LaundryLink or its data providers, and respect access controls. The site may change, be interrupted, or be discontinued.</p>
      <h2>Contact</h2>
      <p>For a question about LaundryLink, use the email link on <a href="/about/">About UVM LaundryLink</a>.</p>`,
  },
];
