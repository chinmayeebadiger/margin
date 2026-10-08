# Market Brief Phase 2 Data Adapter Proof

Started: 8 October 2026

Phase 2 tests whether the trusted, mostly-free source list can support the prototype before live data is wired into the UI.

## What Was Added

- `lib/data/adapters/types.ts`: shared adapter and provider-check contracts.
- `lib/data/adapters/sources.ts`: source registry for Twelve Data, GDELT, RBI RSS, RBI DBIE, FRED, and Federal Reserve RSS.
- `scripts/phase2-data-proof.mjs`: repeatable proof script for public feeds/APIs and key-gated providers.
- `npm run phase2:proof`: command to run the proof script.

## How To Run

```bash
npm run phase2:proof
```

Optional free API keys:

```bash
TWELVE_DATA_API_KEY=... FRED_API_KEY=... npm run phase2:proof
```

Without keys, the script still tests GDELT, RBI RSS, Federal Reserve RSS, and RBI DBIE. It reports Twelve Data and FRED as blocked by missing key.

## Source Proof Summary

| Source | Status | Notes |
|---|---|---|
| Twelve Data | Partially confirmed | With the free key, Gold `XAU/USD` and USD/INR returned quote metadata. Initial symbols for Nifty, Sensex, S&P 500, Nasdaq, and Brent did not match as written and need symbol-search refinement. |
| GDELT DOC API | Inconclusive / rate-sensitive | Public endpoint was reachable manually but returned rate-limit responses during repeated proof runs. Production use needs cached server refreshes and slow polling. |
| RBI RSS | Confirmed | Press releases and notifications feeds both returned parseable XML items. |
| Federal Reserve RSS | Confirmed | Press and monetary feeds both returned parseable XML items. |
| FRED API | Confirmed | With the free key, `DGS10` returned recent US 10-year Treasury observations. |
| RBI DBIE Data API | Confirmed | Public search endpoint returned an inflation-related WPI table from the RBI DBIE data API. |

## Latest Proof Run

Run command:

```bash
npm run phase2:proof
```

Result summary:

- Twelve Data: blocked because `TWELVE_DATA_API_KEY` is not set.
- GDELT DOC API: endpoint behavior is inconclusive in repeated local runs; it returned rate-limit responses manually and a transient fetch failure in the script.
- RBI RSS: ok, `2/2` feeds parseable.
- Federal Reserve RSS: ok, `2/2` feeds parseable.
- FRED API: blocked because `FRED_API_KEY` is not set.
- RBI DBIE Data API: ok, search endpoint returned one inflation-related record.

Latest keyed run after adding `.env.local`:

- Twelve Data: partial, `2/7` target instruments returned quote metadata.
- Twelve Data confirmed: Gold `XAU/USD`, USD/INR.
- Twelve Data unresolved with current symbols: Nifty 50, Sensex, S&P 500, Nasdaq Composite, Brent crude.
- FRED API: ok, returned `5` DGS10 observations.

## Exit Criteria Progress

- [x] Provider adapter interface created.
- [x] Twelve Data coverage test path created.
- [x] GDELT news prototype created.
- [x] RBI RSS parser created.
- [x] Federal Reserve RSS parser created.
- [x] FRED fetcher path created.
- [x] RBI DBIE prototype created.
- [x] RBI RSS confirmed with live response.
- [x] Federal Reserve RSS confirmed with live response.
- [x] RBI DBIE confirmed with live response.
- [x] FRED DGS10 confirmed with free key.
- [x] Twelve Data free key confirmed working.
- [ ] Twelve Data target-symbol coverage fully mapped.
- [ ] GDELT confirmed under a clean rate-limit window.

## Current Gaps

- Indian market/index data is still the biggest uncertainty because the first Twelve Data symbol guesses only confirmed Gold and USD/INR.
- FRED is viable for US 10-year Treasury yield with the free key.
- GDELT is useful for discovery and source links, but it must be cached, rate-limited, and should not be treated as a full article-content provider.
- RBI DBIE is macro/economic data, not live quotes.

## Next Phase 2 Step

Refine Twelve Data symbols using its symbol-search endpoint, then rerun:

```bash
npm run phase2:proof
```

The keys are stored locally in `.env.local`, which is ignored by git.
