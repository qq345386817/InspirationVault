import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  challengeCollectionCategory,
  enrichmentBatchRelativePath,
  markdownRelativePathForItem,
  rawRelativePathForImport
} from "./normalize.mjs";

export const vaultRoot = path.resolve(process.cwd(), "vault");

const absoluteFromVault = (relativePath) => path.join(vaultRoot, relativePath);

export const ensureVaultLayout = async () => {
  const requiredDirs = [
    "raw",
    "items",
    "assets",
    "db",
    "enrichment/batches",
    "inbox",
    "inbox/processed"
  ];

  await Promise.all(
    requiredDirs.map((dir) => fsp.mkdir(absoluteFromVault(dir), { recursive: true }))
  );
};

export const openVaultDatabase = () => {
  const dbPath = absoluteFromVault(path.join("db", "inspiration.sqlite"));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);

  const ensureColumns = (tableName, columns) => {
    const existingColumns = new Set(
      db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name)
    );

    for (const [columnName, definition] of columns) {
      if (!existingColumns.has(columnName)) {
        try {
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
        } catch (error) {
          if (!String(error?.message || error).includes("duplicate column name")) {
            throw error;
          }
        }
      }
    }
  };

  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS issues (
      issue_key TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      issue_title TEXT NOT NULL,
      issue_url TEXT NOT NULL,
      page_title TEXT NOT NULL,
      collector TEXT NOT NULL,
      collected_at TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      raw_path TEXT NOT NULL,
      sponsored_count INTEGER NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      issue_key TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      issue_title TEXT NOT NULL,
      issue_url TEXT NOT NULL,
      page_title TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT '',
      item_url TEXT NOT NULL,
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      title_zh TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      description_zh TEXT NOT NULL DEFAULT '',
      item_type TEXT,
      source_image_url TEXT NOT NULL DEFAULT '',
      image_source_type TEXT NOT NULL DEFAULT '',
      source_image_path TEXT NOT NULL DEFAULT '',
      source_section_name TEXT NOT NULL DEFAULT '',
      source_section_slug TEXT NOT NULL DEFAULT '',
      position_in_issue INTEGER,
      position_in_section INTEGER,
      is_sponsored INTEGER NOT NULL DEFAULT 0,
      raw_text TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      primary_category TEXT NOT NULL DEFAULT '',
      secondary_categories_json TEXT NOT NULL DEFAULT '[]',
      interaction_patterns_json TEXT NOT NULL DEFAULT '[]',
      visual_patterns_json TEXT NOT NULL DEFAULT '[]',
      tech_keywords_json TEXT NOT NULL DEFAULT '[]',
      use_cases_json TEXT NOT NULL DEFAULT '[]',
      fit_for_projects_json TEXT NOT NULL DEFAULT '[]',
      fit_for_scenes_json TEXT NOT NULL DEFAULT '[]',
      complexity_level TEXT NOT NULL DEFAULT '',
      implementation_cost TEXT NOT NULL DEFAULT '',
      platform_fit_json TEXT NOT NULL DEFAULT '[]',
      novelty_score INTEGER,
      reuse_confidence TEXT NOT NULL DEFAULT '',
      personal_rating INTEGER,
      favorite INTEGER NOT NULL DEFAULT 0,
      used_in_projects_json TEXT NOT NULL DEFAULT '[]',
      rejected_reason TEXT NOT NULL DEFAULT '',
      revisit_later INTEGER NOT NULL DEFAULT 0,
      taste_profile_json TEXT NOT NULL DEFAULT '[]',
      quality_score INTEGER,
      summary TEXT NOT NULL DEFAULT '',
      summary_zh TEXT NOT NULL DEFAULT '',
      why_it_matters TEXT NOT NULL DEFAULT '',
      why_it_matters_zh TEXT NOT NULL DEFAULT '',
      reusable_idea TEXT NOT NULL DEFAULT '',
      reusable_idea_zh TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      screenshot_path TEXT NOT NULL DEFAULT '',
      preview_image_path TEXT NOT NULL DEFAULT '',
      thumbnail_path TEXT NOT NULL DEFAULT '',
      hero_image_path TEXT NOT NULL DEFAULT '',
      curation_status TEXT NOT NULL DEFAULT 'raw',
      markdown_path TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      collected_at TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      needs_enrichment INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(issue_key) REFERENCES issues(issue_key)
    );

    CREATE TABLE IF NOT EXISTS item_appearances (
      appearance_key TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      issue_key TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      issue_title TEXT NOT NULL,
      issue_url TEXT NOT NULL,
      page_title TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT '',
      item_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      section_name TEXT NOT NULL DEFAULT '',
      section_slug TEXT NOT NULL DEFAULT '',
      position_in_issue INTEGER,
      position_in_section INTEGER,
      is_sponsored INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(item_id) REFERENCES items(id),
      FOREIGN KEY(issue_key) REFERENCES issues(issue_key)
    );

    CREATE INDEX IF NOT EXISTS idx_items_issue_key ON items(issue_key);
    CREATE INDEX IF NOT EXISTS idx_items_needs_enrichment ON items(needs_enrichment);
    CREATE INDEX IF NOT EXISTS idx_items_title ON items(title);
    CREATE INDEX IF NOT EXISTS idx_items_item_url ON items(item_url);
    CREATE INDEX IF NOT EXISTS idx_appearances_item_id ON item_appearances(item_id);
    CREATE INDEX IF NOT EXISTS idx_appearances_issue_key ON item_appearances(issue_key);
    CREATE INDEX IF NOT EXISTS idx_appearances_item_url ON item_appearances(item_url);
  `);

  ensureColumns("items", [
    ["published_at", "TEXT NOT NULL DEFAULT ''"],
    ["source_image_url", "TEXT NOT NULL DEFAULT ''"],
    ["image_source_type", "TEXT NOT NULL DEFAULT ''"],
    ["source_image_path", "TEXT NOT NULL DEFAULT ''"],
    ["source_section_name", "TEXT NOT NULL DEFAULT ''"],
    ["source_section_slug", "TEXT NOT NULL DEFAULT ''"],
    ["position_in_issue", "INTEGER"],
    ["position_in_section", "INTEGER"],
    ["is_sponsored", "INTEGER NOT NULL DEFAULT 0"],
    ["title_zh", "TEXT NOT NULL DEFAULT ''"],
    ["description_zh", "TEXT NOT NULL DEFAULT ''"],
    ["primary_category", "TEXT NOT NULL DEFAULT ''"],
    ["secondary_categories_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["fit_for_projects_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["fit_for_scenes_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["complexity_level", "TEXT NOT NULL DEFAULT ''"],
    ["implementation_cost", "TEXT NOT NULL DEFAULT ''"],
    ["platform_fit_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["novelty_score", "INTEGER"],
    ["reuse_confidence", "TEXT NOT NULL DEFAULT ''"],
    ["personal_rating", "INTEGER"],
    ["favorite", "INTEGER NOT NULL DEFAULT 0"],
    ["used_in_projects_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["rejected_reason", "TEXT NOT NULL DEFAULT ''"],
    ["revisit_later", "INTEGER NOT NULL DEFAULT 0"],
    ["taste_profile_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["summary_zh", "TEXT NOT NULL DEFAULT ''"],
    ["why_it_matters_zh", "TEXT NOT NULL DEFAULT ''"],
    ["reusable_idea_zh", "TEXT NOT NULL DEFAULT ''"],
    ["preview_image_path", "TEXT NOT NULL DEFAULT ''"],
    ["thumbnail_path", "TEXT NOT NULL DEFAULT ''"],
    ["hero_image_path", "TEXT NOT NULL DEFAULT ''"],
    ["curation_status", "TEXT NOT NULL DEFAULT 'raw'"]
  ]);

  ensureColumns("item_appearances", [
    ["published_at", "TEXT NOT NULL DEFAULT ''"],
    ["description", "TEXT NOT NULL DEFAULT ''"],
    ["section_name", "TEXT NOT NULL DEFAULT ''"],
    ["section_slug", "TEXT NOT NULL DEFAULT ''"],
    ["position_in_issue", "INTEGER"],
    ["position_in_section", "INTEGER"],
    ["is_sponsored", "INTEGER NOT NULL DEFAULT 0"]
  ]);

  db.prepare(
    `
      UPDATE items
      SET primary_category = ?
      WHERE title GLOB 'CodePen Challenge:*'
         OR title GLOB '#CodePenChallenge:*'
    `
  ).run(challengeCollectionCategory);

  db.exec(`
    INSERT INTO item_appearances (
      appearance_key,
      item_id,
      issue_key,
      source_name,
      source_type,
      issue_id,
      issue_title,
      issue_url,
      page_title,
      published_at,
      item_url,
      title,
      description,
      section_name,
      section_slug,
      position_in_issue,
      position_in_section,
      is_sponsored,
      collected_at,
      imported_at,
      created_at,
      updated_at
    )
    SELECT
      items.issue_key || '::' || items.id,
      items.id,
      items.issue_key,
      items.source_name,
      items.source_type,
      items.issue_id,
      items.issue_title,
      items.issue_url,
      items.page_title,
      items.published_at,
      items.item_url,
      items.title,
      items.description,
      items.source_section_name,
      items.source_section_slug,
      items.position_in_issue,
      items.position_in_section,
      items.is_sponsored,
      items.collected_at,
      items.imported_at,
      items.created_at,
      items.updated_at
    FROM items
    WHERE NOT EXISTS (
      SELECT 1
      FROM item_appearances
      WHERE item_appearances.item_id = items.id
        AND item_appearances.issue_key = items.issue_key
    )
  `);

  return db;
};

export const readExistingItem = (db, id) =>
  db.prepare("SELECT * FROM items WHERE id = ?").get(id);

export const readExistingItemByUrl = (db, itemUrl) =>
  db.prepare("SELECT * FROM items WHERE item_url = ? ORDER BY updated_at DESC LIMIT 1").get(itemUrl);

export const upsertItemAppearance = (db, appearance) => {
  db.prepare(`
    INSERT INTO item_appearances (
      appearance_key,
      item_id,
      issue_key,
      source_name,
      source_type,
      issue_id,
      issue_title,
      issue_url,
      page_title,
      published_at,
      item_url,
      title,
      description,
      section_name,
      section_slug,
      position_in_issue,
      position_in_section,
      is_sponsored,
      collected_at,
      imported_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(appearance_key) DO UPDATE SET
      source_name = excluded.source_name,
      source_type = excluded.source_type,
      issue_id = excluded.issue_id,
      issue_title = excluded.issue_title,
      issue_url = excluded.issue_url,
      page_title = excluded.page_title,
      published_at = excluded.published_at,
      item_url = excluded.item_url,
      title = excluded.title,
      description = excluded.description,
      section_name = excluded.section_name,
      section_slug = excluded.section_slug,
      position_in_issue = excluded.position_in_issue,
      position_in_section = excluded.position_in_section,
      is_sponsored = excluded.is_sponsored,
      collected_at = excluded.collected_at,
      imported_at = excluded.imported_at,
      updated_at = excluded.updated_at
  `).run(
    appearance.appearanceKey,
    appearance.itemId,
    appearance.issueKey,
    appearance.sourceName,
    appearance.sourceType,
    appearance.issueId,
    appearance.issueTitle,
    appearance.issueUrl,
    appearance.pageTitle,
    appearance.publishedAt || "",
    appearance.itemUrl,
    appearance.title,
    appearance.description || "",
    appearance.sectionName || "",
    appearance.sectionSlug || "",
    appearance.positionInIssue,
    appearance.positionInSection,
    appearance.isSponsored ? 1 : 0,
    appearance.collectedAt,
    appearance.importedAt,
    appearance.createdAt,
    appearance.updatedAt
  );
};

export const upsertIssue = (db, normalizedExport, rawRelativePath, importedAt) => {
  db.prepare(`
    INSERT INTO issues (
      issue_key,
      source_name,
      source_type,
      issue_id,
      issue_title,
      issue_url,
      page_title,
      collector,
      collected_at,
      imported_at,
      raw_path,
      sponsored_count,
      item_count,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(issue_key) DO UPDATE SET
      issue_title = excluded.issue_title,
      issue_url = excluded.issue_url,
      page_title = excluded.page_title,
      collector = excluded.collector,
      collected_at = excluded.collected_at,
      imported_at = excluded.imported_at,
      raw_path = excluded.raw_path,
      sponsored_count = excluded.sponsored_count,
      item_count = excluded.item_count,
      metadata_json = excluded.metadata_json
  `).run(
    normalizedExport.issueKey,
    normalizedExport.sourceName,
    normalizedExport.sourceType,
    normalizedExport.issueId,
    normalizedExport.issueTitle,
    normalizedExport.issueUrl,
    normalizedExport.pageTitle,
    normalizedExport.collector,
    normalizedExport.collectedAt,
    importedAt,
    rawRelativePath,
    normalizedExport.sponsoredCount,
    normalizedExport.itemCount,
    JSON.stringify({
      schemaVersion: normalizedExport.schemaVersion
    })
  );
};

export const upsertItem = (db, record) => {
  const columns = [
    "id",
    "issue_key",
    "source_name",
    "source_type",
    "issue_id",
    "issue_title",
    "issue_url",
    "page_title",
    "published_at",
    "item_url",
    "domain",
    "title",
    "title_zh",
    "description",
    "description_zh",
    "item_type",
    "source_image_url",
    "image_source_type",
    "source_image_path",
    "source_section_name",
    "source_section_slug",
    "position_in_issue",
    "position_in_section",
    "is_sponsored",
    "raw_text",
    "tags_json",
    "primary_category",
    "secondary_categories_json",
    "interaction_patterns_json",
    "visual_patterns_json",
    "tech_keywords_json",
    "use_cases_json",
    "fit_for_projects_json",
    "fit_for_scenes_json",
    "complexity_level",
    "implementation_cost",
    "platform_fit_json",
    "novelty_score",
    "reuse_confidence",
    "personal_rating",
    "favorite",
    "used_in_projects_json",
    "rejected_reason",
    "revisit_later",
    "taste_profile_json",
    "quality_score",
    "summary",
    "summary_zh",
    "why_it_matters",
    "why_it_matters_zh",
    "reusable_idea",
    "reusable_idea_zh",
    "notes",
    "screenshot_path",
    "preview_image_path",
    "thumbnail_path",
    "hero_image_path",
    "curation_status",
    "markdown_path",
    "content_hash",
    "collected_at",
    "imported_at",
    "needs_enrichment",
    "created_at",
    "updated_at"
  ];
  const placeholders = columns.map(() => "?").join(", ");

  db.prepare(`
    INSERT INTO items (
      ${columns.join(",\n      ")}
    ) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET
      issue_key = excluded.issue_key,
      source_name = excluded.source_name,
      source_type = excluded.source_type,
      issue_id = excluded.issue_id,
      issue_title = excluded.issue_title,
      issue_url = excluded.issue_url,
      page_title = excluded.page_title,
      published_at = excluded.published_at,
      item_url = excluded.item_url,
      domain = excluded.domain,
      title = excluded.title,
      title_zh = excluded.title_zh,
      description = excluded.description,
      description_zh = excluded.description_zh,
      item_type = excluded.item_type,
      source_image_url = excluded.source_image_url,
      image_source_type = excluded.image_source_type,
      source_image_path = excluded.source_image_path,
      source_section_name = excluded.source_section_name,
      source_section_slug = excluded.source_section_slug,
      position_in_issue = excluded.position_in_issue,
      position_in_section = excluded.position_in_section,
      is_sponsored = excluded.is_sponsored,
      raw_text = excluded.raw_text,
      tags_json = excluded.tags_json,
      primary_category = excluded.primary_category,
      secondary_categories_json = excluded.secondary_categories_json,
      interaction_patterns_json = excluded.interaction_patterns_json,
      visual_patterns_json = excluded.visual_patterns_json,
      tech_keywords_json = excluded.tech_keywords_json,
      use_cases_json = excluded.use_cases_json,
      fit_for_projects_json = excluded.fit_for_projects_json,
      fit_for_scenes_json = excluded.fit_for_scenes_json,
      complexity_level = excluded.complexity_level,
      implementation_cost = excluded.implementation_cost,
      platform_fit_json = excluded.platform_fit_json,
      novelty_score = excluded.novelty_score,
      reuse_confidence = excluded.reuse_confidence,
      personal_rating = excluded.personal_rating,
      favorite = excluded.favorite,
      used_in_projects_json = excluded.used_in_projects_json,
      rejected_reason = excluded.rejected_reason,
      revisit_later = excluded.revisit_later,
      taste_profile_json = excluded.taste_profile_json,
      quality_score = excluded.quality_score,
      summary = excluded.summary,
      summary_zh = excluded.summary_zh,
      why_it_matters = excluded.why_it_matters,
      why_it_matters_zh = excluded.why_it_matters_zh,
      reusable_idea = excluded.reusable_idea,
      reusable_idea_zh = excluded.reusable_idea_zh,
      notes = excluded.notes,
      screenshot_path = excluded.screenshot_path,
      preview_image_path = excluded.preview_image_path,
      thumbnail_path = excluded.thumbnail_path,
      hero_image_path = excluded.hero_image_path,
      curation_status = excluded.curation_status,
      markdown_path = excluded.markdown_path,
      content_hash = excluded.content_hash,
      collected_at = excluded.collected_at,
      imported_at = excluded.imported_at,
      needs_enrichment = excluded.needs_enrichment,
      updated_at = excluded.updated_at
  `).run(
    record.id,
    record.issueKey,
    record.sourceName,
    record.sourceType,
    record.issueId,
    record.issueTitle,
    record.issueUrl,
    record.pageTitle,
    record.publishedAt || "",
    record.itemUrl,
    record.domain,
    record.title,
    record.titleZh,
    record.description,
    record.descriptionZh,
    record.itemType,
    record.sourceImageUrl,
    record.imageSourceType,
    record.sourceImagePath,
    record.sourceSectionName || "",
    record.sourceSectionSlug || "",
    record.positionInIssue,
    record.positionInSection,
    record.isSponsored ? 1 : 0,
    record.rawText,
    JSON.stringify(record.tags),
    record.primaryCategory,
    JSON.stringify(record.secondaryCategories),
    JSON.stringify(record.interactionPatterns),
    JSON.stringify(record.visualPatterns),
    JSON.stringify(record.techKeywords),
    JSON.stringify(record.useCases),
    JSON.stringify(record.fitForProjects),
    JSON.stringify(record.fitForScenes),
    record.complexityLevel,
    record.implementationCost,
    JSON.stringify(record.platformFit),
    record.noveltyScore,
    record.reuseConfidence,
    record.personalRating,
    record.favorite,
    JSON.stringify(record.usedInProjects),
    record.rejectedReason,
    record.revisitLater,
    JSON.stringify(record.tasteProfile),
    record.qualityScore,
    record.summary,
    record.summaryZh,
    record.whyItMatters,
    record.whyItMattersZh,
    record.reusableIdea,
    record.reusableIdeaZh,
    record.notes,
    record.screenshotPath,
    record.previewImagePath,
    record.thumbnailPath,
    record.heroImagePath,
    record.curationStatus,
    record.markdownPath,
    record.contentHash,
    record.collectedAt,
    record.importedAt,
    record.needsEnrichment,
    record.createdAt,
    record.updatedAt
  );
};

const yamlScalar = (value) => {
  if (value === null || value === undefined || value === "") return '""';
  return JSON.stringify(String(value));
};

const yamlArray = (values) =>
  values.length ? `[${values.map((value) => JSON.stringify(value)).join(", ")}]` : "[]";

export const renderMarkdownCard = (record) => `---
id: ${yamlScalar(record.id)}
source: ${yamlScalar(record.sourceName)}
source_type: ${yamlScalar(record.sourceType)}
issue_id: ${yamlScalar(record.issueId)}
issue_title: ${yamlScalar(record.issueTitle)}
issue_url: ${yamlScalar(record.issueUrl)}
page_title: ${yamlScalar(record.pageTitle)}
published_at: ${yamlScalar(record.publishedAt)}
item_url: ${yamlScalar(record.itemUrl)}
domain: ${yamlScalar(record.domain)}
title: ${yamlScalar(record.title)}
title_zh: ${yamlScalar(record.titleZh)}
item_type: ${yamlScalar(record.itemType || "")}
source_image_url: ${yamlScalar(record.sourceImageUrl)}
image_source_type: ${yamlScalar(record.imageSourceType)}
source_image_path: ${yamlScalar(record.sourceImagePath)}
source_section_name: ${yamlScalar(record.sourceSectionName)}
source_section_slug: ${yamlScalar(record.sourceSectionSlug)}
position_in_issue: ${record.positionInIssue ?? "null"}
position_in_section: ${record.positionInSection ?? "null"}
is_sponsored: ${record.isSponsored ? "true" : "false"}
tags: ${yamlArray(record.tags)}
primary_category: ${yamlScalar(record.primaryCategory)}
secondary_categories: ${yamlArray(record.secondaryCategories)}
interaction_patterns: ${yamlArray(record.interactionPatterns)}
visual_patterns: ${yamlArray(record.visualPatterns)}
tech_keywords: ${yamlArray(record.techKeywords)}
use_cases: ${yamlArray(record.useCases)}
fit_for_projects: ${yamlArray(record.fitForProjects)}
fit_for_scenes: ${yamlArray(record.fitForScenes)}
complexity_level: ${yamlScalar(record.complexityLevel)}
implementation_cost: ${yamlScalar(record.implementationCost)}
platform_fit: ${yamlArray(record.platformFit)}
novelty_score: ${record.noveltyScore ?? "null"}
reuse_confidence: ${yamlScalar(record.reuseConfidence)}
personal_rating: ${record.personalRating ?? "null"}
favorite: ${record.favorite ? "true" : "false"}
used_in_projects: ${yamlArray(record.usedInProjects)}
rejected_reason: ${yamlScalar(record.rejectedReason)}
revisit_later: ${record.revisitLater ? "true" : "false"}
taste_profile: ${yamlArray(record.tasteProfile)}
quality_score: ${record.qualityScore ?? "null"}
collected_at: ${yamlScalar(record.collectedAt)}
imported_at: ${yamlScalar(record.importedAt)}
screenshot_path: ${yamlScalar(record.screenshotPath)}
preview_image_path: ${yamlScalar(record.previewImagePath)}
thumbnail_path: ${yamlScalar(record.thumbnailPath)}
hero_image_path: ${yamlScalar(record.heroImagePath)}
curation_status: ${yamlScalar(record.curationStatus)}
needs_enrichment: ${record.needsEnrichment ? "true" : "false"}
---

## Source Summary
${record.description || "No description captured."}

## Source Context
- Published At: ${record.publishedAt || "TODO"}
- Section: ${record.sourceSectionName || "TODO"}
- Position In Issue: ${record.positionInIssue ?? "TODO"}
- Position In Section: ${record.positionInSection ?? "TODO"}
- Sponsored: ${record.isSponsored ? "yes" : "no"}

## Source Summary ZH
${record.descriptionZh || "TODO"}

## Summary
${record.summary || "TODO"}

## Summary ZH
${record.summaryZh || "TODO"}

## Why It Matters
${record.whyItMatters || "TODO"}

## Why It Matters ZH
${record.whyItMattersZh || "TODO"}

## Reusable Idea
${record.reusableIdea || "TODO"}

## Reusable Idea ZH
${record.reusableIdeaZh || "TODO"}

## Decision Profile
- Fit For Projects: ${record.fitForProjects.length ? record.fitForProjects.join(", ") : "TODO"}
- Fit For Scenes: ${record.fitForScenes.length ? record.fitForScenes.join(", ") : "TODO"}
- Complexity Level: ${record.complexityLevel || "TODO"}
- Implementation Cost: ${record.implementationCost || "TODO"}
- Platform Fit: ${record.platformFit.length ? record.platformFit.join(", ") : "TODO"}
- Novelty Score: ${record.noveltyScore ?? "TODO"}
- Reuse Confidence: ${record.reuseConfidence || "TODO"}

## Personal Memory
- Personal Rating: ${record.personalRating ?? "TODO"}
- Favorite: ${record.favorite ? "yes" : "no"}
- Revisit Later: ${record.revisitLater ? "yes" : "no"}
- Used In Projects: ${record.usedInProjects.length ? record.usedInProjects.join(", ") : "TODO"}
- Rejected Reason: ${record.rejectedReason || "TODO"}
- Taste Profile: ${record.tasteProfile.length ? record.tasteProfile.join(", ") : "TODO"}

## Notes
${record.notes || "TODO"}
`;

export const writeMarkdownCard = async (record) => {
  const absolutePath = absoluteFromVault(record.markdownPath);
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, renderMarkdownCard(record));
};

export const copyRawImport = async (normalizedExport, importTimestamp, originalFile, payload) => {
  const relativePath = rawRelativePathForImport(normalizedExport, importTimestamp, originalFile);
  const absolutePath = absoluteFromVault(relativePath);

  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, JSON.stringify(payload, null, 2));

  return relativePath;
};

export const markdownPathForItem = (normalizedExport, item) =>
  markdownRelativePathForItem(normalizedExport, item);

export const writeEnrichmentBatch = async (createdAt, payload) => {
  const relativePath = enrichmentBatchRelativePath(createdAt);
  const absolutePath = absoluteFromVault(relativePath);

  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, JSON.stringify(payload, null, 2));

  return relativePath;
};

export const listPendingEnrichmentItems = (db, limit) =>
  db
    .prepare(`
      SELECT
        id,
        issue_id,
        issue_title,
        title,
        description,
        published_at,
        item_type,
        item_url,
        domain,
        source_section_name,
        source_section_slug,
        position_in_issue,
        position_in_section,
        is_sponsored,
        tags_json,
        interaction_patterns_json,
        visual_patterns_json,
        tech_keywords_json,
        use_cases_json,
        fit_for_projects_json,
        fit_for_scenes_json,
        complexity_level,
        implementation_cost,
        platform_fit_json,
        novelty_score,
        reuse_confidence,
        personal_rating,
        favorite,
        used_in_projects_json,
        rejected_reason,
        revisit_later,
        taste_profile_json,
        quality_score,
        summary,
        why_it_matters,
        reusable_idea,
        notes,
        markdown_path
      FROM items
      WHERE needs_enrichment = 1
      ORDER BY collected_at DESC, title ASC
      LIMIT ?
    `)
    .all(limit);

export const fetchItemById = (db, id) =>
  db.prepare("SELECT * FROM items WHERE id = ?").get(id);
