import fs from "node:fs";
import { chromium } from "playwright";
import { importPayloadIntoVault } from "./lib/importer.mjs";
import { openVaultDatabase } from "./lib/vault.mjs";
import { selectPendingEnrichmentRows, writeEnrichmentBatchPayload } from "./lib/enrichment.mjs";
import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";
import { extractGitHubRepository } from "./lib/github-repo-page.mjs";
import { chromeConfig } from "./lib/chrome-session.mjs";

const args = process.argv.slice(2);
const requestedBrowser = String(process.env.GITHUB_BROWSER || "chrome").trim().toLowerCase();

const usage = () => {
  console.error(
    "Usage: npm run collect:github -- https://github.com/<owner>/<repo> [https://github.com/<owner>/<repo> ...]"
  );
};

const unique = (values) => Array.from(new Set(values));

const parseGitHubRepoUrl = (value) => {
  if (!value) {
    throw new Error("A full GitHub repository URL is required.");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Expected a full GitHub repository URL, got: ${value}`);
  }

  if (parsed.hostname.toLowerCase() !== "github.com") {
    throw new Error(`Expected a GitHub repository URL on github.com, got: ${value}`);
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new Error(
      `Expected a GitHub repository URL like https://github.com/owner/repo, got: ${value}`
    );
  }

  const [owner, repoName] = segments;
  const repo = repoName.replace(/\.git$/i, "");

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`
  };
};

const issueIdFromRepo = (owner, repo) =>
  `${String(owner || "").trim().toLowerCase()}--${String(repo || "").trim().toLowerCase()}`;

const isUsageError = (error) => {
  const message = String(error?.message || error || "");
  return (
    message.includes("A full GitHub repository URL is required.") ||
    message.includes("Expected a full GitHub repository URL") ||
    message.includes("Expected a GitHub repository URL") ||
    message.includes("At least one full GitHub repository URL is required.")
  );
};

const buildCollectorPayload = (target, extraction, pageUrl) => {
  const repoOwner = extraction.repoOwner || target.owner;
  const repoName = extraction.repoName || target.repo;
  const repoFullName = extraction.repoFullName || `${repoOwner}/${repoName}`;
  const issueId = issueIdFromRepo(repoOwner, repoName);
  const description = extraction.description || extraction.readmeExcerpt || "";
  const sectionName = extraction.programmingLanguage || "";

  return {
    schemaVersion: "1.0",
    collector: "playwright",
    sourceName: "github",
    sourceType: "repo",
    exportedAt: new Date().toISOString(),
    publishedAt: "",
    pageTitle: repoFullName,
    issueId,
    issueTitle: repoFullName,
    url: pageUrl,
    comment: "Collected from GitHub repository page.",
    sponsoredCount: 0,
    itemCount: 1,
    items: [
      {
        title: repoFullName,
        href: pageUrl,
        description,
        sourceImageUrl: extraction.sourceImageUrl || "",
        imageSourceType: extraction.imageSourceType || "",
        itemType: "repository",
        sectionName,
        sectionSlug: sectionName ? "primary-language" : "",
        positionInIssue: 1,
        positionInSection: 1,
        sponsored: false,
        text: extraction.rawFacts || description
      }
    ]
  };
};

const launchGitHubBrowser = async () => {
  if (requestedBrowser === "playwright") {
    return chromium.launch({ headless: true });
  }

  if (requestedBrowser !== "chrome") {
    throw new Error(
      `Unsupported GITHUB_BROWSER value: ${requestedBrowser}. Expected "chrome" or "playwright".`
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
    `Chrome executable not found at ${chromeConfig.executable}. Install Chrome or run with GITHUB_BROWSER=playwright.`
  );
};

const main = async () => {
  const targets = unique(args.map((value) => parseGitHubRepoUrl(value).url)).map((url) =>
    parseGitHubRepoUrl(url)
  );
  if (!targets.length) {
    throw new Error("At least one full GitHub repository URL is required.");
  }

  const browser = await launchGitHubBrowser();

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    const importResults = [];

    for (const [index, target] of targets.entries()) {
      console.log(`Collecting ${target.url} (${index + 1}/${targets.length})`);
      await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const extraction = await extractGitHubRepository(page);
      if (!extraction.repoFullName) {
        throw new Error(
          `The page loaded but no GitHub repository metadata was extracted from ${page.url()}.`
        );
      }

      const payload = buildCollectorPayload(target, extraction, page.url());
      const importResult = await importPayloadIntoVault({
        payload,
        originName: `github-${payload.issueId || "repo"}.json`
      });
      importResults.push(importResult);
    }

    const db = openVaultDatabase();
    try {
      const rows = selectPendingEnrichmentRows(db, null, "github");
      const batchResult = await writeEnrichmentBatchPayload(rows);
      const galleryResult = await renderGallerySite(loadGalleryData(db));

      for (const importResult of importResults) {
        console.log(
          `Repo ${importResult.normalizedExport.issueTitle}: collected ${importResult.normalizedExport.itemCount}; imported ${importResult.records.length}.`
        );
        if (importResult.reusedExistingItems.length) {
          console.log(
            `Repo ${importResult.normalizedExport.issueTitle}: reused existing ${importResult.reusedExistingItems.length}.`
          );
        }
        if (importResult.skippedDuplicates.length) {
          console.log(
            `Repo ${importResult.normalizedExport.issueTitle}: skipped duplicates ${importResult.skippedDuplicates.length}.`
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
