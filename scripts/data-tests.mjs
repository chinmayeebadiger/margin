import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const exports = {};
  modules.set(path, exports);
  const code = ts.transpileModule(
    readFileSync(new URL(`../${path}.ts`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }
  ).outputText;
  const localRequire = (name) =>
    name === "undici"
      ? { ...require(name), fetch: (...args) => globalThis.fetch(...args) }
      : name.startsWith("@/")
        ? load(name.slice(2))
        : require(name);
  vm.runInThisContext(`(function(require,exports){${code}\n})`)(
    localRequire,
    exports
  );
  return exports;
}
const data = load("lib/data/live");
const { cachedData } = load("lib/data/cache");
const originalFetch = globalThis.fetch;
const originalKeys = {
  twelve: process.env.TWELVE_DATA_API_KEY,
  fred: process.env.FRED_API_KEY
};
try {
  const quote = {
    nseTimestamp: "09-Oct-2026 15:30:00",
    index: { last: 22520.45, change: -288.65, percChange: -1.3 }
  };
  const payload = {
    result: { content: [{ type: "text", text: JSON.stringify(quote) }] }
  };
  assert.deepEqual(
    data.extractNseIndexQuote(
      data.parseMcpResponse(
        `event: message\ndata: ${JSON.stringify(payload)}\n\n`
      )
    ),
    {
      value: 22520.45,
      change: -288.65,
      changePercent: -1.3,
      observedAt: "2026-10-09T10:00:00.000Z"
    }
  );
  assert.equal(
    data.extractNseIndexQuote({
      result: { content: [{ text: '{"index":{"last":null}}' }] }
    }),
    null
  );
  assert.equal(data.parseMcpResponse("invalid"), null);
  assert.equal(
    data.extractNseIndexQuote({
      result: { content: [{ text: '{"stock":{"value":1400,"volume":10000}}' }] }
    }),
    null
  );
  assert.deepEqual(
    data.extractNseIndexQuote({
      result: {
        content: [
          {
            text: JSON.stringify({
              stock: {
                lastTradedPrice: 1170.3,
                change: -7.7,
                perChange: -0.65,
                latestTimestamp: "2026-10-09 16:00:27"
              }
            })
          }
        ]
      }
    }),
    {
      value: 1170.3,
      change: -7.7,
      changePercent: -0.65,
      observedAt: "2026-10-09T10:30:27.000Z"
    }
  );
  process.env.TWELVE_DATA_API_KEY = "test-key";
  process.env.FRED_API_KEY = "test-key";
  globalThis.fetch = async () => {
    throw new Error("provider down");
  };
  const failed = await data.getMarketData();
  assert.equal(failed.status, "unavailable");
  assert.ok(
    failed.instruments.every(
      (row) =>
        row.value === null &&
        row.change === null &&
        !row.history.length &&
        row.meta.availability === "unavailable"
    )
  );
  assert.deepEqual((await data.getCalendarData()).events, []);
  assert.deepEqual((await data.getNewsData()).stories, []);
  assert.ok(
    (await data.getWatchlistData()).instruments.every(
      (row) => row.value === null
    )
  );

  globalThis.fetch = async (url) => {
    if (String(url).includes("stlouisfed"))
      return Response.json({
        observations: [
          { date: "2026-10-09", value: "." },
          { date: "2026-10-08", value: "100" },
          { date: "2026-10-07", value: "95" }
        ]
      });
    throw new Error("other source down");
  };
  const partial = await data.getMarketData();
  assert.equal(partial.status, "mixed");
  assert.equal(
    partial.instruments.find((row) => row.id === "sp500").value,
    100
  );
  assert.equal(partial.instruments.find((row) => row.id === "sp500").change, 5);
  assert.equal(
    partial.instruments.find((row) => row.id === "nifty50").value,
    null
  );

  globalThis.fetch = async (_url, options) => {
    const body = options?.body ? JSON.parse(options.body) : null;
    if (body?.method === "initialize")
      return Response.json(
        { result: {} },
        { headers: { "mcp-session-id": "mock-session" } }
      );
    if (body?.method === "tools/call")
      return Response.json({
        result: {
          content: [
            {
              text: JSON.stringify(
                body.params.name === "cm_get_stock_quote"
                  ? {
                      stock: {
                        lastTradedPrice: 1170.3,
                        change: -7.7,
                        perChange: -0.65,
                        latestTimestamp: "2026-10-09 16:00:27"
                      }
                    }
                  : quote
              )
            }
          ]
        }
      });
    throw new Error("other provider down");
  };
  assert.equal(
    (await data.getMarketData()).instruments.find((row) => row.id === "nifty50")
      .value,
    22520.45
  );
  const watch = await data.getWatchlistData();
  assert.equal(
    watch.instruments.find((row) => row.id === "reliance-nse").value,
    1170.3
  );
  assert.equal(
    watch.instruments.find((row) => row.id === "infy-nse").meta.observedAt,
    "2026-10-09T10:30:27.000Z"
  );

  globalThis.fetch = async (url) => {
    const india = String(url).includes("rbi");
    const link = india
      ? "https://www.rbi.org.in/release/1"
      : "https://www.federalreserve.gov/release/1";
    return new Response(
      `<rss><channel><item><title>Policy update</title><description>Published &amp; confirmed</description><link>${link}</link><pubDate>Fri, 09 Oct 2026 12:00:00 GMT</pubDate></item><item><title>Bad date</title><link>${link}/bad</link><pubDate>invalid</pubDate></item></channel></rss>`
    );
  };
  const news = await data.getNewsData();
  assert.equal(news.stories.length, 2);
  assert.ok(
    news.stories.every(
      (story) =>
        story.claimBasis === "reported" &&
        !story.reportedDrivers.length &&
        !story.potentialImplications.length
    )
  );
  assert.deepEqual(
    news.stories.map((story) => story.id),
    (await data.getNewsData()).stories.map((story) => story.id)
  );
  assert.equal((await data.getCalendarData()).events.length, 2);
  let calls = 0;
  await Promise.all([
    cachedData("test", 1000, async () => ++calls),
    cachedData("test", 1000, async () => ++calls)
  ]);
  assert.equal(calls, 1);
  const handlers = {};
  vm.runInNewContext(
    readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
    {
      self: {
        location: { origin: "https://brief.test" },
        addEventListener: (name, handler) => {
          handlers[name] = handler;
        }
      },
      URL,
      Response,
      fetch: async () => {
        throw new Error("offline");
      }
    }
  );
  let offlineResponse;
  handlers.fetch({
    request: { method: "GET", url: "https://brief.test/api/news" },
    respondWith: (response) => {
      offlineResponse = response;
    }
  });
  const offline = await offlineResponse;
  assert.equal(offline.status, 503);
  assert.deepEqual(await offline.json(), { error: "Offline" });
  console.log(
    "Passed: NSE JSON/SSE + IST dates, malformed quotes, provider failures, partial success, RSS validation/deduplication, stable story IDs, request coalescing."
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalKeys.twelve === undefined) delete process.env.TWELVE_DATA_API_KEY;
  else process.env.TWELVE_DATA_API_KEY = originalKeys.twelve;
  if (originalKeys.fred === undefined) delete process.env.FRED_API_KEY;
  else process.env.FRED_API_KEY = originalKeys.fred;
}
