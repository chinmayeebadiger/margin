# Market Brief Master Build Document

Version 1.0 - 8 October 2026 - Status: MVP prototype build plan

This document converts the Market Brief PRD into an implementation plan for a final MVP prototype: a mobile-first PWA optimized for iPhone 15 Plus Safari, with no authentication required. The PRD remains the product authority; this document is the build sequence, architecture, data-source plan, and release checklist.

## 1. Build Target

Market Brief should ship first as a polished personal PWA prototype that feels like a real daily market briefing app even before every data integration is live.

Baseline decisions:

| Area | Decision |
|---|---|
| Device target | iPhone 15 Plus Safari first; Android Chrome can remain broadly responsive but is not the primary QA device |
| Delivery | Next.js PWA available by URL and installable to the iPhone home screen |
| Auth | None for MVP prototype |
| Persistence | Local-first storage for saves, watchlist, notes, and briefing progress |
| Stack | Next.js App Router, TypeScript, Tailwind CSS, server routes for API adapters |
| Design | Dark TradingView-inspired palette from PRD, original news-led layout |
| Data stance | Fixture-first, then minimal free APIs where licensing and coverage are acceptable |
| Trading | Simulation/planning only, no broker connection or real orders |

The MVP should not wait for perfect live data. It should make data status visible everywhere and degrade honestly: fixture, delayed, end_of_day, stale, or unavailable.

## 2. MVP Scope

The prototype should include the full daily routine, but only the working sections should be visible in navigation.

### Included

- Today briefing with five to seven ranked stories when fixtures/API data permit.
- Story detail with What happened, Reported drivers, Potential implications, source links, published time, and summary version metadata.
- Market snapshot for Nifty 50, Sensex, S&P 500, Nasdaq Composite, gold, Brent crude, USD/INR, and US 10-year yield.
- Markets screen with compact instrument rows and daily historical line charts when available.
- Watchlist with add/remove/reorder, instrument identity, exchange, currency, quote state, and notes.
- Saved items with saved time and cached summary.
- Calendar for RBI, Fed, inflation, GDP, jobs, and selected earnings events where source data exists.
- Settings for timezone, data status, offline cache controls, and install guidance.
- PWA manifest, icons, service worker/offline shell, and iOS install instructions.

### Deferred

- Authentication and cloud sync.
- Public sharing or social features.
- Push notifications.
- Discover/Connect the Dots beyond a small fixture-backed preview.
- Fundamentals depth for Indian companies.
- Swing Lab beyond a later standalone calculator.
- Automated paper-trade simulation and backtesting.

## 3. Information Architecture

MVP bottom navigation:

1. Today
2. Markets
3. Watchlist
4. Saved
5. Settings

Calendar is reachable from Today and Settings. Search is a header action where needed. Discover and Swing Lab stay out of the tab bar until they have real working screens.

## 4. User Experience Requirements

The interface should be dense, calm, and phone-native. It should not look like a marketing landing page.

Design rules:

- Use the PRD palette: background `#090A0C`, panels `#15171B`, borders `#26292F`, primary text `#F5F5F5`, secondary text `#8B9099`.
- Use white for primary actions; restrained green/red for market moves with signs or labels.
- Use Inter or Geist, 15-16 px body text, tabular numerals for prices.
- Prefer compact rows, dividers, modest corners, sticky section headers where helpful.
- Avoid gradients, neon, glass effects, decorative illustrations, oversized cards, and chat UI.
- Keep touch targets at least 44 px where practical.
- Avoid horizontal page scroll at 360-430 CSS px.
- Respect iOS safe areas, especially bottom navigation.
- Text must remain usable with 200 percent zoom.

## 5. Technical Architecture

Suggested structure:

```text
app/
  (tabs)/
    today/
    markets/
    watchlist/
    saved/
    settings/
  api/
    briefing/
    market-data/
    calendar/
components/
  layout/
  market/
  briefing/
  watchlist/
  saved/
lib/
  data/
    fixtures/
    adapters/
    contracts.ts
  storage/
  time/
  formatting/
  pwa/
```

Core principles:

- Define typed contracts before wiring APIs.
- Use fixtures that exactly match the contracts.
- Put all vendor calls behind server-side adapters.
- Never expose API keys in client bundles.
- Cache responses and preserve source timestamps separately from fetch timestamps.
- Treat missing or malformed provider data as unavailable, not zero.
- Keep local persistence behind a small storage layer so cloud sync can be added later.

## 6. Data Contracts

Every data object needs enough metadata to support trust labels.

Required metadata:

- `source_name`
- `source_url`
- `observed_at` for market data or `published_at` for news/events
- `fetched_at`
- `availability`: `fixture`, `live`, `delayed`, `end_of_day`, `stale`, or `unavailable`
- `delay_label`
- `currency` or `unit` where applicable
- `timezone`

News summaries additionally require:

- `summary_version`
- `claim_basis`: `reported`, `analysis`, or `fixture`
- `source_access`: `metadata_only`, `linked_article`, `official_release`, or `licensed_content`

## 7. Minimal Source Plan

Use the smallest source set that gives the most trust. The prototype starts with fixtures and then progressively swaps in these adapters.

### Recommended primary sources

| Need | Primary source | Why it is preferred | Free/API status | MVP use |
|---|---|---|---|---|
| Market quotes and simple historical prices | Twelve Data | Broad market API with stocks, forex, ETFs, commodities, crypto, and global coverage; Basic plan lists 8 credits/minute and 800/day | Free API key; coverage must be tested for Indian instruments | Primary quote adapter if Nifty/Sensex/USDINR/commodities coverage is acceptable |
| Global financial news discovery | GDELT DOC/API and Frontpage Graph | Free global news index; useful for finding source links and metadata without republishing full articles | Free JSON APIs | News discovery and dedupe input, not full article storage |
| Indian macro data | RBI DBIE via Reserve Bank Innovation Hub data API | Public read-only API, JSON/CSV, no key, RBI-source economic and financial tables | Free, no key | Indian macro context and calendar support |
| RBI official releases | RBI RSS feeds | Official RBI updates with links to full documents | Free RSS | RBI events, monetary policy releases, official source links |
| US macro/yields | FRED API | Official St. Louis Fed API for economic series and Treasury yield data | Free account/API key | US 10-year yield and macro series |
| Fed official releases | Federal Reserve RSS feeds | Official Fed announcements and release links | Free RSS | Fed calendar and policy event source links |
| US company fundamentals, later | SEC EDGAR APIs | Official SEC submissions and extracted XBRL data; no auth/key for public data APIs | Free, no key | Later US company profile/fundamental details |

### Source links checked

- Twelve Data pricing and free-tier limits: https://twelvedata.com/pricing
- Twelve Data docs/coverage overview: https://twelvedata.com/docs
- GDELT data and APIs: https://gdeltproject.org/data.html
- RBI DBIE API docs: https://dev.dbie.rbihub.in/docs/using-the-site
- RBI RSS feeds: https://www.rbi.org.in/Scripts/rss.aspx
- FRED API overview: https://fred.stlouisfed.org/docs/api/fred/overview.html
- Federal Reserve RSS feeds: https://www.federalreserve.gov/feeds/feeds.htm
- SEC EDGAR APIs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- NSE Indices data subscription note: https://www.niftyindices.com/offerings/data-subscription

## 8. API Requirements

### Required for fixture MVP

No external API is required to ship the first polished PWA prototype. Use local fixtures for:

- Briefing stories.
- Market snapshot.
- Historical chart points.
- Calendar events.
- Watchlist instruments.
- Saved items.

### Required for live-data MVP candidate

| API | Required? | Key required? | Notes |
|---|---:|---:|---|
| Twelve Data | Yes, if using live/delayed quotes | Yes | Test symbol coverage first. Stay within 800/day Basic limit by caching and batching. |
| GDELT | Yes, if using live news discovery | No | Use for metadata and links. Do not store full copyrighted articles. |
| RBI DBIE | Yes, for Indian macro data | No | Public API. Data is not a real-time market feed. |
| RBI RSS | Yes, for official RBI events/releases | No | Parse RSS and store source URL/published time. |
| FRED | Yes, for US yields/macro | Yes, free account | Use for DGS10 and selected macro series. |
| Federal Reserve RSS | Yes, for Fed events/releases | No | Official source links. |
| SEC EDGAR | Later | No | Use after the MVP for US company facts. |

### Likely paid-data trigger

We may need a paid source if:

- Twelve Data Basic does not cover Nifty 50, Sensex, USD/INR, gold, Brent, or required Indian equities acceptably.
- The license does not allow the display pattern we need.
- Rate limits are too tight for daily use after caching.
- We need reliable official Indian index or exchange data rather than prototype-grade delayed/end-of-day data.

The most likely paid category is Indian exchange/index market data. NSE Indices explicitly offers data subscription products for ongoing and historical index data. The MVP should avoid pretending free Indian exchange data is production-grade until we verify coverage and rights.

## 9. Data Refresh Strategy

Prototype:

- Fixtures load instantly from the app.
- Show fixture label globally.
- No scheduled jobs required.

Live-data candidate:

- News: server refresh every 30-60 minutes if deployed scheduler supports it; otherwise manual refresh/cache.
- Quotes: refresh on demand with a 15-minute cache while a market screen is open.
- Calendar: refresh every 6 hours or manual daily refresh.
- Macro data: daily refresh or less frequent depending on series.

Rules:

- Do not update `observed_at` because a fetch succeeded.
- Preserve last valid value with stale status after provider failure.
- Cache per provider and per symbol to protect free-tier limits.
- Do not compare moves from incompatible sessions.

## 10. Implementation Phases

### Phase 0 - Foundation and contracts

Deliverables:

- Next.js app scaffold.
- Tailwind theme from PRD palette.
- TypeScript data contracts.
- Fixture data files.
- Local storage wrapper.
- PWA manifest and icon placeholders.

Exit criteria:

- App runs locally.
- Fixtures render through typed contracts.
- iPhone 15 Plus viewport has no horizontal page scroll.

### Phase 1 - Polished fixture PWA

Deliverables:

- Today, story detail, Markets, Watchlist, Saved, Calendar, Settings.
- Bottom navigation with iOS safe-area support.
- Save/unsave, watchlist add/remove/reorder, notes, reading progress.
- Offline shell and cached fixture content.
- Install guidance for iOS Safari.

Exit criteria:

- A complete 15-20 minute daily routine is possible using fixture data.
- Reload preserves local state.
- Fixture mode is unmistakable.
- Playwright/mobile viewport QA passes.

### Phase 2 - Data adapter proof

Deliverables:

- Adapter interface for providers.
- Twelve Data symbol/coverage test page or script.
- GDELT query prototype with dedupe.
- RBI RSS and Fed RSS parser.
- FRED DGS10 fetcher.
- RBI DBIE search/fetch prototype.

Exit criteria:

- We know which MVP data can remain free.
- Gaps are documented by instrument/source.
- Any paid requirement is explicit before integration.

### Phase 3 - Live/delayed data integration

Deliverables:

- Market data adapter wired into Markets and Today.
- News discovery wired into briefing candidate generation.
- Official release/calendar ingestion.
- Data status labels on all live/delayed fields.
- Provider failure states.

Exit criteria:

- Free-tier limits are respected under normal use.
- Source, time, delay, unit, and availability labels appear everywhere.
- Stale/offline states cannot be confused with live data.

### Phase 4 - Prototype hardening

Deliverables:

- Accessibility pass.
- iPhone Safari install and standalone-mode QA.
- Performance pass.
- Error and empty-state pass.
- Final source/cost note in Settings.

Exit criteria:

- MVP is demo-ready and usable as a personal PWA.
- No unfinished tabs are visible.
- No provider key leaks to client code.

## 11. Testing Plan

Use automated checks where they catch real risk:

- Unit tests for data normalization, market formatting, stale status, and Swing Lab formulas when added.
- Storage tests for idempotent saves and duplicate watchlist prevention.
- Timezone tests for IST display, US market sessions, RBI/Fed events, and daylight-saving transitions.
- Playwright tests for iPhone 15 Plus viewport, navigation, save/unsave, watchlist edits, settings, and offline shell.
- Manual Safari QA for Add to Home Screen and standalone PWA behavior.

## 12. Open Decisions

These do not block the fixture MVP:

1. Confirm whether the PWA will be deployed on Vercel or another host.
2. Decide whether live data is needed in the first demo, or whether fixture MVP plus adapter proof is enough.
3. Confirm whether a free Twelve Data key and free FRED key can be created for the project.
4. After coverage testing, decide whether to accept delayed/end-of-day Indian market data or pay for a licensed source.
5. Decide whether Discover preview should ship in MVP or wait until sourced impact chains are ready.

## 13. Release Checklist

- No authentication is required or shown.
- The app is optimized for iPhone 15 Plus Safari.
- The app is installable as a PWA.
- Bottom navigation does not cover content.
- All visible controls work.
- Fixture/live/delayed/stale/unavailable states are clear.
- All market data has source, observation time, unit/currency, and delay label.
- All stories have source links and publication times.
- Reported facts and analysis are visually distinct.
- Saves, watchlist, notes, and reading progress survive reloads.
- Offline mode does not make quotes look live.
- No API key is present in the client bundle.
- Provider limits and possible paid-data needs are documented in Settings or an internal README.

