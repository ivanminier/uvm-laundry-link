import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { roomPath } from '../src/roomLinks.mjs';
import { independenceDisclosure, machineStatusDefinitions, informationPath, informationQuestions } from '../src/informationContent.mjs';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const canonicalOrigin = 'https://uvmlaundry.com';
const endpoint = process.argv[2];
const origin = endpoint ? new URL(endpoint).origin : canonicalOrigin;
const build = new URL('../build/', import.meta.url);
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
  return response.text();
}

const routes = Array.from((await read('/sitemap.xml')).matchAll(/<loc>(.*?)<\/loc>/g), (match) => new URL(match[1]));
const paths = new Set(routes.map(({ pathname }) => pathname));
assert.equal(routes.length, paths.size, 'Unique sitemap entries');
assert.ok(!paths.has('/laundry-guide/') && !paths.has('/faq/'), 'Retired pages have no sitemap entry');
for (const path of ['/', '/residence-halls/', '/residence-halls/wright-hall/', '/residence-halls/marsh-and-austin-hall/', '/residence-halls/living-learning/', '/status/', '/about/', '/compare/', '/sitemap/', informationPath]) {
  assert.ok(paths.has(path), path);
}
const titles = new Set();
const descriptions = new Set();
for (let index = 0; index < routes.length; index += 6) {
  await Promise.all(routes.slice(index, index + 6).map(async ({ pathname, href }) => {
    const body = await read(pathname);
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
assert.match(about, /Alerts expire after four hours/);
assert.doesNotMatch(await read('/compare/'), /filter by campus|search for a machine number|filter by status/);
const status = await read('/status/');
assert.match(status, /Machine status feed responded with status data for \d+ of \d+ provider rooms\./);
assert.match(status, /<time datetime="\d{4}-\d{2}-\d{2}T/);
const sitemapPage = await read('/sitemap/');
for (const path of paths) if (path !== '/sitemap/') assert.ok(sitemapPage.includes(`href="${path}"`), `HTML sitemap entry for ${path}`);
assert.doesNotMatch(sitemapPage, /href="\/sitemap\/"/);
for (const view of ['my-laundry', 'settings']) assert.ok(sitemapPage.includes(`href="/?view=${view}"`));
assert.match(sitemapPage, /href="\/\?view=my-laundry">My Laundry<\/a>/);
assert.ok((await read('/')).includes(independenceDisclosure));
const information = await read(informationPath);
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
const rooms = JSON.parse(await readFile(new URL('../src/laundryRooms.json', import.meta.url)));
for (const room of rooms) {
  const route = '/' + roomPath(room);
  assert.ok(sitemapPage.includes(`href="${route}"`), `HTML sitemap room entry for ${room.id}`);
}
const themeScript = (await read('/')).match(/<script id="laundrylink-theme-init">([\s\S]*?)<\/script>/)?.[1];
assert.ok(themeScript, 'Theme initialization script');
const themeHash = `'sha256-${createHash('sha256').update(themeScript).digest('base64')}'`;
const headerRules = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
assert.ok(headerRules.includes(themeHash), 'Report-only CSP permits the current theme initializer');
assert.doesNotMatch(headerRules, /^\s*Content-Security-Policy:/mi, 'CSP enforcement requires approval');
if (endpoint && origin === canonicalOrigin) {
  for (const path of ['/', '/residence-halls/wright-hall/', informationPath, '/about/', '/service-worker.js']) {
    const response = await fetch(origin + path, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=86400', path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()', path);
    assert.ok(response.headers.get('content-security-policy-report-only')?.includes(themeHash), path);
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
