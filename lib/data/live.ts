import { XMLParser } from "fast-xml-parser";
import { Agent, fetch as fetchNseTransport } from "undici";
import { createHash } from "node:crypto";
import type { CalendarEvent, MarketInstrument, Story } from "@/lib/contracts";
import {
  marketCatalog as marketInstruments,
  starterWatchlist
} from "@/lib/catalog";

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
  description?: string;
};

type RssFeed = {
  rss?: {
    channel?: {
      title?: string;
      item?: RssItem | RssItem[];
    };
  };
};

type McpResponse = {
  jsonrpc?: string;
  id?: number | string;
  result?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
    isError?: boolean;
    [key: string]: unknown;
  };
  error?: {
    code?: number;
    message?: string;
  };
};

type NseMcpSession = {
  sessionId: string;
  cookie?: string;
};

type NseIndexQuote = {
  value: number;
  change?: number;
  changePercent?: number;
  observedAt?: string;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true
});

const nseMcpEndpoint = "https://mcp.nseindia.in/cmmkt/mcp";
// This edge can stall on IPv6; scope IPv4 selection to NSE rather than changing process-wide DNS.
const nseDispatcher = new Agent({ connect: { family: 4 } });

const nseIndexTargets = {
  nifty50: {
    indexName: "NIFTY 50",
    sourceUrl:
      "https://www.nseindia.com/market-data/live-equity-market?symbol=NIFTY%2050",
    session: "NSE regular session",
    unit: "points",
    timezone: "Asia/Kolkata"
  }
} satisfies Partial<
  Record<
    string,
    {
      indexName: string;
      sourceUrl: string;
      session: string;
      unit: string;
      timezone: string;
    }
  >
>;

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
} satisfies Partial<
  Record<
    string,
    {
      providerSymbol: string;
      unit: string;
      session: string;
      sourceName: string;
      sourceUrl: string;
      timezone: string;
    }
  >
>;

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
} satisfies Partial<
  Record<
    string,
    {
      seriesId: string;
      sourceUrl: string;
      session: string;
      unit: string;
      timezone: string;
    }
  >
>;

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
  status: "unavailable" | "mixed" | "live";
  notes: string[];
};

export type CalendarPayload = {
  events: CalendarEvent[];
  fetchedAt: string;
  status: "unavailable" | "mixed" | "live";
  notes: string[];
};

export async function getMarketData(): Promise<MarketDataPayload> {
  const fetchedAt = new Date().toISOString();
  const notes: string[] = [];
  const byId = new Map(
    marketInstruments.map((instrument) => [instrument.id, instrument])
  );
  const instruments = marketInstruments.map((instrument) =>
    unavailableInstrument(instrument, fetchedAt)
  );

  const nseTask = (async () => {
    const nseSession = await createNseMcpSession(notes);
    if (!nseSession) {
      notes.push(
        "NSE official MCP was unavailable; NSE index quotes are unavailable."
      );
    } else {
      for (const [id, target] of Object.entries(nseIndexTargets)) {
        const catalogInstrument = byId.get(id);
        if (!catalogInstrument) {
          continue;
        }

        const quote = await fetchNseIndexQuote(
          target.indexName,
          nseSession,
          notes
        );
        if (!quote) {
          notes.push(`${catalogInstrument.name}: NSE MCP did not return a usable quote.`);
          continue;
        }

        replaceInstrument(instruments, id, {
          ...catalogInstrument,
          symbol: target.indexName,
          value: quote.value,
          change: quote.change ?? null,
          changePercent: quote.changePercent,
          unit: target.unit,
          session: target.session,
          status: isNseMarketOpen() ? "open" : "last_session",
          meta: {
            sourceName: "NSE official MCP",
            sourceUrl: target.sourceUrl,
            observedAt: quote.observedAt,
            fetchedAt,
            availability:
              quote.observedAt &&
              Date.now() - Date.parse(quote.observedAt) < 5 * 60_000 &&
              isNseMarketOpen()
                ? "delayed"
                : "stale",
            delayLabel: "Delayed NSE quote · up to 15-minute app cache",
            timezone: target.timezone
          },
          history: []
        });
      }
    }
  })();

  const twelveKey = process.env.TWELVE_DATA_API_KEY;

  const twelveTask = (async () => {
    if (!twelveKey) {
      notes.push(
        "TWELVE_DATA_API_KEY is missing; Twelve Data quotes are unavailable."
      );
    } else {
      await Promise.all(
        Object.entries(liveTargets).map(async ([id, target]) => {
          const catalogInstrument = byId.get(id);
          if (!catalogInstrument) {
            return;
          }

          const quote = await fetchTwelveQuote(
            target.providerSymbol,
            twelveKey
          );
          if (!quote || quote.code || quote.message) {
            notes.push(`${catalogInstrument.name}: Twelve Data quote unavailable.`);
            return;
          }

          const value = pickOptionalNumber(quote as Record<string, unknown>, [
            "close"
          ]);
          const change = pickOptionalNumber(quote as Record<string, unknown>, [
            "change"
          ]);
          const changePercent = pickOptionalNumber(
            quote as Record<string, unknown>,
            ["percent_change"]
          );

          if (value === undefined || value <= 0) {
            notes.push(`${catalogInstrument.name}: malformed Twelve Data quote.`);
            return;
          }

          replaceInstrument(instruments, id, {
            ...catalogInstrument,
            symbol: quote.symbol ?? target.providerSymbol,
            value,
            change: change ?? null,
            changePercent,
            unit: target.unit,
            session: target.session,
            status: quote.is_market_open ? "open" : "last_session",
            meta: {
              sourceName: target.sourceName,
              sourceUrl: target.sourceUrl,
              observedAt: quote.last_quote_at
                ? new Date(quote.last_quote_at * 1000).toISOString()
                : quote.datetime,
              fetchedAt,
              availability: "delayed",
              delayLabel: "Delayed quote · up to 15-minute app cache",
              timezone: target.timezone
            },
            history: await fetchTwelveHistory(target.providerSymbol, twelveKey)
          });
        })
      );
    }
  })();

  const fredKey = process.env.FRED_API_KEY;
  const fredTask = (async () => {
    if (!fredKey) {
      notes.push("FRED_API_KEY is missing; FRED observations are unavailable.");
    } else {
      await Promise.all(
        Object.entries(fredTargets).map(async ([id, target]) => {
          const catalogInstrument = byId.get(id);
          if (!catalogInstrument) {
            return;
          }

          const replacement = await fredSeriesToInstrument(
            catalogInstrument,
            target,
            fredKey,
            fetchedAt
          );
          if (replacement) {
            replaceInstrument(instruments, id, replacement);
          } else {
            notes.push(
              `${catalogInstrument.name}: FRED returned no usable observations.`
            );
          }
        })
      );
    }
  })();
  await Promise.all([nseTask, twelveTask, fredTask]);

  const liveCount = instruments.filter(
    (instrument) => instrument.meta.availability !== "unavailable"
  ).length;
  notes.push(
    "Sensex is unavailable: a trusted free BSE quote source has not been verified."
  );

  return {
    instruments,
    fetchedAt,
    status:
      liveCount === 0
        ? "unavailable"
        : liveCount === instruments.length
          ? "live"
          : "mixed",
    notes
  };
}

export async function getCalendarData(): Promise<CalendarPayload> {
  const fetchedAt = new Date().toISOString();
  const notes: string[] = [];
  const releases: CalendarEvent[] = [];

  const [rbiItems, fedItems] = await Promise.all([
    fetchFeedItems(rbiFeeds, notes),
    fetchFeedItems(fedFeeds, notes)
  ]);

  releases.push(
    ...rbiItems.slice(0, 3).map((item, index) =>
      rssItemToEvent(item, {
        idPrefix: "rbi-release",
        index,
        region: "India",
        sourceName: "RBI RSS",
        context:
          "Official RBI release. Use as source context; this does not by itself predict a market move."
      })
    ),
    ...fedItems.slice(0, 3).map((item, index) =>
      rssItemToEvent(item, {
        idPrefix: "fed-release",
        index,
        region: "US",
        sourceName: "Federal Reserve RSS",
        context:
          "Official Federal Reserve release. Use as policy or banking context; this is not a trading signal."
      })
    )
  );

  const events = releases.sort(
    (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)
  );

  return {
    events,
    fetchedAt,
    status:
      rbiItems.length && fedItems.length
        ? "live"
        : releases.length
          ? "mixed"
          : "unavailable",
    notes
  };
}

async function fetchTwelveQuote(
  symbol: string,
  apiKey: string
): Promise<TwelveQuote | null> {
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("timezone", "UTC");

  const response = await safeFetch(url, 900);
  if (!response?.ok) {
    return null;
  }

  return response.json().catch(() => null) as Promise<TwelveQuote | null>;
}

async function createNseMcpSession(
  notes: string[]
): Promise<NseMcpSession | null> {
  const response = await postNseMcp({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "market-brief-prototype",
        version: "0.1.0"
      }
    }
  });

  if (!response?.ok) {
    notes.push(
      `NSE MCP initialize failed: ${response?.error ?? `HTTP ${response?.response?.status ?? "unknown"}`}.`
    );
    return null;
  }

  const sessionId = response.response?.headers.get("mcp-session-id");
  if (!sessionId) {
    notes.push("NSE MCP initialize did not return a session id.");
    return null;
  }

  const cookie = response.response?.headers.get("set-cookie")?.split(";")[0];
  return { sessionId, cookie };
}

async function fetchNseIndexQuote(
  indexName: string,
  session: NseMcpSession,
  notes: string[]
): Promise<NseIndexQuote | null> {
  const response = await postNseMcp(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "cm_get_index_quote",
        arguments: { indexName }
      }
    },
    session
  );

  const payload = response?.payload;
  if (!payload || payload.error || payload.result?.isError) {
    notes.push(
      `NSE MCP quote failed for ${indexName}: ${payload?.error?.message ?? response?.error ?? `HTTP ${response?.response?.status ?? "unknown"}`}.`
    );
    return null;
  }

  const quote = extractNseIndexQuote(payload);
  return quote;
}

async function postNseMcp(
  body: Record<string, unknown>,
  session?: Partial<NseMcpSession>,
  timeoutMs = 6500
): Promise<{
  ok: boolean;
  response?: Response;
  payload: McpResponse | null;
  error?: string;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "user-agent": "MarketBrief/0.1"
    };

    if (session?.sessionId) {
      headers["mcp-session-id"] = session.sessionId;
    }

    if (session?.cookie) {
      headers.cookie = session.cookie;
    }

    const requestOptions = {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store" as const,
      dispatcher: nseDispatcher
    };
    const upstream = await fetchNseTransport(nseMcpEndpoint, requestOptions);
    const text = await upstream.text();
    const response = new Response(text, {
      status: upstream.status,
      headers: Object.fromEntries(upstream.headers.entries())
    });
    return {
      ok: response.ok,
      response,
      payload: parseMcpResponse(text)
    };
  } catch {
    return {
      ok: false,
      payload: null,
      error: "fetch failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseMcpResponse(text: string): McpResponse | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as McpResponse;
  } catch {
    const dataLine = trimmed
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("data:"));

    if (!dataLine) {
      return null;
    }

    try {
      return JSON.parse(dataLine.replace(/^data:\s*/, "")) as McpResponse;
    } catch {
      return null;
    }
  }
}

export function extractNseIndexQuote(
  payload: McpResponse
): NseIndexQuote | null {
  const textBlocks =
    payload.result?.content?.map((item) => item.text).filter(Boolean) ?? [];
  const candidates: unknown[] = [payload.result, ...textBlocks];

  for (const candidate of candidates) {
    const quote = parseNseQuoteCandidate(candidate);
    if (quote) {
      return quote;
    }
  }

  return null;
}

function parseNseQuoteCandidate(candidate: unknown): NseIndexQuote | null {
  if (typeof candidate === "string") {
    const parsed = parseJsonish(candidate);
    if (parsed) {
      return parseNseQuoteCandidate(parsed);
    }

    return null;
  }

  const objects = flattenObjects(candidate);
  const observedAt = objects
    .map((object) =>
      pickDate(normalizeKeys(object), [
        "nsetimestamp",
        "lastupdatetime",
        "timeval",
        "timestamp"
      ])
    )
    .find(Boolean);
  for (const object of objects) {
    const normalized = normalizeKeys(object);
    const value = pickNumber(normalized, [
      "lastprice",
      "last",
      "ltp",
      "indexvalue",
      "lasttradedprice",
      "close"
    ]);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    return {
      value,
      change: pickOptionalNumber(normalized, [
        "change",
        "netchange",
        "chng",
        "pointchange"
      ]),
      changePercent: pickOptionalNumber(normalized, [
        "pchange",
        "percchange",
        "percentchange",
        "perchange",
        "changepercent"
      ]),
      observedAt:
        pickDate(normalized, [
          "nsetimestamp",
          "latesttimestamp",
          "timestamp",
          "lastupdated",
          "lastupdatedtime",
          "datetime",
          "time",
          "timeval"
        ]) ?? observedAt
    };
  }

  return null;
}

function parseJsonish(value: string): unknown | null {
  const trimmed = value.trim();
  const start = trimmed.search(/[\[{]/);
  if (start < 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(start));
  } catch {
    return null;
  }
}

function flattenObjects(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenObjects(item));
  }

  const object = value as Record<string, unknown>;
  return [
    object,
    ...Object.values(object).flatMap((item) => flattenObjects(item))
  ];
}

function normalizeKeys(object: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      value
    ])
  );
}

function pickNumber(object: Record<string, unknown>, keys: string[]) {
  return pickOptionalNumber(object, keys) ?? Number.NaN;
}

function pickOptionalNumber(object: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = object[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const numeric =
      typeof value === "number"
        ? value
        : Number(String(value ?? "").replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return undefined;
}

function pickDate(object: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = object[key];
    if (!value) {
      continue;
    }

    const raw = String(value);
    // NSE publishes local IST strings without an offset. Never interpret them as server-local time.
    const match = raw.match(
      /^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)$/
    );
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    const month = match
      ? months.findIndex(
          (item) => item.toLowerCase() === match[2].toLowerCase()
        ) + 1
      : 0;
    const localIso = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
    const date = new Date(
      match && month
        ? `${match[3]}-${String(month).padStart(2, "0")}-${match[1]}T${match[4]}+05:30`
        : localIso
          ? `${localIso[1]}T${localIso[2]}+05:30`
          : raw
    );
    if (Number.isFinite(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

function isNseMarketOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!weekday || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return false;
  }

  if (weekday === "Sat" || weekday === "Sun") {
    return false;
  }

  const current = hour * 60 + minute;
  return current >= 9 * 60 + 15 && current <= 15 * 60 + 30;
}

async function fetchFredObservations(
  seriesId: string,
  apiKey: string
): Promise<FredObservation[]> {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("limit", "40");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("api_key", apiKey);

  const response = await safeFetch(url, 3600);
  if (!response?.ok) {
    return [];
  }

  const data = (await response.json().catch(() => ({}))) as {
    observations?: FredObservation[];
  };
  return data.observations ?? [];
}

async function fredSeriesToInstrument(
  catalogInstrument: MarketInstrument,
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
    .map((observation) => ({
      date: observation.date,
      value: Number(observation.value)
    }))
    .filter((observation) => Number.isFinite(observation.value));

  const latest = numeric[0];
  const previous = numeric[1];

  if (!latest || !previous) {
    return null;
  }

  const change = latest.value - previous.value;
  const changePercent =
    previous.value === 0 ? undefined : (change / previous.value) * 100;

  return {
    ...catalogInstrument,
    value: latest.value,
    change,
    changePercent: catalogInstrument.kind === "yield" ? undefined : changePercent,
    unit: target.unit,
    session: target.session,
    status: "last_session",
    meta: {
      sourceName: "FRED",
      sourceUrl: target.sourceUrl,
      observedAt: latest.date,
      fetchedAt,
      availability: "end_of_day",
      delayLabel: "End-of-day series",
      timezone: target.timezone
    },
    history: numeric
      .slice(0, 30)
      .reverse()
      .map((point) => ({
        date: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        }).format(new Date(`${point.date}T00:00:00Z`)),
        value: point.value
      }))
  };
}

async function fetchFeedItems(feedUrls: string[], notes: string[], allowedHosts = ["rbi.org.in", "federalreserve.gov"]) {
  const batches = await Promise.all(feedUrls.map(async (feedUrl): Promise<RssItem[]> => {
    try {
      const response = await safeFetch(new URL(feedUrl), 1800);
      if (!response?.ok) {
        notes.push(`${feedUrl} is unavailable.`);
        return [];
      }

      const parsed = xmlParser.parse(await response.text()) as RssFeed;
      return asArray(parsed.rss?.channel?.item);
    } catch (error) {
      notes.push(
        `${feedUrl} failed: ${error instanceof Error ? error.message : "unknown error"}.`
      );
      return [];
    }
  }));
  const allItems = batches.flat();

  return allItems
    .filter(
      (item) =>
        item.title &&
        item.link &&
        item.pubDate &&
        Number.isFinite(Date.parse(item.pubDate)) &&
        isAllowedLink(item.link, allowedHosts)
    )
    .filter(
      (item, index, items) =>
        items.findIndex((other) => other.link === item.link) === index
    )
    .sort(
      (a, b) =>
        new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime()
    );
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
    id: `${options.idPrefix}-${stableId(item.link ?? "")}`,
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

function replaceInstrument(
  instruments: MarketInstrument[],
  id: string,
  replacement: MarketInstrument
) {
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

// Provider errors are isolated so one outage cannot discard other successful data.
async function safeFetch(
  url: URL,
  revalidate: number
): Promise<Response | null> {
  try {
    return await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(6500)
    });
  } catch {
    return null;
  }
}

export function unavailableInstrument(
  instrument: MarketInstrument,
  fetchedAt = new Date().toISOString()
): MarketInstrument {
  return {
    ...instrument,
    value: null,
    change: null,
    changePercent: undefined,
    status: "closed",
    history: [],
    meta: {
      ...instrument.meta,
      sourceName:
        instrument.id === "sensex"
          ? "BSE source pending"
          : "Source unavailable",
      observedAt: undefined,
      fetchedAt,
      availability: "unavailable",
      delayLabel: "Quote unavailable"
    }
  };
}

async function fetchTwelveHistory(
  symbol: string,
  apiKey: string
): Promise<MarketInstrument["history"]> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", "30");
  url.searchParams.set("apikey", apiKey);
  const response = await safeFetch(url, 3600);
  if (!response?.ok) return [];
  const payload = (await response.json().catch(() => ({}))) as {
    values?: Array<{ datetime: string; close: string }>;
  };
  return (payload.values ?? [])
    .filter(
      (point) =>
        Number.isFinite(Number(point.close)) &&
        Number(point.close) > 0 &&
        Number.isFinite(Date.parse(point.datetime))
    )
    .filter(
      (point, index, points) =>
        points.findIndex((other) => other.datetime === point.datetime) === index
    )
    .reverse()
    .map((point) => ({ date: point.datetime, value: Number(point.close) }));
}

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function isAllowedLink(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      allowedHosts.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      )
    );
  } catch {
    return false;
  }
}

export async function getNewsData() {
  const notes: string[] = [];
  const sources: Array<{
    name: string;
    feeds: string[];
    hosts: string[];
    geography: Story["geography"];
    category: Story["category"];
    access: Story["sourceAccess"];
    related: string[];
    headlineOnly?: boolean;
  }> = [
    { name: "Reserve Bank of India", feeds: rbiFeeds, hosts: ["rbi.org.in"], geography: "India", category: "central banks", access: "official_release", related: ["nifty50", "usdinr"] },
    { name: "Federal Reserve", feeds: fedFeeds, hosts: ["federalreserve.gov"], geography: "US", category: "central banks", access: "official_release", related: ["us10y", "sp500", "nasdaq"] },
    { name: "The New York Times", feeds: ["https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"], hosts: ["nytimes.com"], geography: "Global", category: "economy", access: "metadata_only", related: [] },
    { name: "BBC News", feeds: ["https://feeds.bbci.co.uk/news/business/rss.xml"], hosts: ["bbc.co.uk", "bbc.com"], geography: "Global", category: "economy", access: "metadata_only", related: [] },
    { name: "Mint", feeds: ["https://www.livemint.com/rss/markets"], hosts: ["livemint.com"], geography: "India", category: "markets", access: "metadata_only", related: [] },
    { name: "The Economic Times", feeds: ["https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"], hosts: ["economictimes.indiatimes.com"], geography: "India", category: "markets", access: "metadata_only", related: [], headlineOnly: true }
  ];
  const feeds = await Promise.all(sources.map(async (source) => ({ source, items: await fetchFeedItems(source.feeds, notes, source.hosts) })));
  const stories: Story[] = feeds
    .flatMap(({ source, items }) => items.slice(0, 4).map((item) => ({ source, item })))
    .filter(({ item }, index, items) => items.findIndex((other) => canonicalNewsLink(other.item.link!) === canonicalNewsLink(item.link!)) === index)
    .sort((a, b) => Date.parse(b.item.pubDate!) - Date.parse(a.item.pubDate!))
    .map(({ item, source }, index) => {
      const headline = plainText(item.title ?? "News article");
      const summary = source.headlineOnly ? "" :
        plainText(item.description ?? "").slice(0, source.access === "official_release" ? 1000 : 280) ||
        "Read the source for the full details.";
      const sourceUrl = canonicalNewsLink(item.link!);
      return {
        id: stableId(sourceUrl),
        rank: index + 1,
        headline,
        summary,
        geography: source.geography,
        category: source.category,
        readMinutes: Math.max(1, Math.ceil(summary.split(/\s+/).length / 200)),
        source: source.name,
        sourceUrl,
        openInPublisher: source.headlineOnly,
        publishedAt: new Date(item.pubDate!).toISOString(),
        claimBasis: "reported",
        sourceAccess: source.access,
        summaryVersion: "source-rss-v2",
        whatHappened: [summary],
        reportedDrivers: [],
        potentialImplications: [],
        relatedInstruments: source.related
      };
    });
  return {
    stories,
    fetchedAt: new Date().toISOString(),
    status:
      feeds.every(({ items }) => items.length > 0)
        ? ("live" as const)
        : stories.length
          ? ("mixed" as const)
          : ("unavailable" as const),
    notes
  };
}

function canonicalNewsLink(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || ["at_medium", "at_campaign"].includes(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

function plainText(value: string) {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getWatchlistData(): Promise<MarketDataPayload> {
  const fetchedAt = new Date().toISOString();
  const notes: string[] = [];
  const session = await createNseMcpSession(notes);
  const instruments = await Promise.all(
    starterWatchlist.map(async (item): Promise<MarketInstrument> => {
      const base = unavailableInstrument(
        {
          ...marketInstruments[0],
          id: item.id,
          name: item.name,
          symbol: item.symbol,
          region: item.currency === "INR" ? "India" : "US",
          kind: "equity",
          unit: item.currency,
          currency: item.currency,
          session: `${item.exchange} quote`,
          meta: {
            ...marketInstruments[0].meta,
            timezone:
              item.currency === "INR" ? "Asia/Kolkata" : "America/New_York",
            sourceUrl:
              item.exchange === "NSE"
                ? `https://www.nseindia.com/get-quotes/equity?symbol=${item.symbol}`
                : "https://twelvedata.com/docs"
          }
        },
        fetchedAt
      );
      if (item.exchange === "NSE" && session) {
        const response = await postNseMcp(
          {
            jsonrpc: "2.0",
            id: item.id,
            method: "tools/call",
            params: {
              name: "cm_get_stock_quote",
              arguments: { symbol: item.symbol }
            }
          },
          session
        );
        const quote =
          response?.payload &&
          !response.payload.error &&
          !response.payload.result?.isError
            ? extractNseIndexQuote(response.payload)
            : null;
        if (quote)
          return {
            ...base,
            value: quote.value,
            change: quote.change ?? null,
            changePercent: quote.changePercent,
            status: "last_session",
            meta: {
              ...base.meta,
              sourceName: "NSE official MCP",
              sourceUrl: `https://www.nseindia.com/get-quotes/equity?symbol=${item.symbol}`,
              observedAt: quote.observedAt,
              availability:
                quote.observedAt &&
                Date.now() - Date.parse(quote.observedAt) < 5 * 60_000 &&
                isNseMarketOpen()
                  ? "delayed"
                  : "stale",
              delayLabel: "Delayed NSE quote · up to 15-minute app cache"
            }
          };
      } else if (item.exchange === "NYSE" && process.env.TWELVE_DATA_API_KEY) {
        const quote = await fetchTwelveQuote(
          item.symbol,
          process.env.TWELVE_DATA_API_KEY
        );
        if (quote && !quote.code && !quote.message && Number(quote.close) > 0)
          return {
            ...base,
            value: Number(quote.close),
            change:
              pickOptionalNumber(quote as Record<string, unknown>, [
                "change"
              ]) ?? null,
            changePercent: pickOptionalNumber(
              quote as Record<string, unknown>,
              ["percent_change"]
            ),
            status: quote.is_market_open ? "open" : "last_session",
            meta: {
              ...base.meta,
              sourceName: "Twelve Data",
              sourceUrl: "https://twelvedata.com/docs",
              availability: "delayed",
              delayLabel: "Delayed quote · up to 15-minute app cache",
              observedAt: quote.datetime
            }
          };
      }
      notes.push(`${item.symbol}: quote unavailable.`);
      return base;
    })
  );
  const count = instruments.filter(
    (instrument) => instrument.value !== null
  ).length;
  return {
    instruments,
    fetchedAt,
    status:
      count === instruments.length ? "live" : count ? "mixed" : "unavailable",
    notes
  };
}
