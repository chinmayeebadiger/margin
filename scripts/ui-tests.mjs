import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const output = "/tmp/market-brief-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium", headless: true });
const story = {
  id: "qa-release",
  rank: 1,
  headline: "Official policy release with a longer headline for mobile layout",
  summary: "Published source context for the daily briefing.",
  geography: "India",
  category: "central banks",
  readMinutes: 1,
  source: "Reserve Bank of India",
  sourceUrl: "https://www.rbi.org.in/",
  publishedAt: "2026-10-09T10:00:00Z",
  claimBasis: "reported",
  sourceAccess: "official_release",
  summaryVersion: "test",
  whatHappened: ["Published source context."],
  reportedDrivers: [],
  potentialImplications: [],
  relatedInstruments: ["nifty50"]
};
const instrument = {
  id: "nifty50",
  name: "Nifty 50",
  symbol: "NIFTY 50",
  region: "India",
  kind: "index",
  value: 22520,
  unit: "points",
  change: 20,
  changePercent: 0.09,
  session: "Last session",
  status: "last_session",
  meta: {
    sourceName: "NSE official MCP",
    sourceUrl: "https://www.nseindia.com/",
    observedAt: "2026-10-09T10:00:00Z",
    fetchedAt: new Date().toISOString(),
    availability: "stale",
    delayLabel: "Last available quote",
    timezone: "Asia/Kolkata"
  },
  history: []
};
try {
  for (const viewport of [
    { width: 430, height: 932 },
    { width: 1440, height: 1000 }
  ]) {
    const context = await browser.newContext({
      viewport,
      serviceWorkers: "block"
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let newsAvailable = true;
    let indianNewsAvailable = false;
    const indianStory = { ...story, id: "qa-indian-publisher", headline: "Indian market feed test", summary: "", source: "The Economic Times", sourceUrl: "https://economictimes.indiatimes.com/markets/test.cms", sourceAccess: "metadata_only", openInPublisher: true, relatedInstruments: [] };
    await page.route("**/api/**", async (route) => {
      const name = new URL(route.request().url()).pathname;
      const payload = {
        status: "live",
        fetchedAt: new Date().toISOString(),
        notes: []
      };
      if (name.endsWith("market-data"))
        payload.instruments = [
          instrument,
          {
            ...instrument,
            id: "sensex",
            name: "Sensex",
            value: null,
            change: null,
            changePercent: undefined,
            meta: { ...instrument.meta, availability: "unavailable" }
          }
        ];
      if (name.endsWith("watchlist")) payload.instruments = [];
      if (name.endsWith("calendar")) payload.events = [];
      if (name.endsWith("news")) payload.stories = newsAvailable ? [story, ...(indianNewsAvailable ? [indianStory] : [])] : [];
      await route.fulfill({ json: payload });
    });
    await page.goto(baseUrl);
    await expect(
      page.getByRole("heading", { name: story.headline })
    ).toBeVisible();
    await expect(
      page.getByText("Market snapshot", { exact: true })
    ).toHaveCount(0);
    await page.screenshot({
      path: `${output}/brief-${viewport.width}.png`,
      fullPage: true
    });
    await page.getByRole("button", { name: "Save story", exact: true }).click();
    await page
      .getByRole("button", { name: "Mark complete", exact: true })
      .click();
    await expect(page.getByText("1 of 1 stories read.")).toBeVisible();
    await page.getByRole("button", { name: "Markets", exact: true }).click();
    await expect(page.getByText("Price history unavailable")).toHaveCount(2);
    await page.screenshot({
      path: `${output}/markets-${viewport.width}.png`,
      fullPage: true
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    assert.equal(overflow, false, `Horizontal overflow at ${viewport.width}`);
    indianNewsAvailable = true;
    await page.getByRole("button", { name: "Brief", exact: true }).click();
    await page.getByRole("button", { name: "Refresh data" }).click();
    const indianLink = page.getByRole("link", { name: /Indian market feed test/ });
    await expect(indianLink).toHaveAttribute("href", indianStory.sourceUrl);
    await expect(indianLink).toHaveAttribute("target", "_blank");
    await page.locator("article").filter({ has: indianLink }).getByRole("button", { name: "Save story", exact: true }).click();
    await page.getByRole("button", { name: "Watch", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove instrument", exact: true })
    ).toHaveCount(3);
    for (let index = 0; index < 3; index++)
      await page
        .getByRole("button", { name: "Remove instrument", exact: true })
        .first()
        .click();
    newsAvailable = false;
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No articles available" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Watch", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove instrument", exact: true })
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Saved", exact: true }).click();
    await expect(page.getByRole("link", { name: /Indian market feed test/ })).toHaveAttribute("href", indianStory.sourceUrl);
    await expect(
      page.getByRole("heading", { name: story.headline })
    ).toBeVisible();
    await page
      .getByRole("button", { name: new RegExp(story.headline) })
      .click();
    await expect(
      page.getByRole("heading", { name: story.headline })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reported drivers" })
    ).toHaveCount(0);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    `Passed mobile/desktop: news-only Brief, save/read state, unavailable quotes/history, empty-watchlist persistence, saved article retention, no overflow or runtime errors. Screenshots: ${output}`
  );
} finally {
  await browser.close();
}
