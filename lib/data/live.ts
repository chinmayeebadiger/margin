import { XMLParser } from "fast-xml-parser";
import type { CalendarEvent, MarketInstrument } from "@/lib/contracts";
import { calendarEvents, marketInstruments } from "@/lib/fixtures";

type TwelveQuote = {
  symbol?: string;
  name?: string;
  exchange?: string;
  datetime?: string;
  timestamp?: number;
  last_quote_at?: number;
  close?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
  message?: string;
  code?: number;
};

type FredObservation = {
  date: string;
  value: string;
};

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
};

type RssFeed = {
  rss?: {
    channel?: {
      title?: string;
      item?: RssItem | RssItem[];
    };
  };
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true
});

const liveTargets = {
  gold: {
    providerSymbol: "XAU/USD",
    unit: "USD/oz",
    session: "Spot reference",
    sourceName: "Twelve Data",
    sourceUrl: "https://twelvedata.com/docs",
    timezone: "UTC"
  },
  usdinr: {
    providerSymbol: "USD/INR",
    unit: "INR per USD",
    session: "FX reference",
    sourceName: "Twelve Data",
    sourceUrl: "https://twelvedata.com/docs",
    timezone: "Asia/Kolkata"
  }
} satisfies Partial<Record<string, {
  providerSymbol: string;
  unit: string;
  session: string;
  sourceName: string;
  sourceUrl: string;
  timezone: string;
}>>;

const fredTargets = {
  sp500: {
    seriesId: "SP500",
    sourceUrl: "https://fred.stlouisfed.org/series/SP500",
    session: "Latest FRED observation",
    unit: "points",
    timezone: "America/New_York"
  },
  nasdaq: {
    seriesId: "NASDAQCOM",
    sourceUrl: "https://fred.stlouisfed.org/series/NASDAQCOM",
    session: "Latest FRED observation",
    unit: "points",
    timezone: "America/New_York"
  },
  brent: {
    seriesId: "DCOILBRENTEU",
    sourceUrl: "https://fred.stlouisfed.org/series/DCOILBRENTEU",
    session: "Europe Brent spot price",
    unit: "USD/bbl",
    timezone: "UTC"
  },
  us10y: {
    seriesId: "DGS10",
    sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
    session: "Latest FRED observation",
    unit: "%",
    timezone: "America/New_York"
  }
} satisfies Partial<Record<string, {
  seriesId: string;
  sourceUrl: string;
  session: string;
  unit: string;
  timezone: string;
}>>;

const rbiFeeds = [
  "https://rbi.org.in/pressreleases_rss.xml",
  "https://rbi.org.in/notifications_rss.xml"
];

const fedFeeds = [
  "https://www.federalreserve.gov/feeds/press_all.xml",
  "https://www.federalreserve.gov/feeds/press_monetary.xml"
];

export type MarketDataPayload = {
  instruments: MarketInstrument[];
  fetchedAt: string;
  status: "fixture" | "mixed" | "live";
  notes: string[];
};

export type CalendarPayload = {
  events: CalendarEvent[];
  fetchedAt: string;
  status: "fixture" | "mixed" | "live";
  notes: string[];
};

export async function getMarketData(): Promise<MarketDataPayload> {
  const fetchedAt = new Date().toISOString();
  const notes: string[] = [];
  const byId = new Map(marketInstruments.map((instrument) => [instrument.id, instrument]));
  const instruments = [...marketInstruments];

  const twelveKey = process.env.TWELVE_DATA_API_KEY;

  if (!twelveKey) {
    notes.push("TWELVE_DATA_API_KEY is missing; Twelve Data-backed instruments stayed on fixtures.");
  } else {
    for (const [id, target] of Object.entries(liveTargets)) {
      const fixture = byId.get(id);
      if (!fixture) {
        continue;
      }

      const quote = await fetchTwelveQuote(target.providerSymbol, twelveKey);
      if (!quote || quote.code || quote.message) {
        notes.push(`${fixture.name} stayed fixture-backed: ${quote?.message ?? "Twelve Data quote unavailable"}.`);
        continue;
      }

      const value = Number(quote.close);
      const change = Number(quote.change);
      const changePercent = Number(quote.percent_change);

      if (!Number.isFinite(value) || !Number.isFinite(change)) {
        notes.push(`${fixture.name} stayed fixture-backed: malformed Twelve Data quote.`);
        continue;
      }

      replaceInstrument(instruments, id, {
        ...fixture,
        symbol: quote.symbol ?? target.providerSymbol,
        value,
        change,
        changePercent: Number.isFinite(changePercent) ? changePercent : fixture.changePercent,
        unit: target.unit,
        session: target.session,
        status: quote.is_market_open ? "open" : "last_session",
        meta: {
          sourceName: target.sourceName,
          sourceUrl: target.sourceUrl,
          observedAt: quote.last_quote_at ? new Date(quote.last_quote_at * 1000).toISOString() : quote.datetime,
          fetchedAt,
          availability: "delayed",
          delayLabel: "Free API delayed quote",
          timezone: target.timezone
        },
        history: appendHistory(fixture, quote.datetime, value)
      });
    }
  }

  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) {
    notes.push("FRED_API_KEY is missing; FRED-backed instruments stayed on fixtures.");
  } else {
    for (const [id, target] of Object.entries(fredTargets)) {
      const fixture = byId.get(id);
      if (!fixture) {
        continue;
      }

      const replacement = await fredSeriesToInstrument(fixture, target, fredKey, fetchedAt);
      if (replacement) {
        replaceInstrument(instruments, id, replacement);
      } else {
        notes.push(`${fixture.name} stayed fixture-backed: FRED returned no usable ${target.seriesId} observations.`);
      }
    }
  }

  const liveCount = instruments.filter((instrument) => instrument.meta.availability !== "fixture").length;
  const fixtureIds = instruments.filter((instrument) => instrument.meta.availability === "fixture").map((instrument) => instrument.id);

  if (fixtureIds.includes("nifty50") || fixtureIds.includes("sensex")) {
    notes.push("Nifty 50 and Sensex remain fixture-backed: Twelve Data did not accept common index symbols, and no free trusted official quote API has been confirmed.");
  }

  return {
    instruments,
    fetchedAt,
    status: liveCount === 0 ? "fixture" : liveCount === instruments.length ? "live" : "mixed",
    notes
  };
}

export async function getCalendarData(): Promise<CalendarPayload> {
  const fetchedAt = new Date().toISOString();
  const notes: string[] = [];
  const releases: CalendarEvent[] = [];

  const rbiItems = await fetchFeedItems(rbiFeeds, notes);
  const fedItems = await fetchFeedItems(fedFeeds, notes);

  releases.push(
    ...rbiItems.slice(0, 3).map((item, index) => rssItemToEvent(item, {
      idPrefix: "rbi-release",
      index,
      region: "India",
      sourceName: "RBI RSS",
      context: "Official RBI release. Use as source context; this does not by itself predict a market move."
    })),
    ...fedItems.slice(0, 3).map((item, index) => rssItemToEvent(item, {
      idPrefix: "fed-release",
      index,
      region: "US",
      sourceName: "Federal Reserve RSS",
      context: "Official Federal Reserve release. Use as policy or banking context; this is not a trading signal."
    }))
  );

  const events = releases.length ? releases : calendarEvents;

  return {
    events,
    fetchedAt,
    status: releases.length ? "live" : "fixture",
    notes
  };
}

async function fetchTwelveQuote(symbol: string, apiKey: string): Promise<TwelveQuote | null> {
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<TwelveQuote>;
}

async function fetchFredObservations(seriesId: string, apiKey: string): Promise<FredObservation[]> {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { observations?: FredObservation[] };
  return data.observations ?? [];
}

async function fredSeriesToInstrument(
  fixture: MarketInstrument,
  target: {
    seriesId: string;
    sourceUrl: string;
    session: string;
    unit: string;
    timezone: string;
  },
  apiKey: string,
  fetchedAt: string
): Promise<MarketInstrument | null> {
  const observations = await fetchFredObservations(target.seriesId, apiKey);
  const numeric = observations
    .filter((observation) => observation.value !== ".")
    .map((observation) => ({ date: observation.date, value: Number(observation.value) }))
    .filter((observation) => Number.isFinite(observation.value));

  const latest = numeric[0];
  const previous = numeric[1];

  if (!latest || !previous) {
    return null;
  }

  const change = latest.value - previous.value;
  const changePercent = previous.value === 0 ? undefined : (change / previous.value) * 100;

  return {
    ...fixture,
    value: latest.value,
    change,
    changePercent: fixture.kind === "yield" ? undefined : changePercent,
    unit: target.unit,
    session: target.session,
    status: "last_session",
    meta: {
      sourceName: "FRED",
      sourceUrl: target.sourceUrl,
      observedAt: `${latest.date}T16:00:00${target.timezone === "UTC" ? "Z" : "-04:00"}`,
      fetchedAt,
      availability: "end_of_day",
      delayLabel: "End-of-day series",
      timezone: target.timezone
    },
    history: numeric
      .slice(0, 6)
      .reverse()
      .map((point) => ({
        date: new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${point.date}T00:00:00Z`)),
        value: point.value
      }))
  };
}

async function fetchFeedItems(feedUrls: string[], notes: string[]) {
  const allItems: RssItem[] = [];

  for (const feedUrl of feedUrls) {
    try {
      const response = await fetch(feedUrl, { next: { revalidate: 1800 } });
      if (!response.ok) {
        notes.push(`${feedUrl} failed with ${response.status}.`);
        continue;
      }

      const parsed = xmlParser.parse(await response.text()) as RssFeed;
      allItems.push(...asArray(parsed.rss?.channel?.item));
    } catch (error) {
      notes.push(`${feedUrl} failed: ${error instanceof Error ? error.message : "unknown error"}.`);
    }
  }

  return allItems
    .filter((item) => item.title && item.link && item.pubDate)
    .sort((a, b) => new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime());
}

function rssItemToEvent(
  item: RssItem,
  options: {
    idPrefix: string;
    index: number;
    region: "India" | "US";
    sourceName: string;
    context: string;
  }
): CalendarEvent {
  return {
    id: `${options.idPrefix}-${options.index}`,
    title: item.title ?? "Official release",
    region: options.region,
    importance: options.index === 0 ? "high" : "medium",
    status: "released",
    startsAt: new Date(item.pubDate ?? Date.now()).toISOString(),
    sourceName: options.sourceName,
    sourceUrl: item.link ?? "",
    forecast: "-",
    previous: "-",
    context: options.context,
    availability: "live"
  };
}

function appendHistory(fixture: MarketInstrument, date: string | undefined, value: number) {
  const label = date
    ? new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
    : "Latest";

  return [...fixture.history.slice(-5), { date: label, value }];
}

function replaceInstrument(instruments: MarketInstrument[], id: string, replacement: MarketInstrument) {
  const index = instruments.findIndex((instrument) => instrument.id === id);
  if (index >= 0) {
    instruments[index] = replacement;
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
