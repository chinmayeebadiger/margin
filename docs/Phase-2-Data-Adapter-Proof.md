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
| Twelve Data | Blocked until key | Free key needed before quote coverage can be tested. Target symbols are listed in the script. |
| GDELT DOC API | Inconclusive / rate-sensitive | Public endpoint was reachable manually but returned rate-limit responses during repeated proof runs. Production use needs cached server refreshes and slow polling. |
| RBI RSS | Confirmed | Press releases and notifications feeds both returned parseable XML items. |
| Federal Reserve RSS | Confirmed | Press and monetary feeds both returned parseable XML items. |
| FRED API | Blocked until key | Free key required for DGS10 and other US macro/yield observations. |
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
- [ ] Twelve Data coverage confirmed with free key.
- [ ] FRED DGS10 confirmed with free key.
- [ ] GDELT confirmed under a clean rate-limit window.

## Current Gaps

- Indian market/index data is still the biggest uncertainty until Twelve Data coverage is tested with a free key.
- FRED cannot be verified without `FRED_API_KEY`.
- GDELT is useful for discovery and source links, but it must be cached, rate-limited, and should not be treated as a full article-content provider.
- RBI DBIE is macro/economic data, not live quotes.

## Next Phase 2 Step

Create free keys for:

- Twelve Data: needed to verify market quote coverage.
- FRED: needed to verify `DGS10`.

Then rerun:

```bash
TWELVE_DATA_API_KEY=... FRED_API_KEY=... npm run phase2:proof
```
