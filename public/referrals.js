(() => {
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  const { pathname } = location;
  const directory = /^\/residence-halls\/(campuses|complexes)\/[a-z0-9-]+\/$/.exec(pathname)?.[1];
  const directoryCategory = { campuses: 'campus', complexes: 'complex' }[directory];
  const pageLabel = {
    '/': 'tracker', '/residence-halls/': 'directory',
    '/information/': 'information', '/status/': 'status', '/about/': 'about', '/compare/': 'compare', '/sitemap/': 'sitemap',
  }[pathname];
  const hall = pathname.match(/^\/residence-halls\/([a-z0-9-]{1,75})\/$/);
  const label = pageLabel ?? directoryCategory ?? (hall && 'hall:' + hall[1]);
  if (label) {
    fetch('https://alerts.uvmlaundry.com/metrics', {
      method: 'POST', body: new URLSearchParams({ metric: 'page_view', label }), keepalive: true,
      credentials: 'omit', referrerPolicy: 'no-referrer',
    }).catch(() => {});
  }

  const tag = new URLSearchParams(location.search).get('utm_source')?.toLowerCase();
  let host = '';
  try { host = new URL(document.referrer).hostname.toLowerCase(); } catch {}
  if (host === location.hostname || host === 'uvmlaundry.com' || host === 'www.uvmlaundry.com') return;

  const from = (name) => host === name || host.endsWith('.' + name);
  let category;
  if (tag === 'chatgpt.com' || from('chatgpt.com') || from('chat.openai.com')) category = 'chatgpt';
  else if (tag === 'perplexity.ai' || from('perplexity.ai')) category = 'perplexity';
  else if (tag === 'gemini' || tag === 'gemini.google.com' || from('gemini.google.com')) category = 'gemini';
  else if (tag === 'copilot' || from('copilot.microsoft.com')) category = 'copilot';
  else if (tag === 'claude.ai' || from('claude.ai')) category = 'claude';
  else if (host === 'google.com' || /^www\.google\.(com|[a-z]{2}|co\.[a-z]{2})$/.test(host)) category = 'google';
  else if (from('bing.com')) category = 'bing';
  else if (from('duckduckgo.com')) category = 'duckduckgo';
  else if (host) category = 'other';
  if (!category) return;

  const page = directoryCategory ?? (pathname === '/sitemap/' ? 'sitemap' : pathname === '/' ? 'tracker'
    : /^\/residence-halls\/[^/]+\//.test(pathname) ? 'hall' : 'information');
  // Only allow-listed categories leave the browser.
  fetch('https://alerts.uvmlaundry.com/referrals', {
    method: 'POST', body: new URLSearchParams({ category, page }), keepalive: true,
    credentials: 'omit', referrerPolicy: 'no-referrer',
  }).catch(() => {});
})();
