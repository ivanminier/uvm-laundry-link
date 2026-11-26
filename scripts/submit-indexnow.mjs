import { readFile } from 'node:fs/promises';

const origin = 'https://uvmlaundry.com';
const key = (await readFile(new URL('./indexnow-public-key.txt', import.meta.url), 'utf8')).trim();
const keyLocation = `${origin}/${key}.txt`;
const verification = await fetch(keyLocation, { signal: AbortSignal.timeout(10000) });
if (!verification.ok || (await verification.text()).trim() !== key) throw new Error('The public IndexNow verification file has not deployed yet');
const sitemapResponse = await fetch(origin + '/sitemap.xml', { signal: AbortSignal.timeout(10000) });
if (!sitemapResponse.ok) throw new Error('Could not read the production sitemap');
const sitemap = await sitemapResponse.text();
const published = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
const urls = process.argv.slice(2).map((target) => new URL(target, origin).href);
if (!urls.length || urls.some((url) => !published.has(url))) {
  throw new Error('Give specific changed canonical routes from the production sitemap');
}
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ host: new URL(origin).hostname, key, keyLocation, urlList: [...new Set(urls)] }),
  signal: AbortSignal.timeout(15000),
});
if (![200, 202].includes(response.status)) throw new Error('IndexNow returned HTTP ' + response.status);
console.log(`IndexNow HTTP ${response.status} for ${new Set(urls).size} urls. This does not establish indexing.`);
