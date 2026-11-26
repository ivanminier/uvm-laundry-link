import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const wrangler = process.env.LAUNDRY_WRANGLER || 'wrangler';
const output = resolve(process.argv[2] || './laundrylink-growth.html');
const rooms = JSON.parse(readFileSync(new URL('../src/laundryRooms.json', import.meta.url)));
const roomLabel = (id) => {
  const room = rooms.find((entry) => entry.id === id);
  return room ? [room.displayName ?? room.name, room.locationLabel].filter(Boolean).join(' · ') : id;
};
function query(sql) {
  const result = execFileSync(wrangler, [
    'd1', 'execute', 'laundrylink-referrals', '--remote', '--config', 'alerts/wrangler.jsonc',
    '--json', '--command', sql,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const [response] = JSON.parse(result);
  if (!response?.success) throw new Error('Cloudflare did not confirm the private database query');
  return response.results;
}
const window = "day >= date('now', '-89 days')";
const events = query(`SELECT day, metric, label, events FROM daily_metrics WHERE ${window} ORDER BY day DESC`);
const referrals = query(`SELECT day, source, page, landings FROM referral_counts WHERE ${window} ORDER BY day DESC`);
const clean = (v) => String(v).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const from = (days) => new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
const views = events.filter(({ metric }) => metric === 'page_view');
const count = (rows, days, field) => rows.filter(({ day }) => day >= from(days)).reduce((sum,row) => sum + row[field],0);
function list(title, rows, label, field, format = (key) => key) {
  const sums = {};
  for (const row of rows.filter(({day}) => day >= from(30))) sums[row[label]] = (sums[row[label]] ?? 0) + row[field];
  const items = Object.entries(sums).sort((a,b) => b[1] - a[1]).slice(0, 12);
  return `<section><h2>${clean(title)}</h2>${items.length ? '<ol>' + items.map(([key,value]) =>
    `<li><span>${clean(format(key))}</span><strong>${value.toLocaleString()}</strong></li>`).join('') + '</ol>' : '<p>No activity recorded in this category yet.</p>'}</section>`;
}
const daily = new Map();
for (const row of views) daily.set(row.day, (daily.get(row.day) ?? 0) + row.events);
const timeline = Array.from(daily.entries()).sort((a,b) => a[0].localeCompare(b[0]));
const max = Math.max(1, ...daily.values());
const html = `<!doctype html><html lang="en"><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>LaundryLink private growth dashboard</title><style>
:root{color-scheme:light dark}body{margin:0;background:light-dark(#f3f6f3,#101a15);color:light-dark(#14291c,#e1f2e7);font:16px/1.5 system-ui,sans-serif}main{margin:auto;padding:2rem 1rem;max-width:69rem}h1{font-size:clamp(2rem,6vw,3.8rem);line-height:1.1;margin:.6rem 0}h2{margin:.2rem 0 .9rem;font-size:1.17rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr));gap:1rem}.grid>section,section.timeline{background:light-dark(#fff,#19281f);border:1px solid light-dark(#d4e1d6,#2e4132);border-radius:12px;padding:1rem}.periods{display:flex;gap:1.5rem;flex-wrap:wrap;margin:1.5rem 0}.periods strong{display:block;font-size:1.8rem}ol{padding:0;list-style:none}li{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.35rem 0;border-bottom:1px solid light-dark(#e4ebe5,#344539)}.timeline li{display:grid;grid-template-columns:6.8rem 1fr 3rem}.timeline meter{width:100%;accent-color:#237345}a{color:light-dark(#17482c,#b1e4ba)}header p{max-width:55rem}section.timeline{margin:1rem 0}
</style></head><body><main><header><p>Owner snapshot · ${clean(new Date().toISOString())}</p><h1>LaundryLink growth</h1><p>Anonymous events and counts in UTC. A page can be viewed more than once by the same person. Keep this file private.</p></header>
<div class="periods">${[1,7,30].map(n=>`<div><strong>${count(views,n,'events').toLocaleString()}</strong>Page views · ${n===1?'Today':n+' days'}</div>`).join('')}</div>
<section class="timeline"><h2>Daily page views · up to 90 days</h2>${timeline.length ? '<ol>' + timeline.map(([day,n])=>`<li><time>${clean(day)}</time><meter max="${max}" value="${n}" aria-label="${n} views"></meter><strong>${n}</strong></li>`).join('') + '</ol>' : '<p>No views recorded yet.</p>'}</section>
<div class="grid">
${list('Popular residence hall pages',views.filter(({label})=>label.startsWith('hall:')),'label','events',key=>key.slice(5).replaceAll('-',' '))}
${list('Popular laundry rooms',events.filter(({metric})=>metric==='room_view'),'label','events',roomLabel)}
${list('Referral sources',referrals,'source','landings')}
${list('AI referrals',referrals.filter(({source})=>['chatgpt','perplexity','gemini','copilot','claude'].includes(source)),'source','landings')}
${list('Search referrals',referrals.filter(({source})=>['google','bing','duckduckgo'].includes(source)),'source','landings')}
${list('New push subscriptions',events.filter(({metric})=>metric==='subscription'),'label','events',key=>key.replaceAll('_',' '))}
${list('Push service outcomes',events.filter(({metric})=>metric==='push_result'),'label','events',key=>key.replaceAll('_',' '))}
<section><h2>Reliability and search</h2><p><a href="https://uvmlaundry.com/status/">Latest service check</a> · <a href="https://search.google.com/search-console?resource_id=sc-domain%3Auvmlaundry.com">Google Search Console</a> · <a href="https://www.bing.com/webmasters/">Bing Webmaster Tools</a></p><p>Provider acceptance does not confirm that a device displayed a push. Returning visitors and historical uptime are unavailable in this snapshot. Referral counts miss visits where the source was stripped.</p></section>
</div></main></body></html>`;
writeFileSync(output, html, { mode: 0o600 });
console.log('Private snapshot written to '+output);
