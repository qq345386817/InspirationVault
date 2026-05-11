import { importPayloadIntoVault } from "./lib/importer.mjs";
import { openVaultDatabase } from "./lib/vault.mjs";
import { selectPendingEnrichmentRows, writeEnrichmentBatchPayload } from "./lib/enrichment.mjs";
import { chromeConfig, launchCollectorContext } from "./lib/chrome-session.mjs";
import { detectAccessState, extractSparkItems } from "./lib/codepen-spark-page.mjs";
import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";

const args = process.argv.slice(2);
const verificationTimeoutMs = Number(process.env.VERIFICATION_TIMEOUT_MS || 0);
const verificationPollMs = Number(process.env.VERIFICATION_POLL_MS || 1000);
const betweenTargetsDelayMs = Number(process.env.COLLECT_BETWEEN_TARGETS_MS || 1500);
const navigationRetryCount = Number(process.env.COLLECT_NAVIGATION_RETRIES || 3);
const navigationRetryDelayMs = Number(process.env.COLLECT_NAVIGATION_RETRY_DELAY_MS || 1500);

const usage = () => {
  console.error(
    "Usage: npm run collect:spark -- https://codepen.io/spark/<issue-id> [https://codepen.io/spark/<issue-id> ...]"
  );
};

const normalizeTargetUrl = (value) => {
  if (!value) {
    throw new Error("A full Spark issue URL is required.");
  }
  if (!/^https:\/\/codepen\.io\/spark\/\d+$/i.test(value)) {
    throw new Error(`Expected a full Spark URL like https://codepen.io/spark/505, got: ${value}`);
  }
  return value;
};

const isSparkUrl = (url) => /^https:\/\/codepen\.io\/spark\/\d+/.test(url || "");

const extractIssueIdFromUrl = (url) => {
  const match = String(url || "").match(/\/spark\/(\d+)/);
  return match ? match[1] : "";
};

const isUsageError = (error) => {
  const message = String(error?.message || error || "");
  return (
    message.includes("A full Spark issue URL is required.") ||
    message.includes("Expected a full Spark URL like") ||
    message.includes("At least one full Spark issue URL is required.")
  );
};

const isRetriableNavigationError = (error) => {
  const message = String(error?.message || error || "");
  return /ERR_CONNECTION_CLOSED|ERR_NETWORK_CHANGED|ERR_CONNECTION_RESET|ERR_TIMED_OUT|ERR_ABORTED/i.test(
    message
  );
};

const navigateToTarget = async (page, targetUrl) => {
  let lastError = null;

  for (let attempt = 1; attempt <= Math.max(1, navigationRetryCount); attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      return;
    } catch (error) {
      lastError = error;
      if (!isRetriableNavigationError(error) || attempt >= navigationRetryCount) {
        throw error;
      }
      console.error(
        `Navigation failed for ${targetUrl} (attempt ${attempt}/${navigationRetryCount}). Retrying...`
      );
      await page.waitForTimeout(navigationRetryDelayMs);
    }
  }

  throw lastError;
};

const waitForVerification = async (page) => {
  const startedAt = Date.now();
  let state = await detectAccessState(page);
  let announced = false;

  while (state.blocked) {
    if (!announced) {
      console.error(
        `Verification required for ${page.url()}. Solve it in the opened browser window; collector will keep waiting.`
      );
      announced = true;
    }

    if (verificationTimeoutMs > 0 && Date.now() - startedAt >= verificationTimeoutMs) {
      break;
    }

    await page.waitForTimeout(verificationPollMs);
    state = await detectAccessState(page);
  }

  return state;
};

const waitForSparkContent = async (page, timeoutMs = 60000, pollMs = 1000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const state = await detectAccessState(page);
    if (!state.blocked) {
      const hasSparkItems = await page
        .locator("[class*='SparkPage_sparkItems']")
        .first()
        .isVisible()
        .catch(() => false);

      if (hasSparkItems) {
        return true;
      }
    }

    await page.waitForTimeout(pollMs);
  }

  return false;
};

const ensureCurrentTargetReady = async (page, targetUrl) => {
  const targetIssueId = extractIssueIdFromUrl(targetUrl);

  if (page.url() !== targetUrl) {
    await navigateToTarget(page, targetUrl);
  }

  await page.bringToFront().catch(() => {});
  await page.waitForLoadState("domcontentloaded");

  const accessState = await waitForVerification(page);
  if (accessState.blocked) {
    throw new Error(
      `CodePen still requires verification in the connected Chrome session for ${page.url()}.`
    );
  }

  let sparkReady = await waitForSparkContent(page);
  const currentIssueId = extractIssueIdFromUrl(page.url());

  if (!sparkReady || currentIssueId !== targetIssueId) {
    console.error(
      `Current page did not settle on Spark ${targetIssueId}. Reopening ${targetUrl} before continuing.`
    );
    await navigateToTarget(page, targetUrl);
    await page.waitForLoadState("domcontentloaded");

    const retryState = await waitForVerification(page);
    if (retryState.blocked) {
      throw new Error(
        `CodePen still requires verification in the connected Chrome session for ${page.url()}.`
      );
    }

    sparkReady = await waitForSparkContent(page);
  }

  if (!sparkReady) {
    throw new Error(
      `Verification may have completed, but Spark content did not become available for ${targetUrl}.`
    );
  }
};

const findTargetPage = (context, targetUrl) => {
  const pages = context.pages();
  const sparkPages = pages.filter((page) => isSparkUrl(page.url()));

  if (targetUrl) {
    const exact = sparkPages.find((page) => page.url() === targetUrl);
    if (exact) return exact;

    const targetIssueId = extractIssueIdFromUrl(targetUrl);
    const sameIssue = sparkPages.find(
      (page) => extractIssueIdFromUrl(page.url()) === targetIssueId
    );
    if (sameIssue) return sameIssue;
  }

  return sparkPages.at(-1) || (targetUrl ? pages.at(-1) || null : null);
};

const buildCollectorPayload = (page, extraction) => ({
  schemaVersion: "1.0",
  collector: "playwright-persistent",
  sourceName: "codepen",
  sourceType: "spark_issue",
  exportedAt: new Date().toISOString(),
  pageTitle: extraction.title,
  issueId: extractIssueIdFromUrl(page.url()),
  issueTitle: extraction.issueTitle || "",
  url: page.url(),
  sponsoredCount: extraction.sponsoredMarkerCount ?? 0,
  sponsoredItems: extraction.sponsoredPreview ?? [],
  itemCount: extraction.itemCount ?? 0,
  items: (extraction.items || []).map((item) => ({
    title: item.title,
    href: item.href,
    description: item.description || "",
    sourceImageUrl: item.imageUrl || "",
    imageSourceType: item.imageSourceType || "",
    itemType: item.itemType || null,
    text: item.text || ""
  }))
});

const unique = (values) => Array.from(new Set(values));

const main = async () => {
  const targetUrls = unique(args.map(normalizeTargetUrl));
  if (!targetUrls.length) {
    throw new Error("At least one full Spark issue URL is required.");
  }
  let context;

  try {
    context = await launchCollectorContext();
  } catch (error) {
    console.error(`Could not launch the collector browser with profile ${chromeConfig.userDataDir}.`);
    console.error(
      "Make sure no other Chrome instance is already using that collector profile, then retry."
    );
    throw error;
  }

  try {
    await context.addInitScript(() => {
      const patch = (object, key, getter) => {
        try {
          Object.defineProperty(object, key, {
            configurable: true,
            get: getter
          });
        } catch {}
      };

      patch(Navigator.prototype, "webdriver", () => undefined);
      patch(Navigator.prototype, "languages", () => ["zh-CN", "zh", "en-US", "en"]);
      patch(Navigator.prototype, "plugins", () => [1, 2, 3, 4, 5]);

      if (!window.chrome) {
        window.chrome = { runtime: {} };
      } else if (!window.chrome.runtime) {
        window.chrome.runtime = {};
      }
    });

    let page = findTargetPage(context, targetUrls[0]);
    if (!page) {
      page = await context.newPage();
    }
    const importResults = [];

    for (const [index, targetUrl] of targetUrls.entries()) {
      console.log(`Collecting ${targetUrl} (${index + 1}/${targetUrls.length})`);
      await ensureCurrentTargetReady(page, targetUrl);

      const extraction = await extractSparkItems(page, {
        sponsorPatterns: ["sponsored", "promoted"],
        cardSelectors: [],
        minCardTextLength: 20,
        maxCardTextLength: 2500
      });

      if (!extraction.itemCount) {
        throw new Error(
          `The page loaded but no Spark items were extracted from ${page.url()}.`
        );
      }

      const payload = buildCollectorPayload(page, extraction);
      const importResult = await importPayloadIntoVault({
        payload,
        originName: `collector-${payload.issueId || "spark"}.json`
      });
      importResults.push(importResult);

      if (index < targetUrls.length - 1 && betweenTargetsDelayMs > 0) {
        await page.waitForTimeout(betweenTargetsDelayMs);
      }
    }

    const db = openVaultDatabase();
    try {
      const rows = selectPendingEnrichmentRows(db, null, "codepen");
      const batchResult = await writeEnrichmentBatchPayload(rows);
      const galleryResult = await renderGallerySite(loadGalleryData(db));

      console.log(`Collector profile: ${chromeConfig.userDataDir}`);
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
          console.log(`Issue ${importResult.normalizedExport.issueId}: skipped duplicates ${importResult.skippedDuplicates.length}`);
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
    await context?.close();
  }
};

main().catch((error) => {
  if (isUsageError(error)) {
    usage();
  }
  console.error(error);
  process.exit(1);
});
