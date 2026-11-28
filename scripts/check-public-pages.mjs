import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hallGuidePath, roomPath } from '../src/roomLinks.mjs';
import { locationLine, roomLocations } from '../src/roomLocations.mjs';
import { CAMPUS_SECTIONS, groupCampusRooms } from '../src/campusDirectory.mjs';
import { independenceDisclosure, informationDisclosure, machineStatusDefinitions, informationPath, informationQuestions } from '../src/informationContent.mjs';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const laundryRooms = JSON.parse(await readFile(new URL('../src/laundryRooms.json', import.meta.url)));
const complexTitles = new Map(CAMPUS_SECTIONS.flatMap(([campus]) => groupCampusRooms(laundryRooms.filter((room) => room.campus === campus), campus)
  .flatMap(({ title, rooms: group }) => group.map((room) => [room.id, title]))));

const canonicalOrigin = 'https://uvmlaundry.com';
const endpoint = process.argv[2];
const origin = endpoint ? new URL(endpoint).origin : canonicalOrigin;
const build = new URL('../build/', import.meta.url);
const headerRules = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
const enforcedHeaders = [...headerRules.matchAll(/^[ \t]*Content-Security-Policy:[ \t]*(.+)$/gmi)];
assert.equal(enforcedHeaders.length, 1, 'One enforced Content-Security-Policy in _headers');
assert.doesNotMatch(headerRules, /^[ \t]*Content-Security-Policy-Report-Only:/mi);
const enforcedPolicy = enforcedHeaders[0][1].trim();
const directives = new Map(enforcedPolicy.split(';').map((directive) => {
  const [name, ...sources] = directive.trim().split(/\s+/);
  return [name, sources];
}));
assert.deepEqual(directives.get('frame-ancestors'), ["'none'"], 'Disallow embedding LaundryLink');
const scriptSources = directives.get('script-src-elem') ?? directives.get('script-src');
assert.ok(scriptSources, 'Enforced CSP includes a script source list');
if (!endpoint) {
  assert.equal(await readFile(new URL('_headers', build), 'utf8'), headerRules, 'Build includes the enforced headers');
}
const scriptHash = (body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
function checkInlineScripts(html, path) {
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (body.trim() && !/\bsrc=|type="application\/ld\+json"/.test(attributes)) {
      assert.ok(scriptSources.includes(scriptHash(body)), `CSP permits inline script on ${path}`);
    }
  }
}
async function read(path, expectedStatus = 200, userAgent) {
  if (!endpoint) {
    return readFile(new URL(path.slice(1) + (path.endsWith('/') ? 'index.html' : ''), build), 'utf8');
  }
  const response = await fetch(origin + path, {
    redirect: 'manual', signal: AbortSignal.timeout(10_000),
    ...(userAgent && { headers: { 'User-Agent': userAgent } }),
  });
  assert.equal(response.status, expectedStatus, path);
  if (expectedStatus === 200) assert.doesNotMatch(response.headers.get('x-robots-tag') ?? '', /noindex/i, path);
  const body = await response.text();
  if (origin === canonicalOrigin && response.headers.get('content-type')?.includes('text/html')) {
    assert.equal(response.headers.get('content-security-policy'), enforcedPolicy, path);
    assert.equal(response.headers.get('content-security-policy-report-only'), null, path);
  }
  return body;
}

const routes = Array.from((await read('/sitemap.xml')).matchAll(/<loc>(.*?)<\/loc>/g), (match) => new URL(match[1]));
const paths = new Set(routes.map(({ pathname }) => pathname));
assert.equal(routes.length, paths.size, 'Unique sitemap entries');
assert.equal(paths.size, 55, 'Canonical public routes');
assert.ok(!paths.has('/laundry-guide/') && !paths.has('/faq/'), 'Retired pages have no sitemap entry');
for (const path of ['/', '/residence-halls/', '/residence-halls/wright-hall/', '/residence-halls/marsh-and-austin-hall/', '/residence-halls/living-learning/', '/status/', '/about/', '/compare/', '/sitemap/', '/privacy/', '/terms/', informationPath]) {
  assert.ok(paths.has(path), path);
}
const titles = new Set();
const descriptions = new Set();
for (let index = 0; index < routes.length; index += 6) {
  await Promise.all(routes.slice(index, index + 6).map(async ({ pathname, href }) => {
    const body = await read(pathname);
    checkInlineScripts(body, pathname);
    assert.ok(href.startsWith(canonicalOrigin + '/') && pathname.endsWith('/'), href);
    assert.ok(body.includes(`rel="canonical" href="${href}"`), pathname);
    assert.ok(body.includes(`property="og:url" content="${href}"`), pathname);
    assert.match(body, /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/, pathname);
    assert.match(body, /id="laundrylink-theme-init"/, pathname);
    assert.equal((body.match(/<script src="\/scroll-edge\.js"/g) ?? []).length, 1, pathname);
    assert.doesNotMatch(body, /noindex|You need to enable JavaScript/i, pathname);
    assert.doesNotMatch(body, /aria-label="Laundry resources"|href="\/(?:laundry-guide|faq)\//, pathname);
    assert.equal((body.match(/<h1>/g) ?? []).length, 1, pathname);
    const title = body.match(/<title>(.*?)<\/title>/)?.[1];
    const description = body.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && description, pathname);
    assert.ok(!titles.has(title) && !descriptions.has(description), `Unique metadata for ${pathname}`);
    titles.add(title);
    descriptions.add(description);
    const json = body.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
    const structured = JSON.parse(json);
    assert.equal(structured['@context'], 'https://schema.org');
    const header = body.match(/<header class="ll-site-header">([\s\S]*?)<\/header>/)?.[1];
    assert.ok(header, `Shared header on ${pathname}`);
    assert.match(header, /<img src="\/brand-mark\.svg"/, pathname);
    assert.deepEqual(Array.from(header.matchAll(/aria-label="([^"]+)"/g), ([, label]) => label),
      ['My Laundry', 'Information', 'Settings'], `Header actions on ${pathname}`);
    assert.doesNotMatch(body, /<footer\b/, pathname);
    for (const [, target] of body.matchAll(/<a [^>]*href="(\/[^"#]*)(?:#[^"]*)?"/g)) {
      const targetPath = new URL(target, canonicalOrigin).pathname;
      if (pathname === '/about/' && targetPath === '/cdn-cgi/l/email-protection') continue;
      assert.ok(paths.has(targetPath), `Broken link on ${pathname}: ${target}`);
    }
    if (pathname.startsWith('/residence-halls/') && pathname !== '/residence-halls/' && !pathname.includes('/campuses/')) {
      assert.match(body, /href="\/#room\//, pathname);
    }
  }));
}

const about = await read('/about/');
assert.match(about, /Independent student project by Ivan Minier · \d{4}/);
assert.match(about, /operates independently of the University of Vermont and Automatic Laundry/);
assert.match(about, /based on data reported by Automatic Laundry/);
const feedbackLink = about.match(/href="([^"]+)">email Ivan Minier<\/a>/)?.[1];
const protectedEmail = feedbackLink?.match(/^\/cdn-cgi\/l\/email-protection#([0-9a-f]+)$/i)?.[1];
let feedbackAddress = feedbackLink?.replace(/^mailto:/, '');
if (protectedEmail) {
  // Cloudflare obfuscates mailto links on the production domain.
  const [key, ...bytes] = Buffer.from(protectedEmail, 'hex');
  feedbackAddress = Buffer.from(bytes.map(byte => byte ^ key)).toString('utf8');
}
assert.equal(feedbackAddress, 'ivan.minier@uvm.edu');
const privacy = await read('/privacy/');
const terms = await read('/terms/');
assert.match(privacy, /Alerts expire after four hours/);
assert.match(privacy, /A pending alert can still be active on the alerts service/);
assert.match(privacy, /no automatic expiration set for these counts/);
assert.match(privacy, /It still counts aggregate push outcomes/);
assert.match(privacy, /If this Privacy Policy changes, the effective date on this page will be updated/);
assert.match(privacy, /<h2>Contact and privacy requests<\/h2>/);
assert.equal((privacy.match(/<h2>Contact\b/g) ?? []).length, 1, 'One Privacy Policy contact section');
for (const sentence of [
  'You may contact me to request access to or deletion of identifiable information held by LaundryLink.',
  'I may need additional information to identify relevant records and verify that a request relates to your own information.',
  'Alerts expire after four hours and are removed through the service’s existing cleanup process.',
  'These counts cannot reliably be associated with or removed for an individual user.',
  'LaundryLink does not directly control all information retained by these services.',
  'I receive your email address and message and use that information to respond to and manage your request.',
]) assert.ok(privacy.includes(sentence), sentence);
assert.match(terms, /Reasonable use and availability/);
assert.match(terms, /To the extent permitted by applicable law/);
assert.match(terms, /These terms may change/);
for (const text of [about, await read(informationPath), await read('/sitemap/')]) {
  assert.match(text, /href="\/privacy\/">Privacy Policy<\/a>/);
  assert.match(text, /href="\/terms\/">Terms of Use<\/a>/);
}
for (const text of [privacy, terms]) assert.match(text, /href="\/about\/">About UVM LaundryLink<\/a>/);
const compare = await read('/compare/');
assert.doesNotMatch(compare, /filter by campus|search for a machine number|filter by status/);
for (const fact of [/Search or browse the UVM room selector/, /Save Room option/, /browser push notification option for finished laundry/,
  /email or text notice when the cycle finishes or about five minutes early/, /weekly heatmap and its busiest and quietest hours/,
  /problem report and a full service request/, /laundry tips, and FAQs/]) assert.match(compare, fact);
const cottages = await read('/residence-halls/the-cottages/');
// Hall guides: every tracker's location, inventory, and clean tracker link.
const hallPages = new Map();
for (const room of laundryRooms) {
  const guide = hallGuidePath(room);
  if (!hallPages.has(guide)) hallPages.set(guide, await read(guide));
  const page = hallPages.get(guide);
  const { washers, dryers } = roomLocations[room.id];
  assert.ok(page.includes(locationLine(room)), `${guide} lists ${locationLine(room)}`);
  assert.ok(page.includes(`href="/${roomPath(room)}"`), `${guide} links ${roomPath(room)}`);
  assert.ok(page.includes(`${washers} washer${washers === 1 ? '' : 's'} · ${dryers} dryer${dryers === 1 ? '' : 's'}`), `${guide} inventory for ${room.id}`);
}
assert.equal(hallPages.size, 30, 'Thirty hall guides');
// Complex pages show each room's location line next to its existing tracker link.
for (const room of laundryRooms) {
  const complexPage = await read(`/residence-halls/complexes/${room.campus}-${(complexTitles.get(room.id) ?? 'Other Buildings').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`);
  assert.ok(complexPage.includes(locationLine(room)), `Complex page lists ${room.id} ${locationLine(room)}`);
  assert.ok(complexPage.includes(`href="/${roomPath(room)}"`), `Complex page links ${room.id}`);
}
for (const [guide, page] of hallPages) {
  assert.doesNotMatch(page, /\?view=[a-z-]+#room|public(?:ly)? access/i, guide);
  assert.match(page, /Residence hall laundry rooms are for authorized residents\./, guide);
  assert.match(page, /not live availability/, guide);
  assert.match(page, /"about":\[\{"@type":"Place"/, guide);
}
assert.match(hallPages.get('/residence-halls/simpson-hall/'), /Ground floor · Room 201G/);
for (const hall of ['hunt', 'mccann', 'ready', 'richardson', 'sichel']) {
  assert.doesNotMatch(await read(`/residence-halls/${hall}-hall/`), /McAuley/, `${hall} has its own laundry room`);
}
assert.match(hallPages.get('/residence-halls/wright-hall/'), /serves authorized residents of the CWPSCR complex/);
for (const page of [await read('/residence-halls/'), await read(informationPath)]) {
  for (const property of ['Hillel', 'Room 202B', 'Redstone Lofts', 'Redstone Commons', 'Catamount Run Apartments', 'University Commons at Catamount Run', 'Spinner Place']) {
    assert.ok(page.includes(property), property);
  }
  assert.doesNotMatch(page, /#room\/(?:hillel|redstone-lofts|redstone-commons|spinner|catamount|university-commons)/);
}
assert.doesNotMatch(cottages, /s’s laundry/);
assert.match(cottages, /The laundry room at The Cottages is /);
const manifest = JSON.parse(await read('/manifest.json'));
assert.equal(manifest.name, 'UVM LaundryLink');
assert.equal(manifest.start_url, './?source=pwa');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.icons.length, 3);
assert.equal('iarc_rating_id' in manifest, false);
const status = await read('/status/');
assert.match(status, /Machine status feed responded with status data for \d+ of \d+ provider rooms\./);
assert.match(status, /<time datetime="\d{4}-\d{2}-\d{2}T/);
assert.match(status, /<h2>Machine-status coverage<\/h2>/);
assert.match(status, /a periodic snapshot/);
const missingCoverage = status.includes('Machine-status coverage will appear after the next automated check.');
if (!missingCoverage) {
  const coverageCounts = [...status.matchAll(/<dt>(Fully reporting|Partially reporting|No usable availability|Could not evaluate)<\/dt><dd>(\d+) tracker/g)];
  assert.equal(coverageCounts.length, 4, 'Coverage displays all four categories');
  assert.equal(coverageCounts.reduce((total, match) => total + Number(match[2]), 0), laundryRooms.length,
    'Coverage counts each tracker once, including both floors on the shared feed');
}
const offlineScript = status.match(/<script>([\s\S]*?getElementById\('status-offline'\)[\s\S]*?)<\/script>/)?.[1];
assert.ok(offlineScript, 'Service status offline notice initializer');
const notice = { hidden: true };
const connection = { onLine: false };
const listeners = {};
runInNewContext(offlineScript, {
  document: { getElementById: (id) => id === 'status-offline' ? notice : null },
  navigator: connection,
  window: { addEventListener: (event, listener) => { listeners[event] = listener; } },
});
assert.equal(notice.hidden, false, 'Show the notice when status loads offline');
connection.onLine = true;
listeners.online();
assert.equal(notice.hidden, true, 'Hide the notice when the connection returns');
connection.onLine = false;
listeners.offline();
assert.equal(notice.hidden, false, 'Show the notice when the connection drops');
const sitemapPage = await read('/sitemap/');
for (const path of paths) if (path !== '/sitemap/') assert.ok(sitemapPage.includes(`href="${path}"`), `HTML sitemap entry for ${path}`);
assert.doesNotMatch(sitemapPage, /href="\/sitemap\/"/);
for (const view of ['my-laundry', 'settings']) assert.ok(sitemapPage.includes(`href="/?view=${view}"`));
assert.match(sitemapPage, /href="\/\?view=my-laundry">My Laundry<\/a>/);
assert.ok((await read('/')).includes(independenceDisclosure));
const information = await read(informationPath);
const [disclosure, aboutResource] = informationDisclosure;
assert.ok(information.includes(`<p class="site-information-disclosure">${disclosure}<a href="${aboutResource.href}">${aboutResource.label}</a></p>`));
assert.equal((information.match(/href="\/about\/"/g) ?? []).length, 1, 'One About link in Information');
for (const [label, meaning] of machineStatusDefinitions) {
  assert.ok(information.includes(`<dt><strong>${label}</strong></dt><dd>${meaning}</dd>`), label);
}
for (const [question] of informationQuestions) assert.ok(information.includes(`<summary>${question}</summary>`), question);
assert.match(information, /<strong>Add to Home Screen<\/strong>/);
const directoryPage = await read('/residence-halls/');
for (const [path, text] of [
  ['/residence-halls/', directoryPage], ['/sitemap/', sitemapPage], ['/status/', status],
  ['/about/', await read('/about/')], ['/compare/', await read('/compare/')],
]) assert.match(text, /<main class="[^"]*animate-fadeIn"/, path);
assert.match(await read('/room-directory.css'), /@keyframes ll-fade-in/);
const campusPaths = [...paths].filter(path => path.startsWith('/residence-halls/campuses/'));
assert.equal(campusPaths.length, 4);
for (const path of campusPaths) {
  assert.ok(directoryPage.includes(`href="${path}"`), `Directory entry for ${path}`);
  assert.match(await read(path), /href="\/residence-halls\/complexes\//, path);
}
const complexPaths = [...paths].filter(path => path.startsWith('/residence-halls/complexes/'));
assert.ok(complexPaths.length, 'Complex pages are indexed');
for (const path of complexPaths) {
  assert.ok(directoryPage.includes(`href="${path}"`), `Directory entry for ${path}`);
  assert.match(await read(path), /<main class="[^"]*animate-fadeIn"/, path);
}
assert.doesNotMatch(directoryPage, /href="\/#room\//, 'Directory opens complex pages');
assert.doesNotMatch(directoryPage, /aria-label="Breadcrumbs"|UVM Hallways Handbook/, 'Directory uses its header for Home');
assert.match(directoryPage, /Browse by campus and complex to find your laundry room and open the tracker\./);
for (const room of laundryRooms) {
  const route = '/' + roomPath(room);
  assert.ok(sitemapPage.includes(`href="${route}"`), `HTML sitemap room entry for ${room.id}`);
}
const themeScript = (await read('/')).match(/<script id="laundrylink-theme-init">([\s\S]*?)<\/script>/)?.[1];
assert.ok(themeScript, 'Theme initialization script');
const themeHash = scriptHash(themeScript);
const offlineHash = scriptHash(offlineScript);
assert.ok(scriptSources.includes(themeHash), 'Theme hash is in enforced CSP');
assert.ok(scriptSources.includes(offlineHash), 'Service-status hash is in enforced CSP');
if (!endpoint) checkInlineScripts(await read('/404.html'), '/404.html');
if (endpoint && origin === canonicalOrigin) {
  for (const [path, status] of [
    ['/', 200], ['/residence-halls/wright-hall/', 200], [informationPath, 200], ['/about/', 200], ['/status/', 200],
    ['/this-laundrylink-page-does-not-exist/', 404],
  ]) {
    const response = await fetch(origin + path, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, status, path);
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=86400', path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()', path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
  }
}
const evaluateTheme = (preferences, systemDark) => {
  const root = { dataset: {}, dark: false, classList: { toggle: (_, value) => { root.dark = value; } } };
  runInNewContext(themeScript, {
    document: { documentElement: root },
    localStorage: { getItem: (key) => preferences[key] ?? null },
    window: {
      matchMedia: () => ({ matches: systemDark, addEventListener: () => {} }),
      addEventListener: () => {},
    },
  });
  return root;
};
assert.equal(evaluateTheme({}, true).dark, true, 'System dark theme');
assert.equal(evaluateTheme({ uvmLaundryUseSystemTheme: 'false', uvmLaundryManualDarkMode: 'false' }, true).dark, false, 'Manual light theme');
assert.equal(evaluateTheme({ uvmLaundryUseSystemTheme: 'false', uvmLaundryManualDarkMode: 'true' }, false).dark, true, 'Manual dark theme');
assert.match(await read('/site.css'), /html\.dark \.public-page/);

const serviceWorker = await read('/service-worker.js');
const entrypoints = JSON.parse(serviceWorker.match(/^const APP_ENTRYPOINTS = (\[[^\n]+\]);/m)?.[1]);
assert.ok(entrypoints.some(path => /^\/static\/js\/main\.[a-f0-9]+\.js$/.test(path)), 'Cache the compiled app for offline launches');
assert.ok(entrypoints.some(path => /^\/static\/css\/main\.[a-f0-9]+\.css$/.test(path)), 'Cache the compiled stylesheet for offline launches');
assert.match(serviceWorker, /['"]\/status\/['"]/, 'Precache the status page and its inline offline notice');

const robots = await read('/robots.txt');
assert.match(robots, /User-agent: \*\s+Allow: \/\s+Sitemap: https:\/\/uvmlaundry\.com\/sitemap\.xml/);
assert.doesNotMatch(robots, /Disallow: \/(?:\s|$)/);
if (endpoint) {
  for (const [legacy, target] of [
    ['/faq', informationPath],
    ['/laundry-guide', informationPath],
    ['/residence-halls/austin-hall', '/residence-halls/marsh-and-austin-hall/'],
  ]) {
    for (const suffix of ['', '/', '/index.html']) {
      const response = await fetch(origin + legacy + suffix, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      assert.equal(response.status, 301, legacy + suffix);
      assert.equal(new URL(response.headers.get('location'), origin).href, origin + target, legacy + suffix);
      await response.body?.cancel();
    }
  }
  const missing = await read('/this-laundrylink-page-does-not-exist/', 404);
  checkInlineScripts(missing, '/this-laundrylink-page-does-not-exist/');
  assert.match(missing, /Page not found/);
  for (const userAgent of ['Googlebot', 'bingbot', 'OAI-SearchBot', 'Google-Extended']) {
    assert.match(await read('/', 200, userAgent), /UVM residence hall laundry tracker/);
  }
  const perplexity = await fetch(origin + '/', {
    headers: { 'User-Agent': 'PerplexityBot' }, redirect: 'manual', signal: AbortSignal.timeout(10_000),
  });
  console.log(`PerplexityBot header-only probe: HTTP ${perplexity.status}. Cloudflare may evaluate actual crawler identity separately.`);
}
const referrals = await read('/referrals.js');
const capture = ({ referrer = '', search = '', pathname = '/', privacy = false, kind = 'referrals' }) => {
  const calls = [];
  runInNewContext(referrals, {
    URL, URLSearchParams, document: { referrer }, navigator: { globalPrivacyControl: privacy },
    location: { hostname: 'uvmlaundry.com', pathname, search },
    fetch: (url, options) => { calls.push([url, options]); return Promise.resolve(); },
  });
  return calls.filter(([url]) => url.endsWith('/' + kind));
};
const [[collector, visit]] = capture({ search: '?utm_source=chatgpt.com&private=value', pathname: '/residence-halls/wright-hall/' });
assert.equal(collector, 'https://alerts.uvmlaundry.com/referrals');
assert.equal(visit.body.toString(), 'category=chatgpt&page=hall');
assert.equal(visit.credentials, 'omit');
assert.equal(visit.referrerPolicy, 'no-referrer');
assert.equal(capture({ referrer: 'https://www.perplexity.ai/search/private' })[0][1].body.toString(), 'category=perplexity&page=tracker');
assert.equal(capture({ referrer: 'https://gemini.google.com/app/private' })[0][1].body.toString(), 'category=gemini&page=tracker');
assert.equal(capture({ referrer: 'https://uvmlaundry.com/about/', search: '?utm_source=chatgpt.com' }).length, 0);
assert.equal(capture({ search: '?utm_source=chatgpt.com', privacy: true }).length, 0);
for (const [pathname, label] of [
  ['/residence-halls/campuses/redstone/', 'campus'],
  ['/residence-halls/complexes/redstone-cwpscr/', 'complex'],
  ['/sitemap/', 'sitemap'],
]) {
  const referrer = 'https://www.google.com/search/private';
  const [[, view]] = capture({ pathname, kind: 'metrics' });
  const [[, referral]] = capture({ pathname, referrer });
  assert.equal(view.body.toString(), `metric=page_view&label=${label}`);
  assert.equal(referral.body.toString(), `category=google&page=${label}`);
  assert.equal(capture({ pathname, kind: 'metrics', privacy: true }).length, 0);
}
console.log(`Verified ${paths.size} sitemap routes, metadata, internal links, and crawler access rules${endpoint ? ' in production' : ''}.`);
