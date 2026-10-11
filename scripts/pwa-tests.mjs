import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }
  });
  const page = await context.newPage();
  await page.goto(process.env.QA_BASE_URL ?? "http://localhost:3000");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true
        })
      );
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh data" })).toBeEnabled({
    timeout: 30000
  });
  const icons = await page.evaluate(async () => {
    const manifest = await fetch("/manifest.webmanifest").then((response) =>
      response.json()
    );
    const image = new Image();
    image.src = "/icon-180.png";
    await image.decode();
    return {
      width: image.naturalWidth,
      sizes: manifest.icons.map((icon) => icon.sizes)
    };
  });
  assert.equal(icons.width, 180);
  assert.ok(icons.sizes.includes("192x192") && icons.sizes.includes("512x512"));
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Brief", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No articles available" })
  ).toBeVisible();
  const offline = await page.evaluate(async () => {
    const response = await fetch("/api/news");
    return { status: response.status, body: await response.json() };
  });
  assert.deepEqual(offline, { status: 503, body: { error: "Offline" } });
  console.log(
    "Passed: install icon dimensions, manifest sizes, controlled offline shell reload, API 503 JSON and no sample-news fallback."
  );
  await context.close();
} finally {
  await browser.close();
}
