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
