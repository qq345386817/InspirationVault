import fs from "node:fs";
import { chromium } from "playwright";
import { importPayloadIntoVault } from "./lib/importer.mjs";
import { openVaultDatabase } from "./lib/vault.mjs";
import { selectPendingEnrichmentRows, writeEnrichmentBatchPayload } from "./lib/enrichment.mjs";
import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";
import { extractIosDevWeeklyIssue } from "./lib/iosdevweekly-page.mjs";
import { chromeConfig } from "./lib/chrome-session.mjs";

const args = process.argv.slice(2);
const requestedBrowser = String(process.env.WEEKLY_BROWSER || "chrome").trim().toLowerCase();
const includeAndFinally = /^(1|true|yes)$/i.test(
  String(process.env.WEEKLY_INCLUDE_AND_FINALLY || "").trim()
);
const includeSponsoredLinks = /^(1|true|yes)$/i.test(
  String(process.env.WEEKLY_INCLUDE_SPONSORED || "").trim()
);
const includeBooks = /^(1|true|yes)$/i.test(
  String(process.env.WEEKLY_INCLUDE_BOOKS || "").trim()
);
const includeVideos = /^(1|true|yes)$/i.test(
  String(process.env.WEEKLY_INCLUDE_VIDEOS || "").trim()
);
const includeJobs = /^(1|true|yes)$/i.test(
  String(process.env.WEEKLY_INCLUDE_JOBS || "").trim()
);
const defaultExcludedSectionSlugs = [
  ...(includeAndFinally ? [] : ["and-finally"]),
  ...(includeSponsoredLinks ? [] : ["sponsored-link"]),
  ...(includeBooks ? [] : ["books"]),
  ...(includeVideos ? [] : ["videos"]),
  ...(includeJobs ? [] : ["jobs"])
];

const usage = () => {
  console.error(
    "Usage: npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/<issue-id>/ [https://iosdevweekly.com/issues/<issue-id>/ ...]"
  );
};

const normalizeTargetUrl = (value) => {
  if (!value) {
    throw new Error("A full iOS Dev Weekly issue URL is required.");
  }

  if (!/^https:\/\/iosdevweekly\.com\/issues\/\d+\/?$/i.test(value)) {
    throw new Error(
      `Expected a full iOS Dev Weekly issue URL like https://iosdevweekly.com/issues/747/, got: ${value}`
    );
  }

  return value.replace(/\/?$/, "/");
};

const isUsageError = (error) => {
  const message = String(error?.message || error || "");
  return (
    message.includes("A full iOS Dev Weekly issue URL is required.") ||
    message.includes("Expected a full iOS Dev Weekly issue URL like") ||
    message.includes("At least one full iOS Dev Weekly issue URL is required.")
  );
};

const unique = (values) => Array.from(new Set(values));

const extractIssueIdFromUrl = (url) => {
  const match = String(url || "").match(/\/issues\/(\d+)/);
  return match ? match[1] : "";
};

const buildCollectorPayload = (page, extraction) => ({
  schemaVersion: "1.0",
  collector: "playwright",
  sourceName: "iosdevweekly",
  sourceType: "issue",
  includeSponsored: includeSponsoredLinks,
  includeAndFinally,
  includeBooks,
  includeVideos,
  includeJobs,
  excludedSectionSlugs: defaultExcludedSectionSlugs,
  excludedAndFinallyCount: extraction.excludedAndFinallyCount ?? 0,
  excludedSponsoredLinkCount: extraction.excludedSponsoredLinkCount ?? 0,
  excludedBooksCount: extraction.excludedBooksCount ?? 0,
  excludedVideosCount: extraction.excludedVideosCount ?? 0,
  excludedJobsCount: extraction.excludedJobsCount ?? 0,
  exportedAt: new Date().toISOString(),
  publishedAt: extraction.publishedAt || "",
  pageTitle: extraction.title,
  issueId: extractIssueIdFromUrl(page.url()),
  issueTitle: extraction.issueTitle || "",
  url: page.url(),
  comment: extraction.comment || "",
  sponsoredCount: extraction.sponsoredMarkerCount ?? 0,
  itemCount: extraction.itemCount ?? 0,
  items: (extraction.items || []).map((item) => ({
    title: item.title,
    href: item.href,
    description: item.description || "",
    itemType: "link",
    sectionName: item.sectionName || "",
    sectionSlug: item.sectionSlug || "",
    positionInIssue: item.positionInIssue ?? null,
    positionInSection: item.positionInSection ?? null,
    sponsored: Boolean(item.sponsored),
    text: item.text || ""
  }))
});

const filterIssueExtraction = (extraction) => {
  if (!defaultExcludedSectionSlugs.length) {
    return {
      ...extraction,
      excludedAndFinallyCount: 0,
      excludedSponsoredLinkCount: 0,
      excludedBooksCount: 0,
      excludedVideosCount: 0,
      excludedJobsCount: 0
    };
  }

  const items = (extraction.items || []).filter(
    (item) => !defaultExcludedSectionSlugs.includes(item.sectionSlug)
  );
  const excludedAndFinallyCount = (extraction.items || []).filter(
    (item) => item.sectionSlug === "and-finally"
  ).length;
  const excludedSponsoredLinkCount = (extraction.items || []).filter(
    (item) => item.sectionSlug === "sponsored-link"
  ).length;
  const excludedBooksCount = (extraction.items || []).filter(
    (item) => item.sectionSlug === "books"
  ).length;
  const excludedVideosCount = (extraction.items || []).filter(
    (item) => item.sectionSlug === "videos"
  ).length;
  const excludedJobsCount = (extraction.items || []).filter(
    (item) => item.sectionSlug === "jobs"
  ).length;

  return {
    ...extraction,
    items,
    itemCount: items.length,
    sponsoredMarkerCount: items.filter((item) => item.sponsored).length,
    excludedAndFinallyCount: includeAndFinally ? 0 : excludedAndFinallyCount,
    excludedSponsoredLinkCount: includeSponsoredLinks ? 0 : excludedSponsoredLinkCount,
    excludedBooksCount: includeBooks ? 0 : excludedBooksCount,
    excludedVideosCount: includeVideos ? 0 : excludedVideosCount,
    excludedJobsCount: includeJobs ? 0 : excludedJobsCount
  };
};

const launchWeeklyBrowser = async () => {
  if (requestedBrowser === "playwright") {
    return chromium.launch({ headless: true });
  }

  if (requestedBrowser !== "chrome") {
    throw new Error(
      `Unsupported WEEKLY_BROWSER value: ${requestedBrowser}. Expected "chrome" or "playwright".`
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
    `Chrome executable not found at ${chromeConfig.executable}. Install Chrome or run with WEEKLY_BROWSER=playwright.`
  );
};

const main = async () => {
  const targetUrls = unique(args.map(normalizeTargetUrl));
  if (!targetUrls.length) {
    throw new Error("At least one full iOS Dev Weekly issue URL is required.");
  }

  const browser = await launchWeeklyBrowser();

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    const importResults = [];

    for (const [index, targetUrl] of targetUrls.entries()) {
      console.log(`Collecting ${targetUrl} (${index + 1}/${targetUrls.length})`);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const extraction = filterIssueExtraction(await extractIosDevWeeklyIssue(page));
      if (!extraction.itemCount) {
        throw new Error(`The page loaded but no weekly items were extracted from ${page.url()}.`);
      }

      const payload = buildCollectorPayload(page, extraction);
      const importResult = await importPayloadIntoVault({
        payload,
        originName: `iosdevweekly-${payload.issueId || "issue"}.json`
      });
      importResults.push({
        importResult,
        excludedAndFinallyCount: extraction.excludedAndFinallyCount || 0,
        excludedSponsoredLinkCount: extraction.excludedSponsoredLinkCount || 0,
        excludedBooksCount: extraction.excludedBooksCount || 0,
        excludedVideosCount: extraction.excludedVideosCount || 0,
        excludedJobsCount: extraction.excludedJobsCount || 0
      });
    }

    const db = openVaultDatabase();
    try {
      const rows = selectPendingEnrichmentRows(db, null, "iosdevweekly");
      const batchResult = await writeEnrichmentBatchPayload(rows);
      const galleryResult = await renderGallerySite(loadGalleryData(db));

      for (
        const {
          importResult,
          excludedAndFinallyCount,
          excludedSponsoredLinkCount,
          excludedBooksCount,
          excludedVideosCount,
          excludedJobsCount
        } of importResults
      ) {
        console.log(
          `Issue ${importResult.normalizedExport.issueId}: collected ${importResult.normalizedExport.itemCount}; imported ${importResult.records.length}.`
        );
        if (excludedAndFinallyCount) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: excluded And finally... ${excludedAndFinallyCount}.`
          );
        }
        if (excludedSponsoredLinkCount) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: excluded Sponsored Link ${excludedSponsoredLinkCount}.`
          );
        }
        if (excludedBooksCount) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: excluded Books ${excludedBooksCount}.`
          );
        }
        if (excludedVideosCount) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: excluded Videos ${excludedVideosCount}.`
          );
        }
        if (excludedJobsCount) {
          console.log(
            `Issue ${importResult.normalizedExport.issueId}: excluded Jobs ${excludedJobsCount}.`
          );
        }
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
