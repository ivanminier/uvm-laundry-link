import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { CAMPUS_SECTIONS, groupCampusRooms } from '../src/campusDirectory.mjs';
import { hallName, hallSlug, roomPath } from '../src/roomLinks.mjs';
import { independenceDisclosure, trackerTitle, homeScreenSteps, informationDisclosure, informationPath, informationQuestions, informationResources, urgentMachinePhone, urgentMachineTel } from '../src/informationContent.mjs';
import { checkSources } from './check-sources.mjs';
import { articles, handbook, legalArticles, service } from './site-content.mjs';
import { accessQualifier, accessStatement, complexFullNames, coverageNote, locationLine, locationPhrase, machineInventory, roomLocation, sharedFacilities } from '../src/roomLocations.mjs';

const origin = 'https://uvmlaundry.com';
const development = process.argv.includes('--dev');
const build = new URL(development ? '../public/' : '../build/', import.meta.url);
const rooms = JSON.parse(await readFile(new URL('../src/laundryRooms.json', import.meta.url)));
const history = JSON.parse(await readFile(new URL('../src/peakTimesSnapshot.json', import.meta.url)));
const health = process.env.SITE_CHECK_SOURCES === '1' ? await checkSources()
  : JSON.parse(await readFile(new URL('../src/serviceHealthSnapshot.json', import.meta.url)));
const campusNames = Object.fromEntries(CAMPUS_SECTIONS);
const campusPlace = (id) => `${campusNames[id]} ${id === 'north' ? 'Campuses' : 'Campus'}`;
const themeScript = `<script id="laundrylink-theme-init">
(() => {
  const root = document.documentElement;
  const readPreference = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => {
    const dark = readPreference('uvmLaundryUseSystemTheme', true)
      ? systemTheme.matches : readPreference('uvmLaundryManualDarkMode', false);
    root.classList.toggle('dark', dark);
    root.dataset.theme = dark ? 'dark' : 'light';
  };
  applyTheme();
  systemTheme.addEventListener('change', () => {
    if (readPreference('uvmLaundryUseSystemTheme', true)) applyTheme();
  });
  window.addEventListener('storage', applyTheme);
})();
</script>`;
const escape = (value) => String(value).replace(/[&<>"']/g, (character) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
const slugify = (text) => text.toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const trackerLink = (room) => '/' + roomPath(room);
const header = () => `<header class="ll-site-header"><div class="ll-header-inner"><div class="ll-header-row">
  <a href="/" class="ll-brand"><img src="/brand-mark.svg" alt="" aria-hidden="true" class="ll-brand__mark"><span class="ll-brand__name">UVM LaundryLink</span></a>
  <div class="ll-header-actions">
    <a class="ll-icon-button" href="/?view=my-laundry" aria-label="My Laundry" title="My Laundry"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></a>
    <a class="ll-icon-button" href="${informationPath}" aria-label="Information" title="Information"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></a>
    <a class="ll-icon-button" href="/?view=settings" aria-label="Settings" title="Settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></a>
  </div>
</div></div></header>`;
const list = (items, style) => `<ul class="${style}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const dateText = (value) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short',
}).format(new Date(value)) + ' Eastern';
const time = (value) => `<time datetime="${escape(value)}">${escape(dateText(value))}</time>`;

const halls = new Map();
const hallByRoom = new Map();
for (const room of rooms) {
  const name = hallName(room);
  const slug = hallSlug(name);
  if (!halls.has(slug)) halls.set(slug, { name, slug, campus: room.campus, rooms: [] });
  const hall = halls.get(slug);
  hall.rooms.push(room);
  hallByRoom.set(room.id, hall);
}
const hallList = [...halls.values()].sort((a, b) => a.name.localeCompare(b.name));
const hallUrl = ({ slug }) => `/residence-halls/${slug}/`;
const directoryCampuses = CAMPUS_SECTIONS.map(([id, name]) => {
  const campusRooms = rooms.filter(room => room.campus === id).sort((a, b) =>
    (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name, undefined, { numeric: true }));
  const complexes = groupCampusRooms(campusRooms, id).map(({ title, rooms: group }) => ({
    title, rooms: group,
    path: `/residence-halls/complexes/${id}-${slugify(title)}/`,
    halls: [...new Set(group.map(room => hallByRoom.get(room.id)))],
  }));
  return { id, name, path: `/residence-halls/campuses/${slugify(name)}/`, complexes };
});
const campusById = new Map(directoryCampuses.map(campus => [campus.id, campus]));
const directoryComplexes = directoryCampuses.flatMap(({ complexes }) => complexes);
const complexByRoom = new Map(directoryComplexes.flatMap(complex => complex.rooms.map(room => [room.id, complex])));
const arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>';
const roomLinkLabel = (room) => room.id.startsWith('lll_')
  ? [room.displayName, room.locationLabel].filter(Boolean).join(' · ')
  : room.locationLabel ?? 'Live room tracker';
const entryCard = (href, title, detail, action, hall) => `<li class="ll-room-card">
  <div class="ll-room-card__topline"><div>
    <h3 class="ll-room-card__heading"><a class="ll-room-card__title" href="${escape(href)}"${detail ? ` aria-label="${escape(title + ' · ' + detail)}"` : ''}>${escape(title)}</a></h3>
    ${detail ? `<p class="ll-room-card__location">${escape(detail)}</p>` : ''}
  </div>
    ${hall ? `<a class="ll-room-card__favorite site-room-info" href="${hallUrl(hall)}" aria-label="${escape(hall.name + ' information')}" title="${escape(hall.name + ' information')}"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg></a>` : ''}
  </div>
  <span class="ll-room-card__action" aria-hidden="true">${action} ${arrow}</span>
</li>`;
const sitemapHallCard = (hall) => `<li class="ll-room-card site-map-card">
  <div class="ll-room-card__topline"><div>
    <h4 class="ll-room-card__heading"><a class="ll-room-card__title" href="${hallUrl(hall)}">${escape(hall.name)}</a></h4>
  </div></div>
  ${list(hall.rooms.map(room => link(trackerLink(room), roomLinkLabel(room))), 'site-map-room-links')}
</li>`;
const complexCards = (complexes) => `<ul class="ll-room-grid site-complex-grid">${complexes.map(complex => entryCard(
  complex.path, complex.title, `${complex.rooms.length} laundry ${complex.rooms.length === 1 ? 'room' : 'rooms'}`, 'View rooms'
)).join('')}</ul>`;
const campusDirectory = (showRooms = false) => directoryCampuses.map(({ id, name, path: campusPath, complexes }) =>
  `<section class="ll-campus-section" id="${id}" aria-labelledby="${id}-title">
    <h2 class="ll-campus-section__title" id="${id}-title">${link(campusPath, name)}</h2>
    ${showRooms ? complexes.map(({ title, path, halls }) => {
      const headingId = id + '-' + slugify(title);
      return `<section class="ll-complex-section" aria-labelledby="${id}-title ${headingId}">
        <h3 class="ll-complex-section__title" id="${headingId}">${link(path, title)}</h3>
        <ul class="ll-room-grid">${halls.map(sitemapHallCard).join('')}</ul>
      </section>`;
    }).join('') : complexCards(complexes)}
  </section>`).join('');

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
  if (page.about) content.about = page.about;
  if (page.path === '/residence-halls/') content.mainEntity = {
    '@type': 'ItemList', itemListElement: directoryComplexes.map((complex, index) =>
      ({ '@type': 'ListItem', position: index + 1, name: complex.title, url: origin + complex.path })),
  };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
};

const meta = (type, name, value) => `<meta ${type}="${name}" content="${escape(value)}">`;
function head(page) {
  const fullUrl = origin + page.path;
  return `<title>${escape(page.title)}</title>
  ${themeScript}
  ${meta('name', 'description', page.description)}
  <link rel="canonical" href="${fullUrl}">
  ${meta('property', 'og:site_name', 'UVM LaundryLink')}
  ${meta('property', 'og:title', page.title)}
  ${meta('property', 'og:description', page.description)}
  ${meta('property', 'og:url', fullUrl)}
  ${meta('property', 'og:type', 'website')}
  ${meta('property', 'og:image', origin + '/logo512.png')}
  ${meta('property', 'og:image:alt', 'UVM LaundryLink independent laundry tracker mark')}
  <link rel="stylesheet" href="/site.css">
  ${page.path !== '/' ? '<link rel="stylesheet" href="/room-directory.css">' : ''}
  <script src="/referrals.js" defer></script>
  ${page.path !== '/' ? '<script src="/scroll-edge.js" defer></script>' : ''}
  <script type="application/ld+json">${pageSchema(page)}</script>`;
}

const siteTrail = [['/', 'UVM LaundryLink']];
const hallTrail = [...siteTrail, ['/residence-halls/', 'Laundry directory']];
function content(page) {
  const mainClasses = page.layout
    ? `site-wrap site-main site-app-view site-${page.layout} animate-fadeIn`
    : 'site-wrap site-main';
  const heading = `<h1>${escape(page.heading)}</h1>`;
  return `${header()}<main class="${mainClasses}">
    ${page.backHref ? `<div class="site-page-header">${heading}<a class="site-back-button" href="${escape(page.backHref)}">${arrow} Back</a></div>` : heading}
    <p class="site-intro">${escape(page.intro)}</p>${page.html}
    </main>`;
}

const home = {
  path: '/', title: trackerTitle, heading: 'UVM residence hall laundry tracker',
  description: 'Find your University of Vermont residence hall laundry room. Check washer and dryer status, see Peak Times, and set cycle alerts with UVM LaundryLink.',
  intro: `Find laundry at ${hallList.length} UVM residence hall buildings or complexes across ${Object.keys(campusNames).length} campus areas. ${independenceDisclosure}`,
  html: `<p class="site-note">Live machine status and alerts require JavaScript. The campus directory and hall pages work without it.</p>
    <h2>Find your laundry room</h2><p>${link('/residence-halls/', 'Browse the full campus laundry directory')} or pick a campus below.</p>
    ${list(directoryCampuses.map(({ path, name }) => link(path, name)), 'campus-grid')}
    <h2>How to track laundry at UVM</h2><p>Choose your hall, open the live room tracker, and check which washers or dryers are available. A running machine can show time remaining and offer a cycle alert. Open ${link(informationPath, 'Information')} for help with statuses and alerts.</p>`,
};
const directory = {
  path: '/residence-halls/', title: 'UVM Campus Laundry Directory | UVM LaundryLink',
  heading: 'UVM campus laundry directory', description: 'Find UVM residence hall laundry rooms by campus. Open your hall’s page for floor, tower, and room options and live machine tracking.',
  intro: 'Browse by campus and complex to find your laundry room and open the tracker.',
  trail: siteTrail, type: 'CollectionPage', layout: 'directory',
  html: `${campusDirectory()}<p class="site-note">${escape(coverageNote)}</p>`,
};
const campusPages = directoryCampuses.map(({ id, path, complexes }) => {
  const count = complexes.reduce((total, complex) => total + complex.rooms.length, 0);
  const place = `${id === 'north' ? 'the ' : ''}${campusPlace(id)}`;
  const heading = `Laundry on ${place}`;
  return {
    path, title: `${heading} | UVM LaundryLink`, heading,
    description: `Browse laundry complexes and residence halls serving ${campusPlace(id)} at the University of Vermont.`,
    intro: `Browse ${count} laundry rooms by complex on ${place}.`,
    trail: hallTrail, layout: 'directory', type: 'CollectionPage', backHref: '/residence-halls/',
    html: `<section aria-labelledby="campus-complexes"><h2 class="ll-campus-section__title" id="campus-complexes">Complexes</h2>${complexCards(complexes)}</section>`,
  };
});
const complexPages = directoryCampuses.flatMap(({ id, name, path: campusPath, complexes }) => complexes.map(complex => {
  const otherBuildings = complex.title === 'Other Buildings';
  const complexName = complex.title.replace(/^The /, '').replace(/ Complex$/, '');
  const heading = otherBuildings ? `Other Buildings on ${campusPlace(id)}` : `Laundry in the ${complexName} complex`;
  return {
    path: complex.path, title: `${heading} | UVM LaundryLink`, heading,
    description: `Find laundry rooms in ${complex.title} on ${name} at UVM. Open a room to check washer and dryer availability.`,
    intro: `${name} · ${complex.rooms.length} laundry ${complex.rooms.length === 1 ? 'room' : 'rooms'}`,
    trail: [...hallTrail, [campusPath, name]], layout: 'directory', type: 'CollectionPage', backHref: campusPath,
    html: `<section aria-labelledby="complex-rooms">
      <h2 class="ll-campus-section__title" id="complex-rooms">Laundry rooms</h2>
      <ul class="ll-room-grid site-complex-grid">${complex.rooms.map(room =>
        entryCard(trackerLink(room), room.displayName ?? room.name, room.locationLabel, 'View room', hallByRoom.get(room.id))).join('')}</ul>
    </section>`,
  };
}));

const formatList = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });
const officialRoomUrl = (room) => {
  const historyId = room.historyId ?? rooms.find(({ id }) => id === room.historyRoomId)?.historyId;
  return historyId ? `https://laundryconnectlive.com/live/${historyId}` : room.url;
};
const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
// Card headings name the building, tower, or floor; the Location line gives the room number.
const hallRoomTitle = (room) => {
  const { designation, building } = roomLocation(room);
  return room.id.startsWith('lll_') || !designation ? building : designation;
};
const hallPages = hallList.map((hall) => {
  const central = hall.slug === 'central-campus-residence-hall';
  const single = hall.rooms.length === 1;
  const complex = complexByRoom.get(hall.rooms[0].id);
  const hasComplex = complex && complex.title !== 'Other Buildings';
  const campus = campusById.get(hall.campus);
  const complexName = hasComplex && !central ? complex.title : null;
  const complexDetail = complexName && complexFullNames[complexName] ? ` (${complexFullNames[complexName]})` : '';
  const complexLocation = complexName
    ? ` in ${complexName.startsWith('The ') ? '' : 'the '}${complexName}${complexName.endsWith(' Complex') ? '' : ' complex'}${complexDetail}`
    : '';
  const campusLocation = hall.campus === 'north' ? 'in the Trinity and North campus area' : `on ${campusPlace(hall.campus)}`;
  const washers = hall.rooms.reduce((total, room) => total + roomLocation(room).washers, 0);
  const dryers = hall.rooms.reduce((total, room) => total + roomLocation(room).dryers, 0);
  const subject = hall.name.endsWith('s') ? `The laundry room at ${hall.name}` : `${hall.name}’s laundry room`;
  const intro = single
    ? `${subject} is ${locationPhrase(hall.rooms[0])}${complexLocation ? ',' + complexLocation : ''} ${campusLocation}.`
    : `${hall.name} has ${hall.rooms.length} laundry rooms${complexLocation} ${campusLocation}: ${formatList.format(
      // Cloudflare Pages builds with Node 18, which lacks Map.groupBy.
      [...hall.rooms.reduce((groups, room) => groups.set(hallRoomTitle(room), [...(groups.get(hallRoomTitle(room)) ?? []), room]), new Map())].map(([title, group]) =>
        `${title} (${group.length === 1 ? 'Room' : 'Rooms'} ${formatList.format(group.flatMap((room) => roomLocation(room).rooms))})`))}.`;
  const description = single
    ? `${hall.name} laundry at UVM is ${locationPhrase(hall.rooms[0])}, with ${machineInventory(hall.rooms[0])} on record. Check live washer and dryer availability.`
    : `${hall.name} laundry at UVM: ${hall.rooms.length} laundry rooms with ${plural(washers, 'washer')} and ${plural(dryers, 'dryer')} on record. See each room’s floor and room number, then check live availability.`;
  const splitNote = central
    ? '<p class="site-note">UVM LaundryLink groups machine numbers 45–55 under Floor 6 and 56–62 under Floor 7. LaundryConnect Live lists those two floors together, including their shared Peak Times history.</p>' : '';
  const roomCards = list(hall.rooms.map((room) => {
    const location = roomLocation(room);
    return `<h3>${escape(hallRoomTitle(room))}</h3>
      <dl class="hall-room-facts">
        <div><dt>Location</dt><dd>${escape(locationLine(room))}</dd></div>
        <div><dt>Machines on record</dt><dd>${escape(plural(location.washers, 'washer'))} · ${escape(plural(location.dryers, 'dryer'))}</dd></div>
      </dl>
      ${location.note ? `<p class="hall-room-note">${escape(location.note)}</p>` : ''}
      <p>${link(trackerLink(room), 'Check live machines')} · ${link(officialRoomUrl(room), 'Official room view')}</p>`;
  }), 'hall-grid');
  const sharedNotes = [...new Set(hall.rooms.map((room) => roomLocation(room).shared).filter(Boolean))]
    .map((key) => `<p>${escape(sharedFacilities[key])}</p>`).join('');
  return {
    path: hallUrl(hall), trail: [...hallTrail, [campus.path, campus.name]], title: `${hall.name} Laundry at UVM | UVM LaundryLink`,
    heading: `${hall.name} laundry`, layout: 'hall', backHref: complex?.path ?? campus.path,
    description,
    intro,
    about: hall.rooms.map((room) => ({
      '@type': 'Place',
      name: `${roomLocation(room).building}${roomLocation(room).designation ? ' ' + roomLocation(room).designation : ''} laundry, ${locationLine(room).split(' · ').pop()}`,
      description: `${locationLine(room)}. ${machineInventory(room).replace(/^./, (first) => first.toUpperCase())} on record.`,
      containedInPlace: { '@type': 'Place', name: roomLocation(room).building },
    })),
    html: `<h2>${single ? 'Laundry room' : 'Laundry rooms'}</h2>${roomCards}
      <p class="site-note">Machines on record come from the equipment list Automatic Laundry reports for each room. They are not live availability. Open the tracker to see which machines are free right now.</p>${splitNote}
      <h2>Access</h2>${sharedNotes}
      <p>${escape(accessStatement)}${sharedNotes ? ' ' + escape(accessQualifier) : ''} See ${link(handbook, 'UVM’s Hallways Handbook')} for residence hall rules.</p>
      <h2>Reporting a problem</h2>
      <p>For repairs, include the machine number and room when you ${link(service, 'request service from Automatic Laundry')}.</p>
      <nav class="site-page-actions" aria-label="Room directories">
        <a class="site-page-action" href="${campus.path}">${escape(campus.name)} campus directory</a>
        ${hasComplex ? `<a class="site-page-action" href="${complex.path}">${escape(complex.title)} directory</a>` : ''}
      </nav>`,
  };
});

const status = {
  path: '/status/', title: 'UVM LaundryLink Service Status and Data Sources', heading: 'UVM LaundryLink service status',
  description: 'See when UVM laundry sources were last checked, how to recognize saved machine status, and where to go during an outage.',
  intro: 'Check the latest automated results and see what each machine status means.',
  layout: 'status', trail: siteTrail,
  html: `<div role="status">
    <p id="status-offline" class="site-offline-notice" hidden><strong>You’re offline.</strong> Showing the last saved service checks.</p>
  </div>
  <script>
    (() => {
      const notice = document.getElementById('status-offline');
      const updateConnection = () => { notice.hidden = navigator.onLine !== false; };
      window.addEventListener('online', updateConnection);
      window.addEventListener('offline', updateConnection);
      updateConnection();
    })();
  </script>
  <div class="site-panel-grid">
    <section class="site-panel site-panel-wide">
      <h2>Last automated checks</h2>
      <p>Checked ${time(health.checkedAt)}.</p>
      <dl class="site-status-metrics">
        <div><dt>Room status feeds</dt><dd><strong>${health.checkedFeeds} of ${health.totalFeeds}</strong><span>Machine status feed responded with status data for ${health.checkedFeeds} of ${health.totalFeeds} provider rooms.</span></dd></div>
        <div><dt>Machine directory</dt><dd><strong>${health.directory ? 'Responded' : 'Unavailable'}</strong><span>The sample directory request ${health.directory ? 'returned a usable machine list' : 'did not return a usable machine list'}.</span></dd></div>
        <div><dt>Push configuration</dt><dd><strong>${health.pushConfiguration ? 'Responded' : 'Unverified'}</strong><span>The check covers configuration. Delivery depends on the browser and room feed.</span></dd></div>
      </dl>
      <p>Peak Times history fetched ${time(history.capturedAt)}.</p>
    </section>
    <section class="site-panel">
      <h2>Read your room status</h2>
      <dl class="site-status-meanings">
        <div><dt>Live</dt><dd>The tracker fetched status from the provider at the time shown in your room.</dd></div>
        <div><dt>Saved snapshot</dt><dd>Your device is showing an earlier check. Look at its timestamp before heading downstairs.</dd></div>
        <div><dt>Unavailable</dt><dd>No usable status is available. Try refreshing or open the official room view from the ${link('/residence-halls/', 'campus directory')}.</dd></div>
      </dl>
    </section>
    <section class="site-panel">
      <h2>Alerts and repairs</h2>
      <p>Push alerts use your browser’s permissions and the live room feed. Automatic Laundry supplies text and email options through its embedded form.</p>
      <p>For a broken machine, include the room and machine number when you ${link(service, 'request service from Automatic Laundry')}.</p>
    </section>
  </div>`,
};
const articlePages = [...articles, ...legalArticles].map((page) => ({
  ...page, path: `/${page.slug}/`, heading: page.title, title: `${page.title} | UVM LaundryLink`,
  trail: siteTrail, html: page.layout ? page.html : `<div class="site-copy">${page.html}</div>`,
}));
const informationParts = (parts) => parts.map((part) => {
  if (typeof part === 'string') return escape(part);
  return part.href ? link(part.href, part.label) : `<strong>${escape(part.emphasis)}</strong>`;
}).join('');
const information = {
  path: informationPath, title: 'UVM Laundry Information and FAQ | UVM LaundryLink', heading: 'Information',
  description: 'Learn how to do laundry at UVM, find residence hall washers and dryers, read Peak Times, get cycle alerts, and request repairs.',
  intro: 'Find your UVM laundry room, check for open machines, and get help with alerts and repairs.',
  layout: 'information', trail: siteTrail, backHref: '/',
  html: `<section class="site-panel site-information-panel">
    <h2>Frequently Asked Questions</h2>
    ${informationQuestions.map(([question, answer, afterHomeScreenSteps, definitions]) => `<details>
      <summary>${escape(question)}</summary>
      <div><p>${informationParts(answer)}</p>
        ${definitions ? `<dl>${definitions.map(([label, meaning]) => `<div><dt><strong>${escape(label)}</strong></dt><dd>${escape(meaning)}</dd></div>`).join('')}</dl>` : ''}
        ${afterHomeScreenSteps ? `<ol>${homeScreenSteps.map(step => `<li>${informationParts(step)}</li>`).join('')}</ol><p>${escape(afterHomeScreenSteps)}</p>` : ''}
      </div></details>`).join('')}
    <h2>More Resources</h2>
    ${list(informationResources.map(([label, href]) => link(href, label)), 'site-information-resources')}
    <p>For urgent machine issues, call ${link(urgentMachineTel, urgentMachinePhone)}.</p>
    <p class="site-information-disclosure">${informationParts(informationDisclosure)}</p>
  </section>`,
};
const sitemapPage = {
  path: '/sitemap/', title: 'UVM LaundryLink Site Map', heading: 'Site map',
  description: 'Browse every UVM LaundryLink page, including campus laundry rooms, service information, and site details.',
  intro: 'Find every public page, residence hall, and individual room in UVM LaundryLink.',
  layout: 'directory', trail: siteTrail,
  html: `<section class="site-panel site-map-pages"><h2>Key pages</h2>${list([
    link('/about/', 'About UVM LaundryLink'),
    link('/residence-halls/', 'Campus laundry directory'),
    link('/compare/', 'Compare trackers'),
    link(informationPath, 'Information'),
    link('/', 'Laundry tracker home'),
    link('/?view=my-laundry', 'My Laundry'),
    link('/status/', 'Service status'),
    link('/privacy/', 'Privacy Policy'),
    link('/terms/', 'Terms of Use'),
    link('/?view=settings', 'Settings'),
  ], 'site-map-key-links')}</section>${campusDirectory(true)}`,
};
const pages = [home, directory, ...campusPages, ...complexPages, ...hallPages, ...articlePages, status, information, sitemapPage];

const verifications = [
  ['google-site-verification', process.env.GOOGLE_SITE_VERIFICATION],
  ['msvalidate.01', process.env.BING_SITE_VERIFICATION],
].filter(([, token]) => token).map(([name, token]) => meta('name', name, token)).join('');
if (!development) {
  const workerFile = new URL('service-worker.js', build);
  const manifest = JSON.parse(await readFile(new URL('asset-manifest.json', build), 'utf8'));
  const entrypoints = manifest.entrypoints.map(asset => '/' + asset.replace(/^\//, ''));
  const worker = await readFile(workerFile, 'utf8');
  if (!worker.includes('const APP_ENTRYPOINTS = [];') || !entrypoints.length) throw new Error('Expected app shell assets');
  await writeFile(workerFile, worker.replace('const APP_ENTRYPOINTS = [];', `const APP_ENTRYPOINTS = ${JSON.stringify(entrypoints)};`));
  const homeFile = new URL('index.html', build);
  const appShell = await readFile(homeFile, 'utf8');
  if (!/<div id="root"><\/div>/.test(appShell) || !/<title>.*?<\/title>/.test(appShell)) throw new Error('Expected React build template');
  await writeFile(homeFile, appShell
    .replace(/<title>.*?<\/title>/, () => head(home) + verifications)
    .replace('<div id="root"></div>', () => `<div id="root"><div class="public-page">${content(home)}</div></div>`));
}

for (const page of pages.slice(1)) {
  const dir = new URL(page.path.slice(1), build);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#154734"><link rel="icon" type="image/svg+xml" href="/favicon.svg">${head(page)}</head>
<body class="public-page">${content(page)}</body></html>\n`);
}
await Promise.all(['laundry-guide', 'faq', 'residence-halls/austin-hall'].map(path =>
  rm(new URL(path + '/index.html', build), { force: true })));
await writeFile(new URL('404.html', build), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Page not found | UVM LaundryLink</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/site.css">
<link rel="stylesheet" href="/room-directory.css"><script src="/scroll-edge.js" defer></script>${themeScript}</head>
<body class="public-page">${header()}<main class="site-wrap site-main site-app-view animate-fadeIn">
  <section class="site-panel site-not-found">
    <h1>Page not found</h1>
    <p>This link doesn’t match a laundry room or page. Choose your room from the directory or return to the tracker.</p>
    <div class="site-page-actions">
      <a class="site-page-action" href="/residence-halls/">Browse the campus directory</a>
      <a class="site-page-action" href="/">Return to the tracker</a>
    </div>
  </section>
</main></body></html>\n`);
await writeFile(new URL('sitemap.xml', build), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ path }) => `  <url><loc>${escape(origin + path)}</loc></url>`).join('\n')}
</urlset>\n`);
console.log(`Generated ${pages.length} public pages covering ${hallList.length} buildings and ${rooms.length} rooms.`);
