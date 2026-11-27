import assert from 'node:assert/strict';
import { roomPath } from '../src/roomLinks.mjs';
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
for (const path of ['/', '/residence-halls/', '/residence-halls/wright-hall/', '/residence-halls/marsh-and-austin-hall/', '/residence-halls/living-learning/', '/status/', '/about/', '/compare/', '/sitemap/']) {
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
    const footer = body.match(/<footer class="ll-site-footer">([\s\S]*?)<\/footer>/)?.[1];
    assert.ok(footer, `Footer on ${pathname}`);
    assert.deepEqual(Array.from(footer.matchAll(/href="([^"]+)"/g), ([, href]) => href), [], `Footer links on ${pathname}`);
    assert.match(footer, /Independent student project by Ivan Minier · \d{4}/, pathname);
    assert.match(footer, /Not affiliated with the University of Vermont or Automatic Laundry\. Status is based on provider-reported data\./, pathname);
    for (const [, target] of body.matchAll(/<a [^>]*href="(\/[^"#]*)(?:#[^"]*)?"/g)) {
      const targetPath = new URL(target, canonicalOrigin).pathname;
      assert.ok(paths.has(targetPath), `Broken link on ${pathname}: ${target}`);
    }
    if (pathname.startsWith('/residence-halls/') && pathname !== '/residence-halls/') {
      assert.match(body, /href="\/#room\//, pathname);
    }
  }));
}

const status = await read('/status/');
assert.match(status, /Machine status feed responded with status data for \d+ of \d+ provider rooms\./);
assert.match(status, /<time datetime="\d{4}-\d{2}-\d{2}T/);
const sitemapPage = await read('/sitemap/');
for (const path of paths) if (path !== '/sitemap/') assert.ok(sitemapPage.includes(`href="${path}"`), `HTML sitemap entry for ${path}`);
assert.doesNotMatch(sitemapPage, /href="\/sitemap\/"/);
for (const view of ['my-laundry', 'information', 'settings']) assert.ok(sitemapPage.includes(`href="/?view=${view}"`));
const directoryPage = await read('/residence-halls/');
for (const [path, text] of [
  ['/residence-halls/', directoryPage], ['/sitemap/', sitemapPage], ['/status/', status],
  ['/about/', await read('/about/')], ['/compare/', await read('/compare/')],
]) assert.match(text, /<main class="[^"]*animate-fadeIn"/, path);
assert.match(await read('/room-directory.css'), /@keyframes ll-fade-in/);
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

const robots = await read('/robots.txt');
assert.match(robots, /User-agent: \*\s+Allow: \/\s+Sitemap: https:\/\/uvmlaundry\.com\/sitemap\.xml/);
assert.doesNotMatch(robots, /Disallow: \/(?:\s|$)/);
if (endpoint) {
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
const capture = ({ referrer = '', search = '', pathname = '/', privacy = false }) => {
  const calls = [];
  runInNewContext(referrals, {
    URL, URLSearchParams, document: { referrer }, navigator: { globalPrivacyControl: privacy },
    location: { hostname: 'uvmlaundry.com', pathname, search },
    fetch: (url, options) => { calls.push([url, options]); return Promise.resolve(); },
  });
  return calls.filter(([url]) => url.endsWith('/referrals'));
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
console.log(`Verified ${paths.size} sitemap routes, metadata, internal links, and crawler access rules${endpoint ? ' in production' : ''}.`);
