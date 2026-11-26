export const handbook = 'https://www.uvm.edu/housingdining/hallways-handbook';
export const service = 'https://automaticlaundry.com/request-service/';
export const vendor = 'https://automaticlaundry.com/say-goodbye-to-quarters-smarter-ways-to-pay-for-laundry-today/';

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
      <h2>Can I get a text, email, or push notification?</h2><p>Open Set Cycle Alert on a running machine. LaundryLink supplies push alerts. Automatic Laundry’s embedded panel supplies text and email setup. When the tracker confirms the room has no available washers, LaundryLink can also send a one-time push when a washer opens in that room.</p>
      <h2>What do the status labels mean?</h2><p>Available means the provider reports an open machine. Cycle Finished means a cycle has ended. A saved snapshot shows a past observation with its timestamp. When there’s no usable status, the tracker says it is unavailable. See <a href="/status/">service status</a> if a refresh fails.</p>
      <h2>What are Peak Times?</h2><p>Peak Times summarize past machine usage. Use the chart to plan a visit and the tracker to check current availability. The provider publishes a shared history for CCRH Floors 6 and 7 even though LaundryLink separates their live machine lists.</p>
      <h2>How do I report a broken washer or dryer?</h2><p>Use Report a problem on the machine card or <a href="${service}">submit a service request to Automatic Laundry</a>. Include the building, room, and machine number.</p>`,
  },
  {
    slug: 'about',
    title: 'About UVM LaundryLink',
    description: 'Who built UVM LaundryLink, where its laundry data comes from, and how it differs from the official laundry provider.',
    intro: 'UVM LaundryLink is an independent, student-created website by Ivan Minier for tracking residence hall laundry at the University of Vermont.',
    html: `<h2>What LaundryLink does</h2><p>It shows provider-reported machine status with searchable room listings, campus filters, favorites, a mobile-friendly layout, and dark mode. Machine status and usage history come from provider feeds. LaundryLink is unaffiliated with the University of Vermont and Automatic Laundry.</p>
      <h2>Where to get help</h2><p>For equipment service, use <a href="${service}">Automatic Laundry’s service request form</a>. For housing rules and resident access, see <a href="${handbook}">UVM’s Hallways Handbook</a>. For a site or feed issue, see <a href="/status/">LaundryLink service status</a>.</p>
      <h2>Privacy</h2><p>Room preferences and saved alert controls are stored in your browser. A push subscription is used to send the requested alert. Contact details entered in the embedded text or email form go to Automatic Laundry. LaundryLink counts referral categories such as search and ChatGPT without cookies, account IDs, or storing referrer URLs for analytics.</p>
      <p>Read the <a href="/compare/">comparison with LaundryConnect Live</a> or open the <a href="/residence-halls/">UVM laundry directory</a>.</p>`,
  },
  {
    slug: 'compare',
    title: 'LaundryLink and the official UVM laundry tracker',
    description: 'Compare UVM LaundryLink and Automatic Laundry’s LaundryConnect Live for machine status, alerts, usage history, and repairs.',
    intro: 'Both can help you check residence hall laundry. LaundryLink is a student-built interface. LaundryConnect Live is operated by the laundry provider.',
    html: `<h2>Check machines and plan a trip</h2><p>LaundryLink groups rooms by campus and provides favorites, room links, dark mode, and separate live machine lists for CCRH Floors 6 and 7. It displays machine status from the provider and can show a last saved snapshot during an outage. The official room view is a useful second check when LaundryLink is unavailable.</p>
      <h2>Choose an alert</h2><p>LaundryLink offers browser push for individual cycles and a push when a washer opens in a confirmed full room. Automatic Laundry supplies the text and email options used in the embedded provider form. Check the <a href="/faq/">notification FAQ</a> for device setup.</p>
      <h2>Report a machine issue</h2><p>Automatic Laundry handles maintenance. LaundryLink links you to the vendor’s reporting flow and identifies the machine so you can give the correct details.</p>
      <p>Sources <a href="${vendor}">Automatic Laundry’s alert overview</a> and <a href="${service}">its service form</a>.</p>
      <p><a href="/residence-halls/">Find your hall and its official room link</a>.</p>`,
  },
];
