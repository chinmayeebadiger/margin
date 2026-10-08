# Market Brief Product Requirements Document

Version 1.0 · 8 October 2026 · Status: build baseline

Market Brief is a personal, phone-first application for following Indian and global financial news, checking markets, understanding potential impacts, researching companies, and eventually practising swing trading. This document defines the product, user experience, phased scope, and conditions for release. The companion master document defines implementation and the build sequence.

The first production release should support a useful 15–20 minute daily routine. The complete vision includes five sections: Today, Markets, Discover, Watchlist, and Swing Lab. There is no AI tutor, chatbot, daily lesson, quiz, learning curriculum, or learning streak. AI may assist with sourced summaries and market analysis behind the scenes.

## 1 Product decisions

| Decision | Baseline |
|---|---|
| Primary user | One college student following India and US markets |
| Primary device | Phone; support both iOS Safari and Android Chrome until device is confirmed |
| Delivery | Mobile-first Next.js PWA, accessible by URL and installable on the home screen |
| Design reference | TradingView screenshot color theme only; original news-led layout |
| Access | Personal account; no public social features |
| Data | Latest available licensed data; delayed or end-of-day acceptable and explicitly labelled |
| Cost | Start with fixtures, then free tiers where viable; no guaranteed free live-data or AI service |
| Trading | Simulation only; no broker connection or real order execution |
| Build approach | Release small working phases; preserve the full vision in the backlog |

### Assumptions and unresolved choices

The established palette is authoritative: background #090A0C, panels #15171B, borders #26292F, primary text #F5F5F5, secondary text #8B9099. Exact pixel matching to the screenshot is not required. Phone model, data vendors, notification timing, and any paid-service budget remain undecided. Defaults are Asia/Kolkata display time, India plus US coverage, dark mode, and notifications off.

No unselected data vendor should be treated as a committed dependency. The owner approves costs before any paid integration. Research and prototype work can proceed without those decisions.

## 2 Problem and goals

Financial information is scattered between news sites, market dashboards, company pages, and trading tools. A beginner can see a price change without understanding its context, while large feeds make a short daily routine difficult. Market Brief brings a finite briefing, meaningful market snapshots, relevant company developments, and research tools into one phone interface.

The product should help the user answer: What happened? What is reported about why it happened? What might it affect? What deserves follow-up? It should make saving an article or company observation easy and avoid requiring constant screen monitoring.

### Success criteria

These are proposed targets, not measured results:

- The owner completes a useful briefing in 15–20 minutes on at least four days per week during a two-week pilot.
- Every displayed quote identifies its source, observation time, and data delay or availability status.
- Every published story has an original source link and publication time; analysis is visibly separate from reported facts.
- Watchlist and bookmark changes survive reloads and appear on another signed-in device.
- The core app works at 360–430 CSS pixels without horizontal page scrolling.
- Cached saved stories remain readable offline; quotes are marked offline and never look live.
- No release blocker remains in authentication, data integrity, calculations, or mobile navigation.

## 3 User journeys

### Morning routine

Open Today, check the briefing date and update status, scan India and overnight US snapshots, read the five most important available stories, inspect one potential impact chain, and save a story for later. A briefing remains finite; related stories are optional.

### Company research

Search by name or ticker, confirm exchange and currency, add the correct instrument to Watchlist, review its latest quote and developments, and record a personal observation. Boeing can be followed alongside Indian companies without confusing USD and INR.

### Event awareness

Open the economic calendar, inspect an RBI or Fed event, view its scheduled time in IST, and read why it may matter. After release, compare actual, forecast, and previous values only if the provider supplies each field.

### Later trading practice

Open Swing Lab, create a thesis with entry, stop, target, and capital constraints, review calculated risk, and save a paper plan. An open simulated position and a closed trade remain distinguishable from a draft. Journal the exit and review statistics without placing a real order.

## 4 Information architecture

| Section | Purpose | Major destinations |
|---|---|---|
| Today | Finite daily briefing | Briefing, stories, overnight recap, upcoming events |
| Markets | Cross-asset dashboard | India, US, global, commodities, FX, yields, sectors |
| Discover | Research and relationships | Connect the Dots, sectors, company profiles, trends |
| Watchlist | Personal company tracking | Lists, instrument detail, news, earnings, notes |
| Swing Lab | Paper planning and review | Calculator, plans, simulated trades, journal, stats |

Settings, saved items, calendar, and search are reached through header actions or relevant section links. Do not add more bottom tabs. Before a later section ships, show only working tabs; retain the five-section target architecture without presenting dead controls.

### Screen inventory

Required for the daily release: Today, story detail, Markets, instrument detail, Watchlist, add instrument search, Calendar, Saved, Settings, sign-in, and install guidance. Later screens: Discover overview, impact detail, sector detail, company comparison, research notes, Swing Lab overview, plan editor, trade detail, journal, and statistics.

## 5 Design and interaction requirements

Use the confirmed black, charcoal, grey, and white palette. Gains and losses use restrained green and red, with a sign or text label so color is not the only cue. White is the primary action accent. Use Geist or Inter, readable body text around 15–16 px, and tabular numerals for market data.

The home screen prioritizes briefings rather than candlesticks. Compact rows, thin dividers, modest corners, and deliberate spacing should carry the design. Avoid gradients, neon, glass effects, decorative illustrations, oversized dashboard tiles, and chat interfaces. Charts belong where they help interpret data; technical charts arrive in Swing Lab.

- Bottom navigation accounts for the phone safe area and does not cover content.
- Touch targets should be at least 44 by 44 CSS pixels wherever practical.
- Filters can scroll horizontally; the page itself must not.
- Search and forms remain usable with the mobile keyboard open.
- Back navigation restores filter, scroll, and selection state where practical.
- Loading skeletons match the content shape; errors contain a useful retry action.
- Text can enlarge to 200 percent without losing actions or essential content.
- Support keyboard navigation, visible focus, screen-reader labels, reduced motion, and WCAG AA text contrast.
- Desktop layouts remain usable, but phone usability determines release acceptance.

## 6 Functional requirements

### FR01 Daily briefing

Show the briefing date, generated or curated time, freshness status, five to seven ranked stories when enough quality stories exist, a compact market snapshot, overnight developments, and relevant upcoming events. Do not pad a quiet day with weak or fabricated stories.

Each story contains headline, short summary, geography, category, source, publication time, reading-time estimate, and save action. Detail separates What happened, Reported drivers, and Potential implications. Provide original reporting links. The 15-minute mode is an ordered reading flow with progress and resume; it is not a course.

Acceptance: a user can complete and resume the flow; duplicate coverage of one event does not occupy most slots; stale briefing status is visible; missing sources prevent an AI summary from publication.

### FR02 News collection and trust

Ingest permitted feeds or APIs. Group duplicate stories while retaining their sources. Keep published_at separate from ingested_at. Categories include economy, central banks, markets, companies, geopolitics, technology, and policy. India and US stories are prioritized, with wider global coverage when relevant.

Do not infer market causation from price direction alone. Wording such as “may contribute” or “reported driver” is required when appropriate. If a driver is unknown, state that. Summaries must not imply access to article content that was unavailable. Full copyrighted article republication is outside scope.

Acceptance: every claim can be traced to an allowed input or is labelled as analysis; broken or inaccessible sources do not cause invented replacements; corrections update or withdraw affected summaries.

### FR03 Market dashboard

Daily-release instruments: Nifty 50, Sensex, S&P 500, Nasdaq Composite, gold, Brent crude, USD/INR, and US 10-year Treasury yield. Later additions: Bank Nifty, Dow, Nikkei, Hang Seng, FTSE, silver, EUR/USD, and Indian 10-year yield.

Display instrument identity, value, unit or currency, absolute change, percentage change where meaningful, session, observed time, source, delay, and market-open or last-session status. Quote providers must clarify whether gold and oil represent spot, futures, or another benchmark. A futures contract is not silently presented as spot. Yields use percent and basis-point changes rather than stock-style percentages.

Charts start with daily historical lines. Supported ranges depend on provider coverage; do not offer unavailable ranges. “Why did this move?” links relevant coverage and clearly labelled interpretations.

Acceptance: different time zones do not make yesterday’s US close look like today’s Indian session; missing values are shown as unavailable, never zero; charts have units; unrelated articles are not presented as proven drivers.

### FR04 Bookmarks and history

Save and unsave stories and impact analyses. Saved items include the original link, original publication time, cached summary version, and saved time. Reading history is private and optional. Search Saved by title or category. Deleted upstream content retains a clear unavailable-source message.

Acceptance: duplicate saves are idempotent; loading or network failure does not falsely confirm success; saved content can be removed; offline saves show pending until synced.

### FR05 Watchlist

Search names and symbols with exchange and currency. Add, remove, and reorder instruments. Start with one list; named lists are later. Display quote, change, next earnings when available, and linked developments. Instrument detail includes sector, description, how the business makes money, and later fundamentals with reporting dates.

Support owner notes. Price alerts and comparison arrive later. No brokerage credentials, holdings import, or portfolio return calculation in the daily release.

Acceptance: the same instrument cannot be duplicated in one list; a ticker on another exchange remains a different identity; remove requires an easy undo or confirmation; missing earnings dates are not guessed.

### FR06 Economic calendar

Include important RBI/Fed decisions, inflation, GDP, employment releases, and watched-company earnings where licensed data is available. Filter by date, region, and importance. Store event times in UTC with source timezone metadata; display Asia/Kolkata by default. Distinguish scheduled, tentative, postponed, released, and cancelled events.

Show actual, forecast, previous, units, and source when supplied. A short context paragraph explains relevance to markets without predicting a certain price outcome.

Acceptance: US daylight-saving changes convert correctly; date-only earnings are not given invented hours; revised previous values are identified; unavailable forecasts display a dash with meaning.

### FR07 Discover and Connect the Dots

Discover combines sectors, themes, company business profiles, and sourced event-impact analyses. Each impact chain shows event, mechanism, potentially affected asset or sector, direction if defensible, time horizon, uncertainty, and source links. Include alternative outcomes or countervailing factors for material claims.

Example structure: supply disruption risk → possible oil price pressure → higher input costs for some airlines. This is a mechanism illustration, not a claim about current events or a trading signal. Expandable vertical steps should work on a phone; a large graph is optional and not required.

Acceptance: reported facts and hypothesized effects have different labels; direct links are explainable; confidence labels are qualitative editorial judgements, not invented statistical probabilities; chains can be saved.

### FR08 Sector research and company comparison

Later releases show sector returns and major movers using a named universe and consistent observation period. A heatmap must define its metric and avoid treating a handful of stocks as a complete sector index. Compare two or three companies within compatible currencies, periods, and sectors where appropriate.

Fundamentals identify trailing or forward P/E, diluted EPS where supplied, reporting currency, and financial period. Negative earnings are not shown as a normal positive P/E. Business profiles use dated sources. Revenue, margins, debt, and cash flow appear only when reliable coverage exists.

### FR09 Notifications and recaps

Later provide morning/evening briefings, weekly recap, important event reminders, and watchlist price alerts. All are opt-in with quiet hours, category controls, and a daily cap. Do not send every headline. In-app notifications remain the fallback if push is unavailable.

Acceptance: explicit permission precedes push; duplicate job delivery does not create duplicate alerts; disabled alerts stay disabled; price alerts disclose polling cadence and delay, and never promise instant delivery.

### FR10 Swing Lab planning

Introduce a long-equity calculator before automated paper trading. Inputs: account capital, risk percent, entry, stop, target, currency, maximum allocation, and optional cost estimate. Require entry > stop, target > entry, and positive values. Display risk per share, reward per share, risk budget, whole-share quantity, notional exposure, and reward-to-risk.

Quantity is the smaller of risk-limited and cash-limited sizes. Costs can lower quantity further. A stop defines planned risk; it does not guarantee a fill during gaps. Separate INR and USD paper accounts; no implicit FX conversion. Shorting, leverage, options, and fractional shares are excluded initially.

Acceptance: invalid inputs yield actionable errors; zero risk is rejected; rounding cannot exceed capital; quantity zero produces a valid “insufficient budget” state.

### FR11 Paper trades and journal

A draft records thesis, setup, entry, stop, target, planned quantity, and review date. A simulated open trade records fill, time, costs, and data source. Closed trades record exit, result, exit reason, and lesson. Support manual recorded fills before automatic simulation. User-entered and automatically simulated fills have distinct labels.

Later automated simulation must document gap handling, fees, slippage, sessions, corporate actions, and bars that touch both stop and target. Such ambiguous bars use a conservative or explicitly selected convention, never hindsight. No real orders are placed.

Statistics include closed-trade count, wins, losses, breakeven trades, win rate, average gain/loss, net P&L, average R, expectancy, and later drawdown. Do not combine currencies or claim a small sample establishes profitability.

### FR12 Search settings and export

Search news, instruments, and saved research. Preferences include timezone, regions, optional notifications, offline storage, and data status. Export user watchlists, notes, and journal in later phases. Users can sign out and clear locally cached private content. Account deletion removes personal data according to the documented retention policy.

## 7 Data and freshness policy

Every dataset has explicit source, observed_at or published_at, fetched_at, and availability. Availability is one of fixture, live, delayed, end_of_day, stale, or unavailable. A fixture indicator must be visible throughout prototype mode.

Candidate freshness objectives, conditional on licensed coverage: news refreshed every 30–60 minutes, quotes every 15 minutes while the user actively views a market, calendar every six hours, fundamentals daily or after reports. These are planning objectives, not promises. Start with one daily ingestion plus cached on-demand refresh where permitted. Final stale thresholds follow vendor delay, asset sessions, and scheduler capacity; missing freshness metadata is treated as unavailable quality.

On a failed refresh, retain the last valid data with its true time and stale status. Never update observed_at just because a request succeeded. Markets close, news continues, and closed-market status alone is not an error. Do not compare percentage moves from incompatible intervals.

## 8 Nonfunctional requirements

| Area | Release requirement |
|---|---|
| Performance | Aim for LCP ≤2.5 seconds, INP ≤200 ms, CLS ≤0.1; validate with mobile lab tests and later field data |
| Reliability | Core screen renders when a provider fails; each module has independent fallback |
| Security | Server-only provider secrets; authenticated writes; least-privilege grants and ownership policies |
| Privacy | Watchlists, notes, journals, and saved items isolated by user; no secrets or private note bodies in logs |
| Offline | Cached public briefing and saved content available; clear offline state; private caches cleared on sign-out |
| Installation | Correct manifest, icons, standalone display, HTTPS, and device-tested guidance |
| Accessibility | Accessible labels, logical focus, contrast, zoom support, non-color indicators |
| Maintainability | Typed data contracts, provider adapters, migrations, fixtures, meaningful tests |
| Observability | Job outcomes, data age, upstream failures, app errors, and cost consumption visible to owner |

## 9 Phases and release gates

| Phase | Outcome | Indicative solo effort |
|---|---|---|
| 0 | Scope, provider feasibility, route and data contracts | 2–4 working days |
| 1 | Mobile prototype with labelled fixtures and PWA install | 5–8 working days |
| 2 | Real daily briefing app with persistence | 10–15 working days |
| 3 | Discover and sourced market intelligence | 8–12 working days |
| 4 | Research depth, alerts, recaps, resilient offline sync | 8–12 working days |
| 5 | Swing planning, manual paper trades, journal and statistics | 10–15 working days |
| 6 | Automated simulation and optional backtesting | Separate estimate after data feasibility |

These are effort estimates, not dates or guarantees; provider access and available development time can change them. At a few hours per week, calendar duration will be much longer.

Phase 0 exits with documented permitted sources, costs, coverage gaps, and one viable data route. Phase 1 exits after real-phone review, working navigation, meaningful loading/error states, and home-screen installation. Phase 2 is the first useful release: real sourced news, market snapshots, saved items, synced watchlist, calendar, authentication, and tested ownership isolation. Run a two-week personal pilot before expanding.

Phase 3 exits with sourced impact chains, uncertainty labels, sector pages, and validated backend summarization if enabled. Phase 4 exits after notification permission, retry/deduplication, timezone and offline-sync tests. Phase 5 exits after formula and statistics fixtures pass and simulated records cannot be confused with real trades. Phase 6 remains blocked until licensed history and fill semantics are approved and verified.

## 10 Scope exclusions

No AI financial tutor, chat UI, quizzes, lesson feed, or curriculum. No real trading, automated investment advice, options execution, brokerage connection, public community, copy trading, guaranteed predictions, or guaranteed real-time data. Native app-store distribution is not required. Charts are optional research tools, not the visual identity of the home screen.

## 11 Risks and decisions before integration

| Risk | Required response |
|---|---|
| Free data lacks global or Indian coverage | Record gaps; reduce coverage or select an approved paid source |
| News license prohibits stored summaries or reuse | Use permitted metadata and outbound links; change source |
| AI fabricates relationships | Source-constrained generation, validation, uncertainty labels, withdrawal path |
| Rate limits or provider outage | Shared cache, bounded refresh, backoff, last-known data |
| Phone background limits | Server-side jobs; no promise of background refresh from the PWA |
| Scope growth | Finish the daily release and pilot before later phases |
| Paper simulation overstates results | Explicit fills, fees, gaps, corporate actions, and ambiguity rules |
| Free hosting cannot meet timing | Adjust cadence or select a suitable scheduler after budget review |

## 12 Release checklist

- All shipped controls work; unfinished sections are hidden or clearly marked unavailable.
- Fixture mode cannot appear as real market data.
- Source, date, units, delay, and uncertainty labels are complete.
- Reload, duplicate requests, offline use, and upstream failures do not corrupt personal state.
- Two test accounts cannot read or mutate each other’s personal records.
- Sign-in and sign-out work in browser and installed PWA.
- No provider secret is included in client bundles or logs.
- Phone navigation, safe areas, keyboard, zoom, and external source links are tested.
- Backup/export plan and rollback steps exist.
- Usage limits, remaining data gaps, and recurring cost are documented.

## 13 Technical references

Checked 8 October 2026. These references support implementation constraints; the phase design and acceptance thresholds above are product decisions.

- Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel cron usage and pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing

Next.js supports App Router manifests and home-screen installation. Offline caching requires a deliberate service-worker strategy. Supabase security depends on grants as well as ownership policies. Vercel Hobby currently restricts each cron job to daily execution and imprecise timing; frequent or precisely timed updates require another suitable scheduling arrangement.
