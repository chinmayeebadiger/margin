import { XMLParser } from "fast-xml-parser";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const checkedAt = new Date().toISOString();
const timeoutMs = 12000;
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true
});

const rbiFeeds = [
  "https://rbi.org.in/pressreleases_rss.xml",
  "https://rbi.org.in/notifications_rss.xml"
];

const fedFeeds = [
  "https://www.federalreserve.gov/feeds/press_all.xml",
  "https://www.federalreserve.gov/feeds/press_monetary.xml"
];

const twelveSymbols = [
  { label: "Nifty 50", symbol: "NIFTY" },
  { label: "Sensex", symbol: "SENSEX" },
  { label: "S&P 500", symbol: "SPX" },
  { label: "Nasdaq Composite", symbol: "IXIC" },
  { label: "Gold", symbol: "XAU/USD" },
  { label: "Brent crude", symbol: "BRENT" },
  { label: "USD/INR", symbol: "USD/INR" }
];

async function main() {
  const checks = [];

  checks.push(await checkTwelveData());
  await sleep(6000);
  checks.push(await checkGdelt());
  checks.push(await checkRss("RBI RSS", rbiFeeds));
  checks.push(await checkRss("Federal Reserve RSS", fedFeeds));
  checks.push(await checkFred());
  checks.push(await checkRbiDbie());

  const summary = checks.map(({ provider, status, availability, message, sample }) => ({
    provider,
    status,
    availability,
    message,
    sample
  }));

  console.log(JSON.stringify({ checkedAt, summary }, null, 2));
}

async function checkTwelveData() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return result({
      provider: "Twelve Data",
      status: "blocked",
      sourceUrl: "https://twelvedata.com/docs",
      availability: "requires_key",
      message: "Set TWELVE_DATA_API_KEY to test free-tier symbol coverage.",
      sample: twelveSymbols
    });
  }

  const samples = [];
  for (const item of twelveSymbols) {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(item.symbol)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetchJson(url);
    samples.push({
      label: item.label,
      symbol: item.symbol,
      ok: Boolean(response.data && !response.data.code),
      name: response.data?.name,
      exchange: response.data?.exchange,
      currency: response.data?.currency,
      error: response.data?.message
    });
    await sleep(9000);
  }

  const okCount = samples.filter((item) => item.ok).length;

  return result({
    provider: "Twelve Data",
    status: okCount === samples.length ? "ok" : okCount > 0 ? "partial" : "failed",
    sourceUrl: "https://twelvedata.com/docs",
    availability: "delayed",
    message: `${okCount}/${samples.length} target instruments returned quote metadata.`,
    sample: samples
  });
}

async function checkGdelt() {
  const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=RBI&mode=ArtList&format=json&maxrecords=5&sort=HybridRel";
  const response = await fetchText(url);

  if (!response.ok) {
    if (response.status === 429 || response.error.includes("Please limit requests")) {
      return result({
        provider: "GDELT DOC API",
        status: "partial",
        sourceUrl: "https://gdeltproject.org/data.html",
        availability: "rate_limited",
        message: "Endpoint is reachable but rate-limited this run. Use cached server refreshes and one request per 5+ seconds."
      });
    }

    return result({
      provider: "GDELT DOC API",
      status: "failed",
      sourceUrl: "https://gdeltproject.org/data.html",
      availability: "unavailable",
      message: response.error
    });
  }

  if (response.text.includes("Please limit requests")) {
    return result({
      provider: "GDELT DOC API",
      status: "partial",
      sourceUrl: "https://gdeltproject.org/data.html",
      availability: "rate_limited",
      message: "Endpoint is reachable but rate-limited this run. Use cached server refreshes and one request per 5+ seconds."
    });
  }

  try {
    const parsed = JSON.parse(response.text);
    const articles = Array.isArray(parsed.articles) ? parsed.articles : [];
    return result({
      provider: "GDELT DOC API",
      status: articles.length ? "ok" : "partial",
      sourceUrl: "https://gdeltproject.org/data.html",
      availability: "live",
      message: `Returned ${articles.length} article metadata records.`,
      sample: articles.slice(0, 3).map((article) => ({
        title: article.title,
        source: article.sourceCountry,
        url: article.url,
        seenDate: article.seendate
      }))
    });
  } catch (error) {
    return result({
      provider: "GDELT DOC API",
      status: "failed",
      sourceUrl: "https://gdeltproject.org/data.html",
      availability: "unavailable",
      message: `Could not parse JSON: ${error.message}`
    });
  }
}

async function checkRss(provider, feeds) {
  const samples = [];

  for (const feedUrl of feeds) {
    const response = await fetchText(feedUrl);
    if (!response.ok) {
      samples.push({ feedUrl, ok: false, error: response.error });
      continue;
    }

    const parsed = xmlParser.parse(response.text);
    const channel = parsed.rss?.channel;
    const items = asArray(channel?.item);
    samples.push({
      feedUrl,
      ok: items.length > 0,
      title: channel?.title,
      itemCount: items.length,
      latest: items.slice(0, 2).map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate
      }))
    });
  }

  const okCount = samples.filter((sample) => sample.ok).length;
  return result({
    provider,
    status: okCount === feeds.length ? "ok" : okCount > 0 ? "partial" : "failed",
    sourceUrl: provider === "RBI RSS" ? "https://www.rbi.org.in/Scripts/rss.aspx" : "https://www.federalreserve.gov/feeds/feeds.htm",
    availability: "live",
    message: `${okCount}/${feeds.length} RSS feeds returned parseable items.`,
    sample: samples
  });
}

async function checkFred() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return result({
      provider: "FRED API",
      status: "blocked",
      sourceUrl: "https://fred.stlouisfed.org/docs/api/fred/overview.html",
      availability: "requires_key",
      message: "Set FRED_API_KEY to fetch DGS10 observations."
    });
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&file_type=json&limit=5&sort_order=desc&api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetchJson(url);
  const observations = response.data?.observations ?? [];

  return result({
    provider: "FRED API",
    status: observations.length ? "ok" : "partial",
    sourceUrl: "https://fred.stlouisfed.org/docs/api/fred/overview.html",
    availability: "end_of_day",
    message: `Returned ${observations.length} DGS10 observations.`,
    sample: observations.slice(0, 3)
  });
}

async function checkRbiDbie() {
  const url = "https://data-api.dbie.rbihub.in/api/search?q=inflation";
  const response = await fetchJson(url);

  if (!response.ok) {
    return result({
      provider: "RBI DBIE Data API",
      status: "failed",
      sourceUrl: "https://dev.dbie.rbihub.in/docs/using-the-site",
      availability: "unavailable",
      message: response.error
    });
  }

  const data = response.data;
  const records = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : Array.isArray(data?.tables) ? data.tables : [];

  return result({
    provider: "RBI DBIE Data API",
    status: records.length ? "ok" : "partial",
    sourceUrl: "https://dev.dbie.rbihub.in/docs/using-the-site",
    availability: "end_of_day",
    message: `Search endpoint responded with ${records.length} inflation-related records.`,
    sample: records.slice(0, 3)
  });
}

async function fetchJson(url) {
  const response = await fetchText(url);
  if (!response.ok) {
    return response;
  }
  try {
    return { ok: true, data: JSON.parse(response.text) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON from ${url}: ${error.message}` };
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "MarketBriefPrototype/0.1 phase2-data-proof"
      }
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `${response.status} ${response.statusText}: ${text.slice(0, 240)}`
      };
    }
    return { ok: true, text };
  } catch (error) {
    const cause = error.cause?.code ?? error.cause?.message;
    return { ok: false, error: cause ? `${error.message} (${cause})` : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function result(input) {
  return {
    checkedAt,
    ...input
  };
}

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
