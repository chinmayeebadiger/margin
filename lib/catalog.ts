import type { MarketInstrument, WatchInstrument } from "./contracts";

function market(
  id: string,
  name: string,
  symbol: string,
  region: MarketInstrument["region"],
  kind: MarketInstrument["kind"],
  unit: string,
  sourceUrl: string,
  timezone: string
): MarketInstrument {
  return {
    id,
    name,
    symbol,
    region,
    kind,
    unit,
    value: null,
    change: null,
    session: "Latest available observation",
    status: "closed",
    history: [],
    meta: {
      sourceName: "Source unavailable",
      sourceUrl,
      fetchedAt: "",
      availability: "unavailable",
      delayLabel: "Quote unavailable",
      timezone
    }
  };
}

export const marketCatalog: MarketInstrument[] = [
  market(
    "nifty50",
    "Nifty 50",
    "NIFTY 50",
    "India",
    "index",
    "points",
    "https://www.nse.in/nse-mcp",
    "Asia/Kolkata"
  ),
  market(
    "sensex",
    "Sensex",
    "SENSEX",
    "India",
    "index",
    "points",
    "https://www.bseindia.com/",
    "Asia/Kolkata"
  ),
  market(
    "sp500",
    "S&P 500",
    "SPX",
    "US",
    "index",
    "points",
    "https://fred.stlouisfed.org/series/SP500",
    "America/New_York"
  ),
  market(
    "nasdaq",
    "Nasdaq Composite",
    "IXIC",
    "US",
    "index",
    "points",
    "https://fred.stlouisfed.org/series/NASDAQCOM",
    "America/New_York"
  ),
  market(
    "gold",
    "Gold",
    "XAU/USD",
    "Global",
    "commodity",
    "USD/oz",
    "https://twelvedata.com/docs",
    "UTC"
  ),
  market(
    "brent",
    "Brent Crude",
    "BRENT",
    "Global",
    "commodity",
    "USD/bbl",
    "https://fred.stlouisfed.org/series/DCOILBRENTEU",
    "UTC"
  ),
  market(
    "usdinr",
    "USD/INR",
    "USD/INR",
    "India",
    "fx",
    "INR per USD",
    "https://twelvedata.com/docs",
    "Asia/Kolkata"
  ),
  market(
    "us10y",
    "US 10-year Treasury",
    "DGS10",
    "US",
    "yield",
    "%",
    "https://fred.stlouisfed.org/series/DGS10",
    "America/New_York"
  )
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
    note: "Watch company releases and US market context."
  }
];
