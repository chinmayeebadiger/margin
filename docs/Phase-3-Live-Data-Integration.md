# Market Brief Phase 3 Live Data Integration

Started: 9 October 2026

Phase 3 wires proven providers into server-side app routes while preserving fixture fallback and visible data labels.

## Implemented

- `app/api/market-data/route.ts`
  - Server-only route for market data.
  - Uses `TWELVE_DATA_API_KEY` and `FRED_API_KEY` from `.env.local`.
  - Returns normalized `MarketInstrument[]`.

- `app/api/calendar/route.ts`
  - Server-only route for official release feeds.
  - Parses RBI and Federal Reserve RSS.
  - Returns normalized `CalendarEvent[]`.

- `lib/data/live.ts`
  - Provider fetchers and normalization logic.
  - Fixture fallback for missing keys, malformed upstream data, and unconfirmed instruments.

- `components/MarketBriefApp.tsx`
  - Fetches `/api/market-data` and `/api/calendar` after load.
  - Shows `Loading`, `Mixed`, `Live`, `Fixture`, or `Fallback` status in the header and market snapshot.
  - Uses live normalized instruments in Today, Markets, and related story market rows.
  - Uses live official releases in Today and Calendar.
  - Keeps fixture fallback if either data route fails.

## Current Live Coverage

| Item | Source | Status |
|---|---|---|
| Gold `XAU/USD` | Twelve Data | Live/delayed route wired |
| USD/INR | Twelve Data | Live/delayed route wired |
| US 10-year Treasury `DGS10` | FRED | End-of-day route wired |
| RBI releases | RBI RSS | Live route wired |
| Fed releases | Federal Reserve RSS | Live route wired |

## Still Fixture-Backed

- Nifty 50
- Sensex
- S&P 500
- Nasdaq Composite
- Brent crude
- Briefing story summaries
- Watchlist quote details

These stay fixture-backed until symbol coverage and source rights are confirmed. The app must not present unconfirmed symbols as live.

## Verification

Commands run:

```bash
npm run check
npm audit --omit=dev
```

Results:

- TypeScript and production build passed.
- Production audit returned `0 vulnerabilities`.
- Build output includes dynamic routes:
  - `/api/market-data`
  - `/api/calendar`

Route smoke checks:

- `/api/market-data` returned `status: "mixed"`.
- Live/delayed instruments returned:
  - Gold from Twelve Data
  - USD/INR from Twelve Data
  - US 10-year Treasury from FRED
- `/api/calendar` returned `status: "live"` with RBI and Federal Reserve RSS release items.

## Remaining Phase 3 Work

- Refine Twelve Data symbol mapping for Nifty 50, Sensex, S&P 500, Nasdaq Composite, and Brent.
- Add a safe news discovery route only after GDELT rate-limit behavior is stable enough.
- Decide whether briefing stories should remain curated fixtures or be regenerated from source metadata.
- Add route-level tests for provider failure and fixture fallback.
- Add UI affordance for manual refresh if needed.

## Environment Variables

Local keys live in `.env.local`:

```bash
TWELVE_DATA_API_KEY=...
FRED_API_KEY=...
```

For Vercel, the same names must be added in the project dashboard under Settings > Environment Variables, then the deployment must be redeployed.
