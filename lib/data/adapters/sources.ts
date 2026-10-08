export const phase2Sources = {
  twelveData: {
    name: "Twelve Data",
    docs: "https://twelvedata.com/docs",
    requiresKey: true,
    envKey: "TWELVE_DATA_API_KEY"
  },
  gdelt: {
    name: "GDELT DOC API",
    docs: "https://gdeltproject.org/data.html",
    requiresKey: false
  },
  rbiRss: {
    name: "RBI RSS",
    docs: "https://www.rbi.org.in/Scripts/rss.aspx",
    requiresKey: false
  },
  rbiDbie: {
    name: "RBI DBIE Data API",
    docs: "https://dev.dbie.rbihub.in/docs/using-the-site",
    baseUrl: "https://data-api.dbie.rbihub.in",
    requiresKey: false
  },
  fred: {
    name: "FRED API",
    docs: "https://fred.stlouisfed.org/docs/api/fred/overview.html",
    requiresKey: true,
    envKey: "FRED_API_KEY"
  },
  federalReserveRss: {
    name: "Federal Reserve RSS",
    docs: "https://www.federalreserve.gov/feeds/feeds.htm",
    requiresKey: false
  }
} as const;
