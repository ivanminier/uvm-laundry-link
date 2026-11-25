# UVM LaundryLink

LaundryLink is a static React app for checking UVM laundry rooms. The room directory is bundled with the app. When a room is open, the browser reads Wash Alert machine metadata and polls the provider for live status every 30 seconds while the tab is visible. The last successful snapshot stays available on the device if a refresh fails.

Peak Times uses aggregated historical usage from LaundryConnect Live. GitHub Actions refreshes the snapshot twice daily and publishes the static build to GitHub Pages. Rooms without historical data still have live status. Machine cards link to the official reporting flow, where Automatic Laundry receives and handles service requests.

## Development

- `npm ci` installs the locked dependencies.
- `npm start` starts the React development server.
- `npm test -- --watchAll=false --runInBand` checks the data mapping and app.
- `node scripts/refresh-peak-times.mjs` refreshes the bundled history.
- `npm run build` creates the production site in `build/`.

Production deploys from the Publish LaundryLink workflow on `main` and can also be triggered manually in GitHub Actions. The custom domain is `uvmlaundry.com`.
