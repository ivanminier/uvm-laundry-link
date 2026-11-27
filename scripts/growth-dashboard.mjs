import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const analyticsDir = resolve(homedir(), 'Documents/LaundryLink Launch/08 Analytics');
const output = resolve(process.argv[2] || join(analyticsDir, 'growth-dashboard.html'));
const reportOutput = join(dirname(output), `growth-report-${new Date().toISOString().slice(0, 10)}.md`);
const wrangler = process.env.LAUNDRY_WRANGLER || resolve(projectRoot, 'node_modules/.bin/wrangler');
const database = 'laundrylink-referrals';
const config = resolve(projectRoot, 'alerts/wrangler.jsonc');
const rooms = JSON.parse(readFileSync(resolve(projectRoot, 'src/laundryRooms.json'), 'utf8'));
const health = JSON.parse(readFileSync(resolve(projectRoot, 'src/serviceHealthSnapshot.json'), 'utf8'));

function isWithin(target, parent) {
  const path = relative(parent, target);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

if (extname(output).toLowerCase() !== '.html') throw new Error('Dashboard output must use the .html extension');
if (isWithin(output, projectRoot)) throw new Error('Private dashboard output must be outside the repository');
mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
const canonicalRoot = realpathSync(projectRoot);
const canonicalOutput = resolve(realpathSync(dirname(output)), basename(output));
if (isWithin(canonicalOutput, canonicalRoot)) throw new Error('Private dashboard output must be outside the repository');
if (existsSync(output) && lstatSync(output).isSymbolicLink()) throw new Error('Refusing to overwrite a dashboard symlink');

const hallNames = new Map();
const slugify = (text) => text.toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const room of rooms) {
  const display = room.displayName ?? room.name;
  const name = room.id.startsWith('lll_') ? 'Living-Learning'
    : display === 'CCRH' ? 'Central Campus Residence Hall'
      : display.replace(/^UHeights /, 'University Heights ');
  hallNames.set(slugify(name), name);
}

function roomLabel(id) {
  const room = rooms.find((entry) => entry.id === id);
  return room ? [room.displayName ?? room.name, room.locationLabel].filter(Boolean).join(' · ') : id;
}

function query(sql) {
  const result = execFileSync(wrangler, [
    'd1', 'execute', database, '--remote', '--config', config, '--json', '--command', sql,
  ], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const [response] = JSON.parse(result);
  if (!response?.success || !Array.isArray(response.results)) {
    throw new Error('Cloudflare did not confirm the private database query');
  }
  return response.results;
}

const events = query("SELECT day, metric, label, events FROM daily_metrics WHERE day >= date('now', '-179 days') ORDER BY day");
const referrals = query("SELECT day, source, page, landings FROM referral_counts WHERE day >= date('now', '-179 days') ORDER BY day");
const currentDay = new Date().toISOString().slice(0, 10);
const shiftDay = (day, offset) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const data = JSON.stringify({ events, referrals, health, halls: Object.fromEntries(hallNames), rooms }).replace(/</g, '\\u003c');
const metricTotal = (metric, start, end) => events
  .filter((row) => row.metric === metric && row.day >= start && row.day <= end)
  .reduce((sum, row) => sum + Number(row.events || 0), 0);
const referralTotal = (start, end) => referrals
  .filter((row) => row.day >= start && row.day <= end)
  .reduce((sum, row) => sum + Number(row.landings || 0), 0);
const breakdown = (rows, key, value) => {
  const totals = new Map();
  for (const row of rows) totals.set(row[key], (totals.get(row[key]) ?? 0) + Number(row[value] || 0));
  return [...totals].sort((first, second) => second[1] - first[1]);
};
const lastWeek = shiftDay(currentDay, -6);
const priorWeekStart = shiftDay(currentDay, -13);
const priorWeekEnd = shiftDay(currentDay, -7);
const lastWeekEvents = events.filter((row) => row.day >= lastWeek && row.day <= currentDay);
const lastWeekReferrals = referrals.filter((row) => row.day >= lastWeek && row.day <= currentDay);
const lastWeekRooms = breakdown(lastWeekEvents.filter((row) => row.metric === 'room_view'), 'label', 'events').slice(0, 5);
const lastWeekSources = breakdown(lastWeekReferrals, 'source', 'landings').slice(0, 8);
const weeklyPages = metricTotal('page_view', lastWeek, currentDay);
const previousPages = metricTotal('page_view', priorWeekStart, priorWeekEnd);
const weeklyRooms = metricTotal('room_view', lastWeek, currentDay);
const previousRooms = metricTotal('room_view', priorWeekStart, priorWeekEnd);
const weeklyReferrals = referralTotal(lastWeek, currentDay);
const weeklyPushAccepted = lastWeekEvents
  .filter((row) => row.metric === 'push_result' && row.label === 'provider_accepted')
  .reduce((sum, row) => sum + Number(row.events || 0), 0);
const weeklyPushStopped = lastWeekEvents
  .filter((row) => row.metric === 'push_result' && row.label === 'stopped_without_acceptance')
  .reduce((sum, row) => sum + Number(row.events || 0), 0);
const slugName = (slug) => hallNames.get(slug) ?? slug.replaceAll('-', ' ');
const mdList = (items, format) => items.length
  ? items.map((item) => `- ${format(item)}`).join('\n')
  : '- No recorded events in this period.';
const report = `# UVM LaundryLink private growth report

Generated ${new Date().toISOString()} · Event dates and comparisons use UTC.

## Daily activity

- Page-view events today: ${metricTotal('page_view', currentDay, currentDay).toLocaleString()}
- Room-view events today: ${metricTotal('room_view', currentDay, currentDay).toLocaleString()}
- Referral landings today: ${referralTotal(currentDay, currentDay).toLocaleString()}

## Weekly comparison

- Page-view events: ${weeklyPages.toLocaleString()} in the last 7 days; ${previousPages.toLocaleString()} in the preceding 7 days (${weeklyPages - previousPages >= 0 ? '+' : ''}${(weeklyPages - previousPages).toLocaleString()} events).
- Room-view events: ${weeklyRooms.toLocaleString()} in the last 7 days; ${previousRooms.toLocaleString()} in the preceding 7 days (${weeklyRooms - previousRooms >= 0 ? '+' : ''}${(weeklyRooms - previousRooms).toLocaleString()} events).
- Referral landings: ${weeklyReferrals.toLocaleString()} in the last 7 days.
- Push provider responses: ${weeklyPushAccepted.toLocaleString()} accepted; ${weeklyPushStopped.toLocaleString()} stopped without acceptance. Provider acceptance is not confirmed device delivery.

## Top room views · last 7 days

${mdList(lastWeekRooms, ([id, count]) => `${roomLabel(id)} — ${count} events`)}

## Referral sources · last 7 days

${mdList(lastWeekSources, ([source, count]) => `${source} — ${count} landings`)}

## Provider snapshot

- ${health.checkedFeeds} of ${health.totalFeeds} provider feeds responded at ${health.checkedAt} (build-time snapshot).
- This is a periodic check, not continuous uptime monitoring.

## Interpretation and next actions

- These are counted events, not unique visitors or visits. Referral counts can miss visits when apps remove referrer information.
- Compare tracked referral events with Google Search Console impressions and clicks; referral counts do not measure search impressions or indexing.
- Review the public health workflow for subsequent observations. Do not interpret one snapshot as a reliability percentage.
- Use the room and hall rankings as navigation signals only; small counts are not evidence of preference or demand.
`;

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="no-referrer">
  <title>UVM LaundryLink · Private growth dashboard</title>
  <style>
    :root{color-scheme:light;--page:#f3f4ef;--surface:#fffefa;--surface-alt:#f7f5ef;--ink:#20332b;--muted:#5b6b63;--line:#d9e0db;--green:#154734;--gold:#d7a123;--focus:#8a5a00;--shadow:0 6px 24px rgba(25,49,38,.06)}
    [data-theme="dark"]{color-scheme:dark;--page:#141c18;--surface:#1d2923;--surface-alt:#26342c;--ink:#eef3ef;--muted:#b6c4bc;--line:#39483f;--green:#a5cdbb;--gold:#e8bb52;--focus:#f0c66c;--shadow:0 6px 24px rgba(0,0,0,.18)}
    *{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button{font:inherit}button:focus-visible,a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
    .shell{width:min(100% - 2rem,82rem);margin:auto}.topbar{border-bottom:1px solid var(--line);background:var(--surface)}.topbar-inner{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:4.5rem}.brand{display:flex;align-items:center;gap:.7rem;font-weight:750;letter-spacing:-.03em}.brand svg{width:2.5rem;height:2.5rem}.brand small{display:block;color:var(--muted);font-size:.68rem;font-weight:650;letter-spacing:.1em;text-transform:uppercase}.top-actions{display:flex;align-items:center;gap:.6rem}.owner-label,.theme-toggle,.range-button{border:1px solid var(--line);border-radius:.6rem;background:var(--surface);color:var(--ink)}.owner-label{padding:.45rem .7rem;color:var(--muted);font-size:.78rem}.theme-toggle{min-width:2.75rem;min-height:2.75rem;cursor:pointer}
    main{padding-block:clamp(1.7rem,4vw,3rem)}.eyebrow{color:var(--green);font-size:.73rem;font-weight:750;letter-spacing:.12em;text-transform:uppercase}h1{margin:.4rem 0 .45rem;font-size:clamp(2rem,4.2vw,3.35rem);line-height:1.04;letter-spacing:-.055em}h2{margin:0;font-size:1.14rem;line-height:1.25;letter-spacing:-.025em}.lede{max-width:48rem;margin:.5rem 0 0;color:var(--muted);font-size:1rem}.control-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin:1.7rem 0 1rem}.range-controls{display:flex;gap:.4rem;flex-wrap:wrap}.range-button{min-height:2.65rem;padding:0 .9rem;font-weight:650;cursor:pointer}.range-button[aria-pressed="true"]{border-color:var(--green);background:var(--green);color:#fff}.updated{color:var(--muted);font-size:.78rem}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.9rem}.panel,.kpi{border:1px solid var(--line);border-radius:.85rem;background:var(--surface);box-shadow:var(--shadow)}.kpi{padding:1rem 1.05rem}.kpi-label{color:var(--muted);font-size:.83rem;font-weight:600}.kpi-value{margin:.35rem 0 .15rem;font-size:clamp(1.55rem,2.4vw,2.1rem);font-weight:750;letter-spacing:-.045em}.kpi-note{color:var(--muted);font-size:.75rem}.panel{padding:1.1rem 1.2rem}.activity{grid-column:span 3}.activity-head,.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;margin-bottom:.75rem}.legend{display:flex;gap:.8rem;flex-wrap:wrap;color:var(--muted);font-size:.75rem}.dot{display:inline-block;width:.55rem;height:.55rem;margin-right:.25rem;border-radius:50%;background:var(--green)}.dot.gold{background:var(--gold)}
    .chart-scroll{overflow-x:auto;padding:.25rem 0 .65rem}.bars{display:flex;min-width:100%;width:max-content;min-height:11rem;align-items:flex-end;gap:.3rem;border-bottom:1px solid var(--line)}.day{display:flex;width:1.15rem;height:10.4rem;flex-direction:column;justify-content:flex-end;align-items:center;gap:.35rem;border:0;background:transparent;color:var(--muted);cursor:default}.bar-stack{display:flex;width:.78rem;height:8rem;align-items:flex-end;gap:1px}.bar{width:50%;min-height:0;border-radius:3px 3px 0 0;background:var(--green)}.bar.room{background:var(--gold)}.day time{font-size:.6rem;white-space:nowrap;writing-mode:vertical-rl;transform:rotate(180deg)}.chart-note{margin:.7rem 0 0;color:var(--muted);font-size:.75rem}
    .stack{display:grid;gap:.9rem}.stack .panel{min-width:0}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.84rem}th,td{padding:.62rem .25rem;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-size:.73rem;font-weight:650}td:last-child,th:last-child{text-align:right;font-variant-numeric:tabular-nums}.empty{color:var(--muted);font-size:.85rem}.health-value{font-size:1.55rem;font-weight:750;letter-spacing:-.04em}.health-value span{color:var(--muted);font-size:.9rem;font-weight:550;letter-spacing:0}.health-copy,.footnotes{color:var(--muted);font-size:.8rem}.links{display:flex;gap:.6rem 1rem;flex-wrap:wrap;margin-top:.85rem}.links a{color:var(--green);text-underline-offset:.18em}.footnotes{margin-top:1.1rem}.footnotes li{margin:.35rem 0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:68rem){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.activity{grid-column:span 2}.stack{grid-column:span 2;grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:38rem){.shell{width:min(100% - 1.25rem,82rem)}.owner-label{display:none}.topbar-inner{min-height:4rem}.grid{grid-template-columns:1fr 1fr;gap:.55rem}.kpi{padding:.8rem}.kpi-value{font-size:1.45rem}.activity,.stack{grid-column:span 2}.stack{grid-template-columns:1fr}.panel{padding:1rem}.control-row{align-items:flex-start}.updated{width:100%}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body>
  <div class="topbar"><div class="shell topbar-inner">
    <div class="brand" aria-label="UVM LaundryLink private growth dashboard">
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="1" y="1" width="62" height="62" rx="15" fill="#154734"/><rect x="13" y="9" width="38" height="46" rx="8" fill="#f3f4ef"/><path d="M14 23h36" stroke="#154734" stroke-width="2"/><circle cx="20" cy="16" r="2" fill="#d7a123"/><circle cx="27" cy="16" r="2" fill="#154734"/><circle cx="32" cy="39" r="13" fill="#154734"/><circle cx="32" cy="39" r="9" fill="none" stroke="#d7a123" stroke-width="2"/><path d="M26 41c1.7 2 3.7 3 6 3s4.3-1 6-3" fill="none" stroke="#f3f4ef" stroke-linecap="round" stroke-width="2"/></svg>
      <span>UVM LaundryLink<small>Private growth</small></span>
    </div>
    <div class="top-actions"><span class="owner-label">Local owner report</span><button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch to dark mode" title="Switch theme">◐</button></div>
  </div></div>
  <main class="shell">
    <span class="eyebrow">Measured activity · not people</span>
    <h1>Growth, without guesswork.</h1>
    <p class="lede">Anonymous event counts and provider-reported snapshots. Compare observed activity without treating page views as unique users or accepted pushes as device delivery.</p>
    <div class="control-row"><div class="range-controls" role="group" aria-label="Dashboard date range">
      <button class="range-button" type="button" data-days="1" aria-pressed="false">1 day</button>
      <button class="range-button" type="button" data-days="7" aria-pressed="true">7 days</button>
      <button class="range-button" type="button" data-days="30" aria-pressed="false">30 days</button>
      <button class="range-button" type="button" data-days="90" aria-pressed="false">90 days</button>
    </div><span class="updated" id="period-label"></span></div>
    <section class="grid" aria-label="Activity summary">
      <article class="kpi"><div class="kpi-label">Page-view events</div><div class="kpi-value" id="page-views">—</div><div class="kpi-note" id="page-views-note">Compared with the preceding period</div></article>
      <article class="kpi"><div class="kpi-label">Room-view events</div><div class="kpi-value" id="room-views">—</div><div class="kpi-note" id="room-views-note">Compared with the preceding period</div></article>
      <article class="kpi"><div class="kpi-label">Referral landings</div><div class="kpi-value" id="referrals">—</div><div class="kpi-note" id="referrals-note">Observed referrer categories only</div></article>
      <article class="kpi"><div class="kpi-label">Push service outcomes</div><div class="kpi-value" id="push-outcomes">—</div><div class="kpi-note" id="push-outcomes-note">Provider accepted · stopped without acceptance</div></article>
      <article class="panel activity">
        <div class="activity-head"><div><h2>Daily activity</h2><p class="chart-note">Page-view and room-view events, by UTC date.</p></div><div class="legend"><span><i class="dot"></i>Page views</span><span><i class="dot gold"></i>Room views</span></div></div>
        <div class="chart-scroll"><div class="bars" id="activity-chart" role="list" aria-label="Daily page-view and room-view events"></div></div>
        <p class="chart-note">Counts can include repeat activity from the same person. Zero-count dates are shown as empty bars.</p>
      </article>
      <div class="stack">
        <section class="panel"><div class="section-head"><h2>Residence hall pages</h2><span class="updated">Page-view events</span></div><div class="table-wrap" id="halls-table"></div></section>
        <section class="panel"><div class="section-head"><h2>Laundry rooms</h2><span class="updated">Room-view events</span></div><div class="table-wrap" id="rooms-table"></div></section>
        <section class="panel"><div class="section-head"><h2>Referral sources</h2><span class="updated">Landings</span></div><div class="table-wrap" id="sources-table"></div></section>
        <section class="panel"><div class="section-head"><h2>Discovery signals</h2><span class="updated">Referral events, not impressions</span></div><div class="table-wrap" id="discovery-table"></div></section>
        <section class="panel"><div class="section-head"><h2>Notification activity</h2><span class="updated">Registration events</span></div><div class="table-wrap" id="subscriptions-table"></div></section>
        <section class="panel"><div class="section-head"><h2>Push outcome details</h2><span class="updated">Service response labels</span></div><div class="table-wrap" id="push-table"></div></section>
      </div>
      <section class="panel" style="grid-column:1/-1">
        <div class="section-head"><h2>Provider feed check</h2><span class="updated">Latest bundled snapshot</span></div>
        <div class="health-value" id="health-value"></div><p class="health-copy" id="health-copy"></p>
        <p class="health-copy">A periodic health check is not continuous uptime monitoring. Feed response does not imply provider authorization.</p>
      </section>
    </section>
    <ul class="footnotes">
      <li>Events are counts, not unique users, visits, or people. No identifiers or raw subscriptions are included.</li>
      <li>Push provider acceptance is not proof that a device displayed a notification. No physical-device delivery is inferred.</li>
      <li>Referral counts may miss visits when applications strip referrer information. Search referrals are not impressions, clicks, rankings, or indexing status.</li>
      <li>IndexNow acceptance does not confirm indexing. Search performance data must be checked in Search Console or Bing Webmaster Tools.</li>
    </ul>
    <nav class="links" aria-label="Owner resources">
      <a href="https://search.google.com/search-console?resource_id=sc-domain%3Auvmlaundry.com">Google Search Console</a>
      <a href="https://www.bing.com/webmasters/">Bing Webmaster Tools</a>
      <a href="https://uvmlaundry.com/status/">Public service status</a>
    </nav>
  </main>
  <script>
    const DATA = ${data};
    const number = (value) => Number(value || 0).toLocaleString();
    const escapeText = (value) => String(value).replace(/[&<>"']/g, (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const currentDay = new Date().toISOString().slice(0, 10);
    const shiftDay = (day, offset) => { const date = new Date(day + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
    const between = (row, start, end) => row.day >= start && row.day <= end;
    const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const eventRows = (metric, start, end) => DATA.events.filter((row) => row.metric === metric && between(row, start, end));
    const referralRows = (start, end) => DATA.referrals.filter((row) => between(row, start, end));
    const total = (rows, key) => sum(rows, key);
    const grouped = (rows, key, value) => {
      const values = new Map();
      rows.forEach((row) => values.set(row[key], (values.get(row[key]) || 0) + Number(row[value] || 0)));
      return [...values.entries()].sort((first, second) => second[1] - first[1]);
    };
    const human = (value) => String(value).replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    const tables = (items, labeler, emptyText) => {
      if (!items.length) return '<p class="empty">' + emptyText + '</p>';
      return '<table><thead><tr><th scope="col">Category</th><th scope="col">Events</th></tr></thead><tbody>' +
        items.map(([label, count]) => '<tr><td>' + escapeText(labeler(label)) + '</td><td>' + number(count) + '</td></tr>').join('') +
        '</tbody></table>';
    };
    let range = 7;
    function render() {
      const start = shiftDay(currentDay, -(range - 1));
      const previousStart = shiftDay(currentDay, -(range * 2 - 1));
      const previousEnd = shiftDay(currentDay, -range);
      const pageRows = eventRows('page_view', start, currentDay);
      const roomRows = eventRows('room_view', start, currentDay);
      const referralData = referralRows(start, currentDay);
      const pushRows = eventRows('push_result', start, currentDay);
      const subscriptions = eventRows('subscription', start, currentDay);
      const pages = total(pageRows, 'events');
      const roomViews = total(roomRows, 'events');
      const landings = total(referralData, 'landings');
      const accepted = total(pushRows.filter((row) => row.label === 'provider_accepted'), 'events');
      const stopped = total(pushRows.filter((row) => row.label === 'stopped_without_acceptance'), 'events');
      const compare = (current, prior) => current === prior ? 'Same as prior window'
        : Math.abs(current - prior).toLocaleString() + (current > prior ? ' more' : ' fewer') + ' than prior window';
      document.getElementById('period-label').textContent = start + ' – ' + currentDay + ' · UTC';
      document.querySelectorAll('.range-button').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.days) === range)));
      document.getElementById('page-views').textContent = number(pages);
      document.getElementById('page-views-note').textContent = compare(pages, total(eventRows('page_view', previousStart, previousEnd), 'events'));
      document.getElementById('room-views').textContent = number(roomViews);
      document.getElementById('room-views-note').textContent = compare(roomViews, total(eventRows('room_view', previousStart, previousEnd), 'events'));
      document.getElementById('referrals').textContent = number(landings);
      document.getElementById('referrals-note').textContent = 'Tracked categories · ' + number(total(referralRows(previousStart, previousEnd), 'landings')) + ' in prior window';
      document.getElementById('push-outcomes').textContent = number(accepted + stopped);
      document.getElementById('push-outcomes-note').textContent = number(accepted) + ' provider accepted · ' + number(stopped) + ' stopped without acceptance';

      const dayRows = [];
      for (let offset = range - 1; offset >= 0; offset -= 1) {
        const day = shiftDay(currentDay, -offset);
        dayRows.push({ day, pages: sum(pageRows.filter((row) => row.day === day), 'events'), rooms: sum(roomRows.filter((row) => row.day === day), 'events') });
      }
      const peak = Math.max(1, ...dayRows.flatMap((row) => [row.pages, row.rooms]));
      document.getElementById('activity-chart').innerHTML = dayRows.map((row) => {
        const pageHeight = Math.round(row.pages / peak * 122);
        const roomHeight = Math.round(row.rooms / peak * 122);
        const label = row.day + ': ' + row.pages + ' page-view events, ' + row.rooms + ' room-view events';
        return '<div class="day" role="listitem" title="' + escapeText(label) + '" aria-label="' + escapeText(label) + '"><span class="bar-stack"><i class="bar" style="height:' + pageHeight + 'px"></i><i class="bar room" style="height:' + roomHeight + 'px"></i></span><time datetime="' + escapeText(row.day) + '">' + escapeText(row.day.slice(5)) + '</time></div>';
      }).join('');

      const hallRows = pageRows.filter((row) => row.label.startsWith('hall:'));
      document.getElementById('halls-table').innerHTML = tables(
        grouped(hallRows, 'label', 'events').slice(0, 8),
        (label) => DATA.halls[label.slice(5)] || human(label.slice(5)),
        'No residence hall page events in this range.'
      );
      document.getElementById('rooms-table').innerHTML = tables(
        grouped(roomRows, 'label', 'events').slice(0, 8),
        (label) => {
          const room = DATA.rooms.find((entry) => entry.id === label);
          return room ? [room.displayName || room.name, room.locationLabel].filter(Boolean).join(' · ') : human(label);
        },
        'No room-view events in this range.'
      );
      const sources = grouped(referralData, 'source', 'landings');
      document.getElementById('sources-table').innerHTML = tables(sources.slice(0, 8), human, 'No referral landings in this range.');
      const searchSources = new Set(['google', 'bing', 'duckduckgo']);
      const aiSources = new Set(['chatgpt', 'perplexity', 'gemini', 'copilot', 'claude']);
      const discovery = [
        ['Search engine referrals', sum(referralData.filter((row) => searchSources.has(row.source)), 'landings')],
        ['AI assistant referrals', sum(referralData.filter((row) => aiSources.has(row.source)), 'landings')],
      ].filter(([, count]) => count > 0);
      document.getElementById('discovery-table').innerHTML = tables(discovery, (label) => label, 'No search or AI assistant referrals recorded in this range.');
      document.getElementById('subscriptions-table').innerHTML = tables(grouped(subscriptions, 'label', 'events'), human, 'No notification registrations in this range.');
      document.getElementById('push-table').innerHTML = tables(grouped(pushRows, 'label', 'events'), human, 'No push outcomes in this range.');
      document.getElementById('health-value').innerHTML = number(DATA.health.checkedFeeds) + ' <span>of ' + number(DATA.health.totalFeeds) + ' feeds responded</span>';
      document.getElementById('health-copy').textContent = 'Checked ' + new Date(DATA.health.checkedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC · bundled build-time snapshot.';
    }
    document.querySelectorAll('.range-button').forEach((button) => button.addEventListener('click', () => { range = Number(button.dataset.days); render(); }));
    const root = document.documentElement;
    const themeButton = document.getElementById('theme-toggle');
    let storedTheme;
    try { storedTheme = localStorage.getItem('laundrylink-dashboard-theme'); } catch {}
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) root.dataset.theme = 'dark';
    themeButton.setAttribute('aria-label', root.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeButton.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('laundrylink-dashboard-theme', root.dataset.theme); } catch {}
      themeButton.setAttribute('aria-label', root.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
    render();
  </script>
</body>
</html>`;

writeFileSync(output, html, { mode: 0o600 });
chmodSync(output, 0o600);
writeFileSync(reportOutput, report, { mode: 0o600 });
chmodSync(reportOutput, 0o600);
console.log(`Private dashboard: ${output}`);
console.log(`Private daily report: ${reportOutput}`);
