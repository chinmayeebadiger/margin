import type { CalendarEvent, MarketInstrument, Story, WatchInstrument } from "./contracts";

const fixtureFetchedAt = "2026-10-08T07:30:00.000Z";

export const marketInstruments: MarketInstrument[] = [
  {
    id: "nifty50",
    name: "Nifty 50",
    symbol: "NIFTY",
    region: "India",
    kind: "index",
    value: 25118.95,
    unit: "points",
    change: 82.4,
    changePercent: 0.33,
    session: "NSE regular session",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-08T10:00:00+05:30",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "Asia/Kolkata"
    },
    history: [
      { date: "Oct 1", value: 24930 },
      { date: "Oct 2", value: 25008 },
      { date: "Oct 5", value: 24988 },
      { date: "Oct 6", value: 25040 },
      { date: "Oct 7", value: 25036 },
      { date: "Oct 8", value: 25119 }
    ]
  },
  {
    id: "sensex",
    name: "Sensex",
    symbol: "SENSEX",
    region: "India",
    kind: "index",
    value: 81926.3,
    unit: "points",
    change: 214.2,
    changePercent: 0.26,
    session: "BSE regular session",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-08T10:00:00+05:30",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "Asia/Kolkata"
    },
    history: [
      { date: "Oct 1", value: 81240 },
      { date: "Oct 2", value: 81580 },
      { date: "Oct 5", value: 81490 },
      { date: "Oct 6", value: 81720 },
      { date: "Oct 7", value: 81712 },
      { date: "Oct 8", value: 81926 }
    ]
  },
  {
    id: "sp500",
    name: "S&P 500",
    symbol: "SPX",
    region: "US",
    kind: "index",
    value: 5788.1,
    unit: "points",
    change: -18.4,
    changePercent: -0.32,
    session: "Previous US close",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-07T16:00:00-04:00",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "America/New_York"
    },
    history: [
      { date: "Oct 1", value: 5748 },
      { date: "Oct 2", value: 5810 },
      { date: "Oct 5", value: 5808 },
      { date: "Oct 6", value: 5806 },
      { date: "Oct 7", value: 5788 }
    ]
  },
  {
    id: "nasdaq",
    name: "Nasdaq Composite",
    symbol: "IXIC",
    region: "US",
    kind: "index",
    value: 18492.6,
    unit: "points",
    change: -94.3,
    changePercent: -0.51,
    session: "Previous US close",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-07T16:00:00-04:00",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "America/New_York"
    },
    history: [
      { date: "Oct 1", value: 18320 },
      { date: "Oct 2", value: 18620 },
      { date: "Oct 5", value: 18590 },
      { date: "Oct 6", value: 18587 },
      { date: "Oct 7", value: 18493 }
    ]
  },
  {
    id: "gold",
    name: "Gold",
    symbol: "XAU/USD",
    region: "Global",
    kind: "commodity",
    value: 2684.4,
    unit: "USD/oz",
    change: 11.2,
    changePercent: 0.42,
    session: "Spot reference",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-08T07:00:00Z",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "UTC"
    },
    history: [
      { date: "Oct 1", value: 2650 },
      { date: "Oct 2", value: 2662 },
      { date: "Oct 5", value: 2678 },
      { date: "Oct 6", value: 2673 },
      { date: "Oct 7", value: 2684 }
    ]
  },
  {
    id: "brent",
    name: "Brent Crude",
    symbol: "BRENT",
    region: "Global",
    kind: "commodity",
    value: 81.32,
    unit: "USD/bbl",
    change: -0.48,
    changePercent: -0.59,
    session: "Front-month reference",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-08T07:00:00Z",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "UTC"
    },
    history: [
      { date: "Oct 1", value: 80.5 },
      { date: "Oct 2", value: 82.2 },
      { date: "Oct 5", value: 82.8 },
      { date: "Oct 6", value: 81.8 },
      { date: "Oct 7", value: 81.32 }
    ]
  },
  {
    id: "usdinr",
    name: "USD/INR",
    symbol: "USDINR",
    region: "India",
    kind: "fx",
    value: 83.44,
    unit: "INR per USD",
    change: 0.06,
    changePercent: 0.07,
    session: "FX reference",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned Twelve Data adapter",
      sourceUrl: "https://twelvedata.com/docs",
      observedAt: "2026-10-08T10:00:00+05:30",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "Asia/Kolkata"
    },
    history: [
      { date: "Oct 1", value: 83.21 },
      { date: "Oct 2", value: 83.28 },
      { date: "Oct 5", value: 83.34 },
      { date: "Oct 6", value: 83.38 },
      { date: "Oct 7", value: 83.44 }
    ]
  },
  {
    id: "us10y",
    name: "US 10-year Treasury",
    symbol: "DGS10",
    region: "US",
    kind: "yield",
    value: 4.18,
    unit: "%",
    change: -0.03,
    session: "Previous US close",
    status: "fixture",
    meta: {
      sourceName: "Fixture based on planned FRED adapter",
      sourceUrl: "https://fred.stlouisfed.org/docs/api/fred/overview.html",
      observedAt: "2026-10-07T16:00:00-04:00",
      fetchedAt: fixtureFetchedAt,
      availability: "fixture",
      delayLabel: "Prototype fixture",
      timezone: "America/New_York"
    },
    history: [
      { date: "Oct 1", value: 4.24 },
      { date: "Oct 2", value: 4.2 },
      { date: "Oct 5", value: 4.23 },
      { date: "Oct 6", value: 4.21 },
      { date: "Oct 7", value: 4.18 }
    ]
  }
];

export const briefingStories: Story[] = [
  {
    id: "rbi-policy-watch",
    rank: 1,
    headline: "RBI policy watch keeps rate-sensitive sectors in focus",
    summary: "Fixture briefing notes that banks, autos, real estate, and USD/INR may stay sensitive around the next RBI communication.",
    geography: "India",
    category: "central banks",
    readMinutes: 3,
    source: "RBI official releases",
    sourceUrl: "https://www.rbi.org.in/Scripts/rss.aspx",
    publishedAt: "2026-10-08T09:00:00+05:30",
    claimBasis: "fixture",
    sourceAccess: "official_release",
    summaryVersion: "fixture-v1",
    whatHappened: [
      "The prototype briefing highlights the next RBI communication as a high-attention event.",
      "Rate-sensitive sectors are grouped together so the user can inspect linked market moves without implying causation."
    ],
    reportedDrivers: [
      "Official RBI releases and scheduled policy events are the planned source of truth.",
      "No live policy update is being claimed in fixture mode."
    ],
    potentialImplications: [
      "Banks and real estate often react to changes in rate expectations.",
      "USD/INR can be sensitive to relative rate expectations and global dollar moves."
    ],
    relatedInstruments: ["nifty50", "sensex", "usdinr"]
  },
  {
    id: "us-yields-tech",
    rank: 2,
    headline: "US yields remain a key overnight signal for growth stocks",
    summary: "A softer US 10-year yield fixture is paired with Nasdaq context, while the app keeps the relationship labelled as interpretation.",
    geography: "US",
    category: "markets",
    readMinutes: 3,
    source: "FRED and Federal Reserve feeds",
    sourceUrl: "https://fred.stlouisfed.org/docs/api/fred/overview.html",
    publishedAt: "2026-10-07T21:00:00Z",
    claimBasis: "fixture",
    sourceAccess: "metadata_only",
    summaryVersion: "fixture-v1",
    whatHappened: [
      "The US 10-year yield fixture moved lower versus the prior reading.",
      "Nasdaq is shown separately with its own price move and timestamp."
    ],
    reportedDrivers: [
      "FRED is the planned source for the US 10-year series.",
      "The fixture does not claim a verified reason for the equity move."
    ],
    potentialImplications: [
      "Lower yields can reduce pressure on long-duration growth stocks, but the effect is not automatic.",
      "Indian IT names may deserve follow-up when US tech sentiment changes overnight."
    ],
    relatedInstruments: ["us10y", "nasdaq", "sp500"]
  },
  {
    id: "oil-airlines",
    rank: 3,
    headline: "Oil softness may matter for transport and input-cost stories",
    summary: "Brent is lower in the fixture snapshot, which places airlines, paint, and logistics companies on the follow-up list.",
    geography: "Global",
    category: "companies",
    readMinutes: 2,
    source: "Twelve Data planned commodity adapter",
    sourceUrl: "https://twelvedata.com/docs",
    publishedAt: "2026-10-08T07:00:00Z",
    claimBasis: "fixture",
    sourceAccess: "metadata_only",
    summaryVersion: "fixture-v1",
    whatHappened: [
      "The Brent fixture is lower for the session.",
      "The app records it as a front-month reference rather than silently treating it as spot."
    ],
    reportedDrivers: [
      "No live commodity driver is claimed in fixture mode.",
      "Future integration must identify whether the quote is spot, futures, or another benchmark."
    ],
    potentialImplications: [
      "Lower oil can ease input-cost pressure for some transport and paint businesses.",
      "The impact can be offset by currency moves or company-specific hedges."
    ],
    relatedInstruments: ["brent", "usdinr"]
  },
  {
    id: "india-open",
    rank: 4,
    headline: "India snapshot is positive but fixture labels stay visible",
    summary: "Nifty and Sensex are marked higher in the prototype snapshot, with source and delay labels shown beside the figures.",
    geography: "India",
    category: "markets",
    readMinutes: 2,
    source: "Twelve Data planned index adapter",
    sourceUrl: "https://twelvedata.com/docs",
    publishedAt: "2026-10-08T10:00:00+05:30",
    claimBasis: "fixture",
    sourceAccess: "metadata_only",
    summaryVersion: "fixture-v1",
    whatHappened: [
      "Nifty 50 and Sensex fixtures are positive.",
      "The market snapshot keeps Indian and US session labels separate."
    ],
    reportedDrivers: [
      "The prototype has no live market-causation engine.",
      "Related stories are shown as follow-up context, not proven drivers."
    ],
    potentialImplications: [
      "Positive index breadth can support a quicker scan of watchlist names.",
      "The user should still inspect sector and company context before making any paper plan."
    ],
    relatedInstruments: ["nifty50", "sensex"]
  },
  {
    id: "calendar-week",
    rank: 5,
    headline: "Macro calendar keeps RBI, inflation, and Fed events together",
    summary: "The calendar view groups official events with status labels so tentative or date-only items do not look more precise than they are.",
    geography: "Global",
    category: "economy",
    readMinutes: 2,
    source: "RBI RSS, Federal Reserve RSS, FRED",
    sourceUrl: "https://www.federalreserve.gov/feeds/feeds.htm",
    publishedAt: "2026-10-08T06:30:00Z",
    claimBasis: "fixture",
    sourceAccess: "official_release",
    summaryVersion: "fixture-v1",
    whatHappened: [
      "The MVP calendar focuses on the events most likely to affect a short daily routine.",
      "Each event carries status, source, and time metadata."
    ],
    reportedDrivers: [
      "Official feeds are preferred for event source links.",
      "Forecast or actual fields are left blank unless a source provides them."
    ],
    potentialImplications: [
      "Known event timing helps separate pre-event positioning from post-release reaction.",
      "The app should never invent exact release times for date-only earnings events."
    ],
    relatedInstruments: ["us10y", "usdinr", "nifty50"]
  }
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: "rbi-minutes",
    title: "RBI policy minutes",
    region: "India",
    importance: "high",
    status: "scheduled",
    startsAt: "2026-10-10T11:30:00+05:30",
    sourceName: "RBI official releases",
    sourceUrl: "https://www.rbi.org.in/Scripts/rss.aspx",
    forecast: "-",
    previous: "-",
    context: "Relevant for rate expectations, banks, bond yields, and USD/INR. This is a fixture event until the RSS adapter is wired.",
    availability: "fixture"
  },
  {
    id: "us-cpi",
    title: "US CPI",
    region: "US",
    importance: "high",
    status: "scheduled",
    startsAt: "2026-10-13T18:00:00+05:30",
    sourceName: "FRED / official release links",
    sourceUrl: "https://fred.stlouisfed.org/docs/api/fred/overview.html",
    forecast: "-",
    previous: "-",
    context: "Inflation surprises can affect US yields, dollar strength, and global risk appetite.",
    availability: "fixture"
  },
  {
    id: "fed-speech",
    title: "Fed official remarks",
    region: "US",
    importance: "medium",
    status: "tentative",
    startsAt: "2026-10-14T22:30:00+05:30",
    sourceName: "Federal Reserve RSS",
    sourceUrl: "https://www.federalreserve.gov/feeds/feeds.htm",
    forecast: "-",
    previous: "-",
    context: "Useful for policy-tone context, but not a guaranteed market-moving event.",
    availability: "fixture"
  }
];

export const starterWatchlist: WatchInstrument[] = [
  {
    id: "reliance-nse",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    exchange: "NSE",
    currency: "INR",
    sector: "Energy / Telecom / Retail",
    note: "Track oil input context and index weight."
  },
  {
    id: "infy-nse",
    symbol: "INFY",
    name: "Infosys",
    exchange: "NSE",
    currency: "INR",
    sector: "IT services",
    note: "Watch US tech sentiment and USD/INR."
  },
  {
    id: "ba-nyse",
    symbol: "BA",
    name: "Boeing",
    exchange: "NYSE",
    currency: "USD",
    sector: "Aerospace",
    note: "US watchlist example; keep USD separate from INR."
  }
];
