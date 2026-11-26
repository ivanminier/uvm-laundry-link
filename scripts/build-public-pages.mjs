import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { checkSources } from './check-sources.mjs';
import { articles, handbook, service } from './site-content.mjs';

const origin = 'https://uvmlaundry.com';
const build = new URL('../build/', import.meta.url);
const rooms = JSON.parse(await readFile(new URL('../src/laundryRooms.json', import.meta.url)));
const history = JSON.parse(await readFile(new URL('../src/peakTimesSnapshot.json', import.meta.url)));
const health = process.env.SITE_CHECK_SOURCES === '1' ? await checkSources()
  : JSON.parse(await readFile(new URL('../src/serviceHealthSnapshot.json', import.meta.url)));
const campusNames = { redstone: 'Redstone', athletic: 'Athletic', central: 'Central', north: 'Trinity / North' };
const navLinks = [['/residence-halls/', 'Laundry directory'], ['/laundry-guide/', 'Laundry guide'], ['/faq/', 'FAQ'], ['/status/', 'Service status'], ['/about/', 'About'], ['/compare/', 'Compare trackers']];
const escape = (value) => String(value).replace(/[&<>"']/g, (character) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
const slugify = (text) => text.toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const trackerLink = (room) => `/#room/${room.name.toLowerCase().replace(/\s+/g, '-')}`;
const nav = (current) => navLinks.map(([url, label]) =>
  current === url ? `<a href="${url}" aria-current="page">${label}</a>` : link(url, label)).join('');
const header = (current) => `<header class="site-header"><div class="site-wrap"><a href="/" class="site-brand">UVM LaundryLink</a><nav class="site-nav" aria-label="Main navigation">${nav(current)}</nav></div></header>`;
const footer = (current) => `<footer class="site-footer"><div class="site-wrap"><nav aria-label="Footer">${nav(current)}</nav><p>Independent, student-created site by Ivan Minier. Unaffiliated with UVM and Automatic Laundry.</p></div></footer>`;
const crumbs = (trail) => `<nav class="crumbs" aria-label="Breadcrumbs">${trail.map(([path, name]) => link(path, name)).join('<span aria-hidden="true"> / </span>')}</nav>`;
const list = (items, style) => `<ul class="${style}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const dateText = (value) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short',
}).format(new Date(value)) + ' Eastern';
const time = (value) => `<time datetime="${escape(value)}">${escape(dateText(value))}</time>`;

const halls = new Map();
for (const room of rooms) {
  const display = room.displayName ?? room.name;
  const name = room.id.startsWith('lll_') ? 'Living/Learning'
    : display === 'CCRH' ? 'Central Campus Residence Hall'
    : display.replace(/^UHeights /, 'University Heights ');
  const slug = slugify(name);
  if (!halls.has(slug)) halls.set(slug, { name, slug, campus: room.campus, rooms: [] });
  halls.get(slug).rooms.push(room);
}
const hallList = [...halls.values()].sort((a, b) => a.name.localeCompare(b.name));
const hallUrl = ({ slug }) => `/residence-halls/${slug}/`;
const campusDirectory = Object.entries(campusNames).map(([id, name]) => {
  const group = hallList.filter((hall) => hall.campus === id);
  return `<section id="${id}"><h2>${escape(name)}</h2>${list(group.map((hall) =>
    `${link(hallUrl(hall), hall.name)}${hall.rooms.length > 1 ? ` · ${hall.rooms.length} rooms` : ''}`), 'campus-grid')}</section>`;
}).join('');

const siteSchema = {
  '@type': 'WebSite', '@id': origin + '/#website', url: origin + '/', name: 'UVM LaundryLink',
  description: 'Independent student-created UVM residence hall laundry tracker.',
  creator: { '@type': 'Person', name: 'Ivan Minier' }, inLanguage: 'en-US',
};
const pageSchema = (page) => {
  const content = {
    '@type': page.type ?? 'WebPage', url: origin + page.path, name: page.heading,
    description: page.description, isPartOf: { '@id': siteSchema['@id'] }, inLanguage: 'en-US',
  };
  const graph = [content];
  if (page.path === '/') graph.push(siteSchema, {
    '@type': 'WebApplication', name: siteSchema.name, url: origin + '/',
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', isAccessibleForFree: true,
  });
  if (page.trail) graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: [...page.trail, [page.path, page.heading]].map(([path, name], index) =>
      ({ '@type': 'ListItem', position: index + 1, name, item: origin + path })),
  });
  if (page.path === '/residence-halls/') content.mainEntity = {
    '@type': 'ItemList', itemListElement: hallList.map((hall, index) =>
      ({ '@type': 'ListItem', position: index + 1, name: hall.name, url: origin + hallUrl(hall) })),
  };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
};

const meta = (type, name, value) => `<meta ${type}="${name}" content="${escape(value)}">`;
function head(page) {
  const fullUrl = origin + page.path;
  return `<title>${escape(page.title)}</title>
  ${meta('name', 'description', page.description)}
  <link rel="canonical" href="${fullUrl}">
  ${meta('property', 'og:site_name', 'UVM LaundryLink')}
  ${meta('property', 'og:title', page.title)}
  ${meta('property', 'og:description', page.description)}
  ${meta('property', 'og:url', fullUrl)}
  ${meta('property', 'og:type', 'website')}
  ${meta('property', 'og:image', origin + '/logo512.png')}
  ${meta('property', 'og:image:alt', 'UVM LaundryLink icon')}
  <link rel="stylesheet" href="/site.css">
  <script src="/referrals.js" defer></script>
  <script type="application/ld+json">${pageSchema(page)}</script>`;
}

const siteTrail = [['/', 'UVM LaundryLink']];
const hallTrail = [...siteTrail, ['/residence-halls/', 'Laundry directory']];
function content(page) {
  return `${header(page.path)}<main class="site-wrap site-main">
    ${page.trail ? crumbs(page.trail) : ''}<h1>${escape(page.heading)}</h1>
    <p class="site-intro">${escape(page.intro)}</p>${page.html}
    </main>${footer(page.path)}`;
}

const home = {
  path: '/', title: 'UVM Laundry Tracker | UVM LaundryLink', heading: 'UVM residence hall laundry tracker',
  description: 'Find your University of Vermont residence hall laundry room. Check washer and dryer status, see Peak Times, and set cycle alerts with UVM LaundryLink.',
  intro: `Find laundry at ${hallList.length} UVM residence hall buildings or complexes across ${Object.keys(campusNames).length} campus areas. LaundryLink is an independent, student-created site.`,
  html: `<p class="site-note">Live machine status and alerts require JavaScript. The directory, hall pages, and laundry guides work without it.</p>
    <h2>Find your laundry room</h2><p>${link('/residence-halls/', 'Browse the full campus laundry directory')} or pick a campus below.</p>
    ${list(Object.entries(campusNames).map(([id, name]) => link('/residence-halls/#' + id, name)), 'campus-grid')}
    <h2>How to track laundry at UVM</h2><p>Choose your hall, open the live room tracker, and check which washers or dryers are available. A running machine can show time remaining and offer a cycle alert. Visit the ${link('/laundry-guide/', 'first-year laundry guide')} for step-by-step help.</p>`,
};
const directory = {
  path: '/residence-halls/', title: 'UVM Campus Laundry Directory | UVM LaundryLink',
  heading: 'UVM campus laundry directory', description: 'Find UVM residence hall laundry rooms by campus. Open your hall’s page for floor, tower, and room options and live machine tracking.',
  intro: `Browse ${hallList.length} residence hall buildings or complexes and ${rooms.length} tracked laundry rooms. Choose your own building or an area you can access. UVM sets residential access rules.`,
  trail: siteTrail, type: 'CollectionPage',
  html: `<nav class="crumbs" aria-label="Campus areas">${Object.entries(campusNames).map(([id, name]) => link('#' + id, name)).join('')}</nav>${campusDirectory}<p>${link(handbook, 'UVM Hallways Handbook')}</p>`,
};
const hallPages = hallList.map((hall) => {
  const locationNames = hall.rooms.map((room) => room.locationLabel ?? (room.displayName?.startsWith('L/L ') ? room.displayName.slice(4) : '')).filter(Boolean);
  const splitNote = hall.slug === 'central-campus-residence-hall'
    ? '<p class="site-note">LaundryLink groups machine numbers 45–55 under Floor 6 and 56–62 under Floor 7. LaundryConnect Live lists those two floors together, including their shared Peak Times history.</p>' : '';
  const roomCards = list(hall.rooms.map((room) => {
    const location = room.locationLabel ?? room.displayName ?? room.name;
    const historyId = room.historyId ?? rooms.find(({ id }) => id === room.historyRoomId)?.historyId;
    const official = historyId ? `https://laundryconnectlive.com/live/${historyId}` : room.url;
    return `<h3>${escape(location)}</h3><p>${link(trackerLink(room), 'Check live machines')} · ${link(official, 'Official room view')}</p>`;
  }), 'hall-grid');
  return {
    path: hallUrl(hall), trail: hallTrail, title: `${hall.name} Laundry at UVM | LaundryLink`,
    heading: `${hall.name} laundry`,
    description: `Find ${hall.name} laundry at the University of Vermont. ${locationNames.length ? 'Choose '+locationNames.join(', ')+'. ' : ''}Open the tracker for washer and dryer availability.`,
    intro: `LaundryLink lists ${hall.name} under ${campusNames[hall.campus]}. ${hall.rooms.length > 1 ? `LaundryLink lists ${hall.rooms.length} rooms for this building. Pick the room or floor you use.` : 'Open its room tracker for washer and dryer availability.'}`,
    html: `<h2>Laundry rooms</h2>${roomCards}${splitNote}<p>Current counts appear in the tracker when the live feed is available. For repairs, include the machine number and room when you ${link(service, 'request service from Automatic Laundry')}.</p>
      <p>See the ${link('/residence-halls/#' + hall.campus, `${campusNames[hall.campus]} directory`)} or the ${link('/laundry-guide/', 'first-year laundry guide')}.</p>`,
  };
});

const status = {
  path: '/status/', title: 'UVM LaundryLink Service Status and Data Sources', heading: 'LaundryLink service status',
  description: 'See when UVM laundry sources were last checked, how to recognize saved machine status, and where to go during an outage.',
  intro: 'These checks are snapshots from the site build. The room tracker shows when your browser last retrieved machine status.', trail: siteTrail,
  html: `<div class="site-copy"><h2>Last automated checks</h2>
    <p>Checked ${time(health.checkedAt)}.</p><ul>
      <li>Machine status feed responded with status data for ${health.checkedFeeds} of ${health.totalFeeds} provider rooms.</li>
      <li>Sample machine directory request ${health.directory ? 'returned a usable machine list' : 'did not return a usable machine list'} from the build environment.</li>
      <li>Push configuration endpoint ${health.pushConfiguration ? 'responded for LaundryLink' : 'could not be verified'}. This check does not test delivery.</li>
    </ul>
    <p>Peak Times data fetched ${time(history.capturedAt)}. It describes historical usage.</p>
    <h2>Read live, saved, and unavailable status</h2><p><strong>Live:</strong> the tracker retrieved provider status at the time shown. <strong>Saved snapshot:</strong> the data is from an earlier check on this device. <strong>Unavailable:</strong> the tracker cannot show usable machine data. Check again or use the official room link from the ${link('/residence-halls/', 'laundry directory')}.</p>
    <h2>Alerts and repairs</h2><p>Push alerts depend on browser permissions and the live room feed. Automatic Laundry delivers the text and email options in its embedded form. To report an equipment issue, ${link(service, 'contact Automatic Laundry')}.</p></div>`,
};
const pages = [home, directory, ...hallPages, ...articles.map((page) => ({
  ...page, path: `/${page.slug}/`, heading: page.title, title: `${page.title} | LaundryLink`,
  trail: siteTrail, html: `<div class="site-copy">${page.html}</div>`,
})), status];

const verifications = [
  ['google-site-verification', process.env.GOOGLE_SITE_VERIFICATION],
  ['msvalidate.01', process.env.BING_SITE_VERIFICATION],
].filter(([, token]) => token).map(([name, token]) => meta('name', name, token)).join('');
const homeFile = new URL('index.html', build);
const appShell = await readFile(homeFile, 'utf8');
if (!/<div id="root"><\/div>/.test(appShell) || !/<title>.*?<\/title>/.test(appShell)) throw new Error('Expected React build template');
await writeFile(homeFile, appShell
  .replace(/<title>.*?<\/title>/, () => head(home) + verifications)
  .replace('<div id="root"></div>', () => `<div id="root"><div class="public-page">${content(home)}</div></div>`));

for (const page of pages.slice(1)) {
  const dir = new URL(page.path.slice(1), build);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#154734"><link rel="icon" href="/favicon.ico">${head(page)}</head>
<body class="public-page">${content(page)}</body></html>\n`);
}
await writeFile(new URL('404.html', build), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | LaundryLink</title><link rel="stylesheet" href="/site.css"></head><body class="public-page">${header('')}<main class="site-wrap site-main"><h1>Page not found</h1><p>${link('/residence-halls/', 'Find a laundry room')} or ${link('/', 'open the tracker')}.</p></main>${footer('')}</body></html>\n`);
await writeFile(new URL('sitemap.xml', build), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ path }) => `  <url><loc>${escape(origin + path)}</loc></url>`).join('\n')}
</urlset>\n`);
console.log(`Generated ${pages.length} public pages covering ${hallList.length} buildings and ${rooms.length} rooms.`);
