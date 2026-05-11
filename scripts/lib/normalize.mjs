import crypto from "node:crypto";
import path from "node:path";

export const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export const canonicalizeItemUrl = (value) => {
  const text = normalizeText(value);
  if (!text) return "";

  try {
    const parsed = new URL(text);
    parsed.hash = "";

    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/g, "");
    }

    return parsed.toString();
  } catch {
    return text;
  }
};

export const isCodePenChallengeTitle = (value) =>
  /^(#\s*)?codepenchallenge:|^codepen challenge:/i.test(
    normalizeText(value).replace(/\s+/g, " ")
  );

export const challengeCollectionCategory = "challenge-collection";

export const resolvePrimaryCategory = (title, fallback = "") =>
  isCodePenChallengeTitle(title) ? challengeCollectionCategory : fallback;

export const resolveSecondaryCategories = (title, fallback = []) => {
  const values = Array.isArray(fallback) ? fallback.filter(Boolean) : [];
  if (!isCodePenChallengeTitle(title)) return values;
  return values.includes("collections") ? values : ["collections", ...values];
};

export const slugify = (value, fallback = "item") => {
  const slug = normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
};

export const shortHash = (value) =>
  crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 10);

export const toIsoDate = (value, fallback = new Date().toISOString()) => {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) {
    return new Date(fallback).toISOString();
  }
  return date.toISOString();
};

export const extractYear = (isoDate) => toIsoDate(isoDate).slice(0, 4);

export const dirnameFromPath = (filepath) => path.dirname(filepath);

export const safeHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

export const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const deriveIssueId = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const sparkMatch = pathname.match(/\/spark\/(\d+)/);
    if (sparkMatch) return sparkMatch[1];
    const weeklyMatch = pathname.match(/\/issues\/(\d+)/);
    if (weeklyMatch) return weeklyMatch[1];
    const uxWeeklyMatch = pathname.match(/ux-weekly-(\d+)\.html/i);
    if (uxWeeklyMatch) return uxWeeklyMatch[1];
    const fatbobmanWeeklyMatch = pathname.match(/\/weekly\/issue-(\d+)\/?/i);
    if (fatbobmanWeeklyMatch) return fatbobmanWeeklyMatch[1];
    const githubMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    return githubMatch
      ? `${githubMatch[1].trim().toLowerCase()}--${githubMatch[2]
          .replace(/\.git$/i, "")
          .trim()
          .toLowerCase()}`
      : "";
  } catch {
    return "";
  }
};

const normalizeTopLevelMetadata = (raw) => {
  const collectedAt = toIsoDate(raw.exportedAt || raw.extractedAt || raw.collectedAt);
  const issueId = String(raw.issueId || raw.issue_id || deriveIssueId(raw.url) || "").trim();
  const sourceName = raw.sourceName || raw.source_name || "codepen";
  const sourceType = raw.sourceType || raw.source_type || "spark_issue";
  const collector =
    raw.collector ||
    (raw.exportedAt ? "browser-extension" : raw.extractedAt ? "playwright" : "unknown");
  const sponsoredCount =
    Number(raw.sponsoredCount ?? raw.sponsoredMarkerCount ?? raw.sponsoredItems?.length ?? 0) || 0;
  const publishedAt = raw.publishedAt || raw.published_at || raw.issueDate || raw.issue_date || "";

  return {
    schemaVersion: raw.schemaVersion || "1.0",
    collectedAt,
    publishedAt: publishedAt ? toIsoDate(publishedAt, collectedAt) : "",
    issueId,
    issueTitle: normalizeText(raw.issueTitle || raw.issue_title || ""),
    issueUrl: raw.url || raw.issueUrl || raw.issue_url || "",
    pageTitle: normalizeText(raw.pageTitle || raw.title || ""),
    sourceName,
    sourceType,
    collector,
    comment: normalizeText(raw.comment || raw.editorComment || raw.editor_comment || ""),
    sponsoredCount,
    includeSponsored: Boolean(raw.includeSponsored)
  };
};

const inferItemTypeFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "codepen.io" && parsed.pathname.includes("/pen/")) {
      return "pen";
    }
    if (parsed.hostname === "codepen.io" && parsed.pathname.includes("/collection/")) {
      return "collection";
    }
    return "link";
  } catch {
    return null;
  }
};

const normalizeItem = (item) => {
  const itemUrl = canonicalizeItemUrl(item.href || item.url || item.item_url || "");
  const inferredType = item.itemType || item.item_type || inferItemTypeFromUrl(itemUrl);
  const sectionName = normalizeText(item.sectionName || item.section_name || "");
  const sectionSlug = normalizeText(item.sectionSlug || item.section_slug || slugify(sectionName, ""));

  return {
    title: normalizeText(item.title),
    itemUrl,
    description: normalizeText(item.description),
    sourceImageUrl: item.sourceImageUrl || item.source_image_url || "",
    imageSourceType: item.imageSourceType || item.image_source_type || "",
    itemType: inferredType || null,
    rawText: normalizeText(item.text || ""),
    sponsored: Boolean(item.sponsored),
    sectionName,
    sectionSlug,
    positionInIssue:
      Number.isFinite(Number(item.positionInIssue ?? item.position_in_issue))
        ? Number(item.positionInIssue ?? item.position_in_issue)
        : null,
    positionInSection:
      Number.isFinite(Number(item.positionInSection ?? item.position_in_section))
        ? Number(item.positionInSection ?? item.position_in_section)
        : null
  };
};

export const normalizeExportPayload = (rawPayload) => {
  const topLevel = normalizeTopLevelMetadata(rawPayload);
  const issueKey = `${topLevel.sourceName}-${topLevel.sourceType}-${topLevel.issueId || shortHash(topLevel.issueUrl)}`;

  const dedupedByUrl = new Map();

  for (const item of (rawPayload.items || [])
    .map(normalizeItem)
    .filter(
      (item) =>
        item.title &&
        item.itemUrl &&
        (topLevel.includeSponsored ? true : !item.sponsored)
    )
    .map((item) => {
      const itemSlug = slugify(item.title);
      const id = `item-${itemSlug}-${shortHash(item.itemUrl)}`;

      return {
        id,
        slug: itemSlug,
        title: item.title,
        itemUrl: item.itemUrl,
        description: item.description,
        sourceImageUrl: item.sourceImageUrl,
        imageSourceType: item.imageSourceType || "",
        itemType: item.itemType || "link",
        rawText: item.rawText,
        domain: safeHostname(item.itemUrl),
        sectionName: item.sectionName,
        sectionSlug: item.sectionSlug,
        positionInIssue: item.positionInIssue,
        positionInSection: item.positionInSection,
        isSponsored: item.sponsored ? 1 : 0,
        contentHash: shortHash(
          JSON.stringify({
            title: item.title,
            itemUrl: item.itemUrl,
            description: item.description,
            sourceImageUrl: item.sourceImageUrl,
            imageSourceType: item.imageSourceType,
            itemType: item.itemType,
            rawText: item.rawText
          })
        )
      };
    })) {
    if (!dedupedByUrl.has(item.itemUrl)) {
      dedupedByUrl.set(item.itemUrl, item);
    }
  }

  const items = Array.from(dedupedByUrl.values());

  return {
    ...topLevel,
    issueKey,
    itemCount: items.length,
    items
  };
};

export const markdownRelativePathForItem = (normalizedExport, item) =>
  path.posix.join(
    "items",
    normalizedExport.sourceName,
    extractYear(normalizedExport.collectedAt),
    `${item.id}.md`
  );

export const rawRelativePathForImport = (normalizedExport, importTimestamp, originalFile) =>
  path.posix.join(
    "raw",
    `${normalizedExport.sourceName}-${normalizedExport.sourceType}`,
    extractYear(normalizedExport.collectedAt),
    `${normalizedExport.issueId || "issue"}-${importTimestamp}-${slugify(
      path.parse(originalFile).name
    )}.json`
  );

export const enrichmentBatchRelativePath = (createdAt) =>
  path.posix.join("enrichment", "batches", `pending-${createdAt.replace(/[:.]/g, "-")}.json`);

export const mergeImportedRecord = ({
  normalizedExport,
  item,
  importedAt,
  existing,
  markdownRelativePath
}) => ({
  id: existing?.id || item.id,
  issueKey: normalizedExport.issueKey,
  sourceName: normalizedExport.sourceName,
  sourceType: normalizedExport.sourceType,
  issueId: normalizedExport.issueId,
  issueTitle: normalizedExport.issueTitle,
  issueUrl: normalizedExport.issueUrl,
  pageTitle: normalizedExport.pageTitle,
  publishedAt: normalizedExport.publishedAt || existing?.published_at || "",
  itemUrl: item.itemUrl,
  domain: item.domain,
  title: item.title || existing?.title || "",
  description: item.description || existing?.description || "",
  itemType: item.itemType,
  rawText: item.rawText || existing?.raw_text || "",
  contentHash: item.contentHash,
  sourceImageUrl: item.sourceImageUrl || existing?.source_image_url || "",
  imageSourceType: item.imageSourceType || existing?.image_source_type || "",
  sourceImagePath: existing?.source_image_path || "",
  sourceSectionName: item.sectionName || "",
  sourceSectionSlug: item.sectionSlug || "",
  positionInIssue: item.positionInIssue,
  positionInSection: item.positionInSection,
  isSponsored: item.isSponsored ?? 0,
  collectedAt: normalizedExport.collectedAt,
  importedAt,
  markdownPath: existing?.markdown_path || markdownRelativePath,
  titleZh: existing?.title_zh || "",
  descriptionZh: existing?.description_zh || "",
  screenshotPath: existing?.screenshot_path || "",
  previewImagePath: existing?.preview_image_path || "",
  thumbnailPath: existing?.thumbnail_path || "",
  heroImagePath: existing?.hero_image_path || "",
  tags: parseJsonArray(existing?.tags_json),
  primaryCategory: resolvePrimaryCategory(item.title, existing?.primary_category || ""),
  secondaryCategories: resolveSecondaryCategories(
    item.title,
    parseJsonArray(existing?.secondary_categories_json)
  ),
  interactionPatterns: parseJsonArray(existing?.interaction_patterns_json),
  visualPatterns: parseJsonArray(existing?.visual_patterns_json),
  techKeywords: parseJsonArray(existing?.tech_keywords_json),
  useCases: parseJsonArray(existing?.use_cases_json),
  fitForProjects: parseJsonArray(existing?.fit_for_projects_json),
  fitForScenes: parseJsonArray(existing?.fit_for_scenes_json),
  complexityLevel: existing?.complexity_level || "",
  implementationCost: existing?.implementation_cost || "",
  platformFit: parseJsonArray(existing?.platform_fit_json),
  noveltyScore: existing?.novelty_score ?? null,
  reuseConfidence: existing?.reuse_confidence || "",
  personalRating: existing?.personal_rating ?? null,
  favorite: Number(existing?.favorite ?? 0),
  usedInProjects: parseJsonArray(existing?.used_in_projects_json),
  rejectedReason: existing?.rejected_reason || "",
  revisitLater: Number(existing?.revisit_later ?? 0),
  tasteProfile: parseJsonArray(existing?.taste_profile_json),
  qualityScore: existing?.quality_score ?? null,
  summary: existing?.summary || "",
  summaryZh: existing?.summary_zh || "",
  whyItMatters: existing?.why_it_matters || "",
  whyItMattersZh: existing?.why_it_matters_zh || "",
  reusableIdea: existing?.reusable_idea || "",
  reusableIdeaZh: existing?.reusable_idea_zh || "",
  notes: existing?.notes || "",
  curationStatus: existing?.curation_status || "raw",
  needsEnrichment: existing ? Number(existing.needs_enrichment) : 1,
  createdAt: existing?.created_at || importedAt,
  updatedAt: importedAt
});
