# PBS: photographer booking service demo

A clickable prototype of the demo web page spec (10 pages, client and photographer roles).
Everything lives in this repo: the code, the demo database (JSON) and the deploy to GitHub Pages.

## Run locally

```bash
npm install
npm run dev
```

## Where the data lives

| What | Where |
|---|---|
| Generated demo data: areas, travel times, styles, 20 photographers, calendars, reviews | `src/data/*.json`, made by `npm run data` from `scripts/generate-demo-data.mjs` |
| What people create in the demo: accounts, bookings, edited rules and profiles | The browser's localStorage. "Reset demo data" in the footer clears it |

All reads and writes go through `src/lib/store.js`. When the team's server is ready, only this file
changes: the pages stay the same.

## Matching logic

`src/lib/matching.js` holds the 6 availability checks, the fit score and the reason texts from spec section 6.
It has no UI code, so it can move to the server as is.

No maps API yet: travel time between areas comes from a fixed table (`src/data/travel.json`, minutes by car).
The photographer's "travel distance" is the longest trip from the home area in minutes.

## Demo scenario

**Portrait · Podil · Fri 20 Nov 2026 · 14:00 · 90 min · 1500 UAH/h** ("Try the demo search" on the landing page) shows:

- 2 photographers fit, Olena Kovalenko is the best match
- close alternatives: Iryna Zinchenko (time: finishing a shoot in Darnytsia, the travel reason),
  Sofiia Savchuk (similar style: family instead of portrait), Taras Melnyk (300 UAH/h over the budget)

`npm run check` prints this search, so a data change that breaks the scenario is visible (the deploy runs it too).

## Team view

The "Team view" switch in the header shows any photographer's pages. In this prototype it is visible while
nobody is logged in; with the server it will show only for team accounts.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`).
One-time setup: **Settings → Pages → Source: GitHub Actions**.
