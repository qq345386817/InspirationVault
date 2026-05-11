import fs from "node:fs";
import { chromium } from "playwright";
import { importPayloadIntoVault } from "./lib/importer.mjs";
import { openVaultDatabase } from "./lib/vault.mjs";
import { selectPendingEnrichmentRows, writeEnrichmentBatchPayload } from "./lib/enrichment.mjs";
import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";
import { extractUxWeeklyIssue } from "./lib/uxweekly-page.mjs";
import { chromeConfig } from "./lib/chrome-session.mjs";

const args = process.argv.slice(2);
const requestedBrowser = String(process.env.UX_WEEKLY_BROWSER || "chrome").trim().toLowerCase();

const usage = () => {
  console.error(
    "Usage: npm run collect:uxweekly -- https://www.ftium4.com/ux-weekly-246.html [https://www.ftium4.com/ux-weekly-247.html ...]"
  );
};

const normalizeTargetUrl = (value) => {
  if (!value) {
    throw new Error("A full UX Weekly issue URL is required.");
  }

  if (!/^https:\/\/www\.ftium4\.com\/ux-weekly-\d+\.html$/i.test(value)) {
    throw new Error(
      `Expected a full UX Weekly URL like https://www.ftium4.com/ux-weekly-246.html, got: ${value}`
    );
  }

  return value;
};

const isUsageError = (error) => {
  const message = String(error?.message || error || "");
  return (
    message.includes("A full UX Weekly issue URL is required.") ||
    message.includes("Expected a full UX Weekly URL like") ||
    message.includes("At least one full UX Weekly issue URL is required.")
  );
};

const unique = (values) => Array.from(new Set(values));

const extractIssueIdFromUrl = (url) => {
  const match = String(url || "").match(/ux-weekly-(\d+)\.html/i);
  return match ? match[1] : "";
};

const buildCollectorPayload = (page, extraction) => ({
  schemaVersion: "1.0",
  collector: "playwright",
  sourceName: "uxweekly",
  sourceType: "issue",
  exportedAt: new Date().toISOString(),
  publishedAt: extraction.publishedAt || "",
  pageTitle: extraction.title,
  issueId: extractIssueIdFromUrl(page.url()),
  issueTitle: extraction.issueTitle || "",
  url: page.url(),
  comment: extraction.comment || "",
  sponsoredCount: 0,
  itemCount: extraction.itemCount ?? 0,
  items: (extraction.items || []).map((item) => ({
    title: item.title,
    href: item.href,
    description: item.description || "",
    sourceImageUrl: item.sourceImageUrl || "",
    imageSourceType: item.sourceImageUrl ? "issue-image" : "",
    itemType: "link",
    sectionName: item.sectionName || "",
    sectionSlug: item.sectionSlug || "",
    positionInIssue: item.positionInIssue ?? null,
    positionInSection: item.positionInSection ?? null,
    sponsored: false,
    text: item.text || ""
  }))
});

const launchUxWeeklyBrowser = async () => {
  if (requestedBrowser === "playwright") {
    return chromium.launch({ headless: true });
  }

  if (requestedBrowser !== "chrome") {
    throw new Error(
      `Unsupported UX_WEEKLY_BROWSER value: ${requestedBrowser}. Expected "chrome" or "playwright".`
    );
  }

  if (fs.existsSync(chromeConfig.executable)) {
    return chromium.launch({
      executablePath: chromeConfig.executable,
      headless: true,
      args: ["--no-first-run", "--lang=zh-CN"],
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai"
    });
  }

  throw new Error(
    `Chrome executable not found at ${chromeConfig.executable}. Install Chrome or run with UX_WEEKLY_BROWSER=playwright.`
  );
};

const main = async () => {
  const targetUrls = unique(args.map(normalizeTargetUrl));
  if (!targetUrls.length) {
    throw new Error("At least one full UX Weekly issue URL is required.");
  }

  const browser = await launchUxWeeklyBrowser();

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
    const importResults = [];

    for (const [index, targetUrl] of targetUrls.entries()) {
      console.log(`Collecting ${targetUrl} (${index + 1}/${targetUrls.length})`);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const extraction = await extractUxWeeklyIssue(page);
      if (!extraction.itemCount) {
        throw new Error(`The page loaded but no UX Weekly items were extracted from ${page.url()}.`);
      }

      if (Array.isArray(extraction.excludedSectionNames) && extraction.excludedSectionNames.length) {
        console.log(
          `Issue ${extractIssueIdFromUrl(page.url())}: excluded sections ${extraction.excludedSectionNames.join(", ")}.`
        );
      }

      const payload = buildCollectorPayload(page, extraction);
      const importResult = await importPayloadIntoVault({
        payload,
        originName: `uxweekly-${payload.issueId || "issue"}.json`
      });
      importResults.push(importResult);
    }

    const db = openVaultDatabase();
    try {
      const rows = selectPendingEnrichmentRows(db, null, "uxweekly");
      const batchResult = await writeEnrichmentBatchPayload(rows);
      const galleryResult = await renderGallerySite(loadGalleryData(db));

      for (const importResult of importResults) {
        console.log(
          `Issue ${importResult.normalizedExport.issueId}: collected ${importResult.normalizedExport.itemCount}; imported ${importResult.records.length}.`
        );
        if (importResult.reusedExistingItems.length) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: reused existing ${importResult.reusedExistingItems.length}.`
          );
        }
        if (importResult.skippedDuplicates.length) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: skipped duplicates ${importResult.skippedDuplicates.length}.`
          );
        }
        console.log(`Raw archive: vault/${importResult.rawRelativePath}`);
      }

      console.log(`Pending items in batch: ${batchResult.payload.items.length}`);
      console.log(`Enrichment batch: vault/${batchResult.relativePath}`);
      console.log(`Gallery: ${galleryResult.indexPath}`);
    } finally {
      db.close();
    }
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  if (isUsageError(error)) {
    usage();
  }
  console.error(error);
  process.exit(1);
});
