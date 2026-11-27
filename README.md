# UVM LaundryLink

LaundryLink is a static React app for checking UVM laundry rooms. The room directory is bundled with the app. When a room is open, the browser reads Wash Alert machine metadata and polls the provider for live status every 30 seconds while the tab is visible. The last successful snapshot stays available on the device if a refresh fails.

Peak Times uses aggregated historical usage from LaundryConnect Live. GitHub Actions schedules the daily snapshot refresh for midnight Eastern time (America/New_York) and publishes the static build to GitHub Pages. Central Campus floors 6 and 7 display distinct machine ranges from the shared live feed. The historical chart is labeled with both floors because the provider publishes a combined aggregate. Machine cards link to the official reporting flow, where Automatic Laundry receives and handles service requests.

## Development

- `npm ci` installs the locked dependencies.
- `npm start` starts the React development server.
- `npm test -- --watchAll=false --runInBand` checks the data mapping and app.
- `node scripts/refresh-peak-times.mjs` refreshes the bundled history.
- `npm run build` creates the production site in `build/`.

Production deploys from the Publish LaundryLink workflow on `main` and can also be triggered manually in GitHub Actions. The custom domain is `uvmlaundry.com`.

## Push alerts

The site registers browser push notifications through the Cloudflare Worker at `alerts.uvmlaundry.com`. Each Durable Object monitors an individual provider feed while it has pending alerts. An alert delivers once, can be cancelled from the device where it was created, and expires after four hours. The Worker stores the browser subscription while the alert is active. The text-alert option loads Automatic Laundry’s embedded room view inside the machine dialog. Phone numbers go straight to the vendor’s form.

Deploy the Worker with Wrangler using `wrangler deploy --config alerts/wrangler.jsonc`. Provision stable `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` Worker secrets for the initial deployment. Changing the keys requires browsers to subscribe again. Run `node --test alerts/*.test.mjs` to check the push payload and endpoint validation.

## Public pages and discovery

The React tracker keeps its room and machine links. The production build also emits the homepage content, campus directory, one page per supported residence hall or complex, guides, service status, sitemap and 404 as plain HTML. The hall directory is generated from the same room mapping as the tracker.

- Run `SITE_CHECK_SOURCES=1 npm run build` to include timestamped provider and alert configuration checks in the service status page. Builds without source checks include the dated baseline snapshot. Run `node scripts/check-sources.mjs` to check them on their own. A status-feed check confirms data can be retrieved. It is not a delivery check or confirmation of permission to use a provider feed.
- Run `node scripts/check-public-pages.mjs` after the build to verify static pages, internal links and metadata. Pass `https://uvmlaundry.com` as an argument to check published routes and representative bot user agents.
- For Google Search Console or Bing Webmaster Tools HTML tag verification, set the corresponding GitHub Actions repository variable `GOOGLE_SITE_VERIFICATION` or `BING_SITE_VERIFICATION` to the verification tag's content value, then redeploy. Domain verification by DNS is also available in the account dashboards. Submit `https://uvmlaundry.com/sitemap.xml` after verification. Check indexing and referral trends in the respective tools after observations accumulate.
- Referral reporting uses the `laundrylink-referrals` Cloudflare D1 database. It stores daily counts by allow-listed source and landing-page category. It honors Global Privacy Control and Do Not Track and does not collect direct or internal visits, cookies, identifiers, raw referrers, URL paths, or query strings. Count results are estimates and can miss apps that strip referrers. ChatGPT's `utm_source=chatgpt.com` tag is recognized.
- Initialize the referral database with `wrangler d1 execute laundrylink-referrals --remote --config alerts/wrangler.jsonc --file alerts/referrals.sql`. Query it from the Cloudflare dashboard or with `wrangler d1 execute laundrylink-referrals --remote --config alerts/wrangler.jsonc --command "SELECT source, page, SUM(landings) AS landings FROM referral_counts WHERE day >= date('now', '-30 days') GROUP BY source, page ORDER BY landings DESC"`.

LaundryLink uses machine metadata and status returned by the provider's public browser endpoints and historical usage returned by LaundryConnect Live. Network access was tested separately from provider authorization. Written approval or a documented third-party integration agreement has not been verified. If access changes, use the official room views linked in the directory while confirming an approved integration with the provider.

The room-level washer push is optional and uses a server-verified washer catalog (`alerts/room-washers.json`). If the live washer roster changes, update the catalog from the provider's visible washer directory, respecting the CCRH floor assignments, then deploy the alert Worker. The registration endpoint declines to create a room alert when the live roster and verified catalog disagree.

The production crawl probe sends crawler user-agent headers to verify ordinary responses. It cannot verify a crawler's network identity. Cloudflare's Search policy is set to Allow. A header-only PerplexityBot probe received HTTP 403 despite the public robots policy and no PerplexityBot-specific rule in AI Crawl Control. Verify actual Perplexity crawler traffic from Cloudflare's crawler/security dashboard. Index coverage and rankings require subsequent measurements.

The scheduled **LaundryLink public health** workflow checks HTML routes and alert configuration independently of deployment. Use its history to review observed checks, rather than interpreting it as continuous uptime. The build status page also refreshes its dated provider checks with the publishing workflow.

For a private growth dashboard and dated report, authenticate Wrangler and run `npm run dashboard`. The dashboard is written to `~/Documents/LaundryLink Launch/08 Analytics/growth-dashboard.html`; the same folder receives a `growth-report-YYYY-MM-DD.md` report. The generated files are owner-readable only and the script refuses output paths inside the repository, keeping private analytics out of the website build. To choose another location, pass an absolute `.html` path to `node scripts/growth-dashboard.mjs`. The dashboard reports event counts, period comparisons, room and hall activity, referrals, registration events, push service outcomes, and the latest bundled provider snapshot. It does not infer unique users, device delivery, continuous uptime, search impressions, or indexing. Google and Bing performance remain in their respective owner consoles.
