import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const stories = Array.from({ length: 14 }, (_, index) => ({
    id: `brief-test-${index}`, rank: index + 1, headline: `Market update ${index + 1}`, summary: "Test publisher excerpt.",
    geography: "India", category: "markets", readMinutes: 1, source: "Test publisher", sourceUrl: "https://example.org/article",
    publishedAt: "2026-10-11T09:00:00Z", claimBasis: "reported", sourceAccess: "metadata_only", summaryVersion: "test",
    whatHappened: ["Test excerpt."], reportedDrivers: [], potentialImplications: [], relatedInstruments: []
  }));
  const heldRequests = [];
  let holdOtherFeeds = true;
  let newsRequests = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.endsWith("news") && holdOtherFeeds) await new Promise((resolve) => heldRequests.push(resolve));
    const payload = { status: "live", notes: [], fetchedAt: "2026-10-11T09:00:00Z" };
    if (path.endsWith("news")) { payload.stories = stories; newsRequests++; }
    else if (path.endsWith("calendar")) payload.events = [];
    else payload.instruments = [];
    await route.fulfill({ json: payload });
  });
  await page.goto(process.env.QA_BASE_URL ?? "http://localhost:3000");
  // Other responses remain blocked: news must render without waiting for them.
  await expect(page.locator("article")).toHaveCount(6);
  await expect(page.getByText("0 of 6 stories read.")).toBeVisible();
  assert.equal(newsRequests, 1);
  holdOtherFeeds = false;
  heldRequests.forEach((release) => release());
  await page.getByRole("button", { name: "Mark complete", exact: true }).first().click();
  await expect(page.getByText("1 of 6 stories read.")).toBeVisible();
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(12);
  await expect(page.getByText("1 of 12 stories read.")).toBeVisible();
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(14);
  await expect(page.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
  assert.equal(newsRequests, 1);
  await page.getByRole("button", { name: "Markets", exact: true }).click();
  await page.getByRole("button", { name: "Brief", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(14);
  await page.getByRole("button", { name: "Refresh data", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(6);
  await expect.poll(() => newsRequests).toBe(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  console.log("Passed: six initial stories, news visible while other feeds are blocked, six-at-a-time expansion, no extra news requests, read-progress counts, terminal batch, tab persistence and refresh reset.");
  await context.close();
} finally {
  await browser.close();
}
