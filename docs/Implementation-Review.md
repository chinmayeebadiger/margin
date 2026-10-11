# Market Brief: Implementation Review

Updated: 11 October 2026

## Current prototype

Market Brief is a Next.js PWA for a short personal market-reading routine, designed around an iPhone 15 Plus viewport. The app has no login and no connection to broker accounts. API credentials stay on the server. Local development remains at http://localhost:3000; this work has not been deployed to Vercel.

## Work completed across the phases

| Phase | Delivered | Detailed record |
|---|---|---|
| 0 | Product scope, contracts, source decisions, build phases | `Market-Brief-Master-Build-Document.md` |
| 1 | Brief, Markets, Watch, Saved, Settings, article detail, read progress, local persistence, PWA shell | `docs/Phase-1-Implementation-Log.md` |
| 2 | Provider probes, server key setup, RSS parsing, source evaluation | `docs/Phase-2-Data-Adapter-Proof.md` |
| 3 | Server routes and frontend data integration, with the cleanup described below | `docs/Phase-3-Live-Data-Integration.md` |
| 4 | Some hardening is now included: offline handling, persistence fixes, mobile layout checks, PNG install icons | Physical iPhone Safari installation and standalone QA remain |

## Fixture cleanup implemented in this revision

- Runtime code imports `lib/catalog.ts`, which contains instrument identity and source metadata with null prices. `lib/fixtures.ts` remains as a historical prototype reference and is no longer imported by the running app.
- Brief articles now come from `/api/news`, using RBI and Federal Reserve RSS. Each story has a source link, publication time, a stable URL-based ID and reported-content labels. Feed descriptions supply the excerpts. The app does not generate explanations of price moves or invent article analysis.
- `/api/watchlist` obtains Reliance and Infosys quotes using NSE `cm_get_stock_quote` and Boeing quotes using Twelve Data. Missing or failed quotes return null values and an unavailable label.
- Gold and USD/INR daily charts use Twelve Data `time_series`; FRED charts use up to 30 numeric observations. Invalid observations and duplicate daily timestamps are removed. Nifty and Sensex history show unavailable because a supported historical index route is not established.
- API failures return unavailable rows or empty feeds. Sample prices, sample stories and sample calendar events are no longer used as fallback.
- Each frontend route loads independently, so failure in one feed cannot discard successful data from another. Brief, Markets and Watch display their own coverage state. `Connected` means source-backed data is available; it does not mean every quote is real time. Markets may show `Partial` because Sensex is unavailable.
- The header refresh action reloads the server endpoints. Cached results can be returned within the provider cache windows to protect free quotas.
- Saved articles include their content snapshot in local storage. They remain readable after the source feed rotates or becomes empty. Read progress counts only articles in the current Brief.
- An empty watchlist persists across reloads. Storage write/reset failures do not break navigation.
- NSE local timestamps are converted from IST explicitly. FRED daily dates remain date-only observations; the app no longer invents a close time or a fixed US daylight-saving offset.
- The service worker does not cache API responses. Offline API requests return JSON with HTTP 503, never the HTML application shell. Shell fallback applies only to navigation. Only successful same-origin shell/static assets are cached.
- PNG icons are provided at 180, 192 and 512 pixels. Safari's apple-touch icon uses the 180-pixel PNG. The inert notification button was replaced by refresh.

## Data flow and files to study

1. `lib/catalog.ts`: supported instruments and starter watchlist. These are static identities, not fixture quotes.
2. `lib/contracts.ts`: market, story, calendar and persisted-state contracts. Quote value and change may be null.
3. `lib/data/live.ts`: upstream requests, parsing, timestamps, validation and normalized payloads.
4. `lib/data/cache.ts`: short-lived per-server request coalescing. It reduces duplicate work; it is not a distributed rate limiter.
5. `app/api/market-data/route.ts`, `app/api/watchlist/route.ts`, `app/api/news/route.ts`, `app/api/calendar/route.ts`: server entry points. Market/watch responses cache for 15 minutes; release feeds cache for 30 minutes. Individual daily history requests cache for one hour.
6. `components/MarketBriefApp.tsx`: data loading, tabs, read/save controls, chart rendering, source states and refresh.
7. `lib/storage.ts`: browser-only persistence of saved articles, progress, personal notes and watchlist membership.
8. `public/sw.js`, `public/manifest.webmanifest`, `app/layout.tsx`: PWA shell, install metadata and offline behavior.

Credentials belong in `.env.local`: `TWELVE_DATA_API_KEY` and `FRED_API_KEY`. There are no new required keys. Vercel will need those same server environment variable names when deployed later.

## Minimal sources and cost

| Provider | Use | Key |
|---|---|---|
| [NSE official MCP](https://www.nse.in/nse-mcp) | Nifty latest quote; Reliance and Infosys quotes | None |
| [Twelve Data](https://twelvedata.com/docs) | Gold, USD/INR quotes/history; Boeing quote | Existing Twelve Data key |
| [FRED](https://fred.stlouisfed.org/docs/api/fred/) | S&P 500, Nasdaq, Brent spot, US 10-year yield and daily history | Existing FRED key |
| [RBI official RSS](https://www.rbi.org.in/Scripts/rss.aspx) | Indian policy/banking releases and article excerpts | None |
| [Federal Reserve official RSS](https://www.federalreserve.gov/feeds/feeds.htm) | US policy/banking releases and article excerpts | None |

No paid source or broker service has been added. An uncached full refresh uses at most five Twelve Data requests: two quotes, two daily-history requests and one Boeing quote. Personal prototype use is supported by caching; public traffic across multiple server instances could still exceed an account's free quota. This is not a claim of unlimited free use.

NSE's published MCP terms restrict usage to informational/educational, noncommercial purposes. A commercial product would require revisiting source rights. The current app is a personal prototype.

## Verification and known limits

Automated data tests cover NSE JSON/SSE parsing, null/malformed quotes, negative changes, IST timestamps, index and stock tool responses, provider outages, partial success, official RSS URL/date validation, duplicate release removal, stable IDs, request coalescing and offline API JSON responses. Browser tests exercise 430 x 932 and 1440 x 1000 viewports, a news-only Brief, saving/reading, null quotes, unavailable history, empty-watchlist persistence and saved content retention. Screenshot artifacts are generated under `/tmp/market-brief-qa`.

Commands: `npm run test:data`, `npm run test:ui`, `npm run test:pwa`, `npm run check`, `npm audit --omit=dev`.

Final results: data tests, production build/TypeScript, mobile/desktop browser checks and the production PWA offline test passed. The offline test verified an installed service worker, an offline shell reload, HTTP 503 JSON for `/api/news`, and PNG/manifest icon sizes. `npm audit --omit=dev` reported zero vulnerabilities.

Live smoke checks returned source-backed official RSS articles, FRED series, Twelve Data quotes/daily history and a Boeing quote. NSE-backed rows returned unavailable during the final application smoke check; direct NSE probes earlier returned its tool schemas and a Reliance quote. This distinction remains part of the outstanding connectivity limitation.

Limitations are explicit:

- Sensex has no verified free adapter. A probe of BSE's website data endpoint returned Access Denied. The app displays unavailable and does not substitute an ETF or an unofficial proxy.
- NSE connectivity is intermittent in this environment. Its official stock schema and a Reliance quote were verified directly. The app uses a scoped IPv4 transport and bounded requests, but availability remains dependent on NSE's edge. Mock tests establish parsing and failure behavior; they are not evidence of uninterrupted live service.
- Nifty/Sensex historical charts are unavailable. There are no fabricated chart points.
- Brief currently covers official central-bank releases, not a comprehensive company/geopolitical news service. Broad news discovery remains a separate source-coverage gap.
- The calendar currently lists published official releases, not a verified future CPI/earnings schedule. No forecast, actual or scheduled time is invented.
- Watchlist search covers the three supported starter symbols; arbitrary ticker lookup is not implemented.
- Physical iPhone Safari Add to Home Screen, standalone launch and offline installation require device QA. Chromium viewport checks are not Safari device certification.
- Production dependencies audit clean. The full development audit reports seven findings in the existing Tailwind 3 build dependency chain. Addressing them requires a separate tooling upgrade; no forced major-version migration was performed.

## Next milestone

Finish physical iPhone Safari QA, decide whether unsupported Sensex/history and broader news coverage are required for the prototype demo, then deploy the reviewed prototype to Vercel. There is one planned phase after Phase 3: Phase 4 prototype hardening. Some of its work is included here, but the device checks remain open.
