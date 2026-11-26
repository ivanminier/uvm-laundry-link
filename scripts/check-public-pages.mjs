import assert from 'node:assert/strict';
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
for (const path of ['/', '/residence-halls/', '/residence-halls/wright-hall/', '/laundry-guide/', '/faq/', '/status/', '/about/', '/compare/']) {
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
    assert.doesNotMatch(body, /noindex|You need to enable JavaScript/i, pathname);
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
    for (const [, target] of body.matchAll(/<a [^>]*href="(\/[^"#]*)(?:#[^"]*)?"/g)) {
      assert.ok(paths.has(target), `Broken link on ${pathname}: ${target}`);
    }
    if (pathname.startsWith('/residence-halls/') && pathname !== '/residence-halls/') {
      assert.match(body, /href="\/#room\//, pathname);
    }
  }));
}

const robots = await read('/robots.txt');
assert.match(robots, /User-agent: \*\s+Allow: \/\s+Sitemap: https:\/\/uvmlaundry\.com\/sitemap\.xml/);
assert.doesNotMatch(robots, /Disallow: \/(?:\s|$)/);
if (endpoint) {
  const missing = await read('/this-laundrylink-page-does-not-exist/', 404);
  assert.match(missing, /Page not found/);
  for (const userAgent of ['Googlebot', 'bingbot', 'OAI-SearchBot', 'PerplexityBot', 'Google-Extended']) {
    assert.match(await read('/', 200, userAgent), /UVM residence hall laundry tracker/);
  }
}
const referrals = await read('/referrals.js');
const capture = ({ referrer = '', search = '', pathname = '/', privacy = false }) => {
  const calls = [];
  runInNewContext(referrals, {
    URL, URLSearchParams, document: { referrer }, navigator: { globalPrivacyControl: privacy },
    location: { hostname: 'uvmlaundry.com', pathname, search },
    fetch: (url, options) => { calls.push([url, options]); return Promise.resolve(); },
  });
  return calls;
};
const [[collector, visit]] = capture({ search: '?utm_source=chatgpt.com&private=value', pathname: '/residence-halls/wright-hall/' });
assert.equal(collector, 'https://alerts.uvmlaundry.com/referrals');
assert.equal(visit.body.toString(), 'category=chatgpt&page=hall');
assert.equal(visit.credentials, 'omit');
assert.equal(visit.referrerPolicy, 'no-referrer');
assert.equal(capture({ referrer: 'https://www.perplexity.ai/search/private' })[0][1].body.toString(), 'category=perplexity&page=tracker');
assert.equal(capture({ referrer: 'https://gemini.google.com/app/private' })[0][1].body.toString(), 'category=gemini&page=tracker');
assert.equal(capture({ referrer: 'https://uvmlaundry.com/faq/', search: '?utm_source=chatgpt.com' }).length, 0);
assert.equal(capture({ search: '?utm_source=chatgpt.com', privacy: true }).length, 0);
console.log(`Verified ${paths.size} static public routes, metadata, internal links, and crawler access rules${endpoint ? ' in production' : ''}.`);
