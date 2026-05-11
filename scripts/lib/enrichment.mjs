import { parseJsonArray, toIsoDate } from "./normalize.mjs";
import { writeEnrichmentBatch } from "./vault.mjs";

const toBatchItem = (row) => ({
  id: row.id,
  source_name: row.source_name ?? row.sourceName,
  source_type: row.source_type ?? row.sourceType,
  issue_id: row.issue_id ?? row.issueId,
  issue_title: row.issue_title ?? row.issueTitle,
  published_at: row.published_at ?? row.publishedAt ?? "",
  title: row.title,
  title_zh: row.title_zh ?? row.titleZh ?? "",
  description: row.description,
  description_zh: row.description_zh ?? row.descriptionZh ?? "",
  item_type: row.item_type ?? row.itemType,
  item_url: row.item_url ?? row.itemUrl,
  domain: row.domain,
  source_section_name: row.source_section_name ?? row.sourceSectionName ?? "",
  source_section_slug: row.source_section_slug ?? row.sourceSectionSlug ?? "",
  position_in_issue: row.position_in_issue ?? row.positionInIssue ?? null,
  position_in_section: row.position_in_section ?? row.positionInSection ?? null,
  is_sponsored: Boolean(row.is_sponsored ?? row.isSponsored ?? false),
  source_image_url: row.source_image_url ?? row.sourceImageUrl ?? "",
  image_source_type: row.image_source_type ?? row.imageSourceType ?? "",
  source_image_path: row.source_image_path ?? row.sourceImagePath ?? "",
  markdown_path: row.markdown_path ?? row.markdownPath,
  screenshot_path: row.screenshot_path ?? row.screenshotPath ?? "",
  preview_image_path: row.preview_image_path ?? row.previewImagePath ?? "",
  thumbnail_path: row.thumbnail_path ?? row.thumbnailPath ?? "",
  hero_image_path: row.hero_image_path ?? row.heroImagePath ?? "",
  tags: Array.isArray(row.tags)
    ? row.tags
    : parseJsonArray(row.tags_json),
  primary_category: row.primary_category ?? row.primaryCategory ?? "",
  secondary_categories: Array.isArray(row.secondaryCategories)
    ? row.secondaryCategories
    : parseJsonArray(row.secondary_categories_json),
  interaction_patterns: Array.isArray(row.interactionPatterns)
    ? row.interactionPatterns
    : parseJsonArray(row.interaction_patterns_json),
  visual_patterns: Array.isArray(row.visualPatterns)
    ? row.visualPatterns
    : parseJsonArray(row.visual_patterns_json),
  tech_keywords: Array.isArray(row.techKeywords)
    ? row.techKeywords
    : parseJsonArray(row.tech_keywords_json),
  use_cases: Array.isArray(row.useCases)
    ? row.useCases
    : parseJsonArray(row.use_cases_json),
  fit_for_projects: Array.isArray(row.fitForProjects)
    ? row.fitForProjects
    : parseJsonArray(row.fit_for_projects_json),
  fit_for_scenes: Array.isArray(row.fitForScenes)
    ? row.fitForScenes
    : parseJsonArray(row.fit_for_scenes_json),
  complexity_level: row.complexity_level ?? row.complexityLevel ?? "",
  implementation_cost: row.implementation_cost ?? row.implementationCost ?? "",
  platform_fit: Array.isArray(row.platformFit)
    ? row.platformFit
    : parseJsonArray(row.platform_fit_json),
  novelty_score: row.novelty_score ?? row.noveltyScore ?? null,
  reuse_confidence: row.reuse_confidence ?? row.reuseConfidence ?? "",
  personal_rating: row.personal_rating ?? row.personalRating ?? null,
  favorite:
    row.favorite === undefined ? Boolean(row.favorite ?? false) : Boolean(row.favorite),
  used_in_projects: Array.isArray(row.usedInProjects)
    ? row.usedInProjects
    : parseJsonArray(row.used_in_projects_json),
  rejected_reason: row.rejected_reason ?? row.rejectedReason ?? "",
  revisit_later:
    row.revisit_later === undefined
      ? Boolean(row.revisitLater ?? false)
      : Boolean(row.revisit_later),
  taste_profile: Array.isArray(row.tasteProfile)
    ? row.tasteProfile
    : parseJsonArray(row.taste_profile_json),
  quality_score: row.quality_score ?? row.qualityScore ?? null,
  summary: row.summary ?? "",
  summary_zh: row.summary_zh ?? row.summaryZh ?? "",
  why_it_matters: row.why_it_matters ?? row.whyItMatters ?? "",
  why_it_matters_zh: row.why_it_matters_zh ?? row.whyItMattersZh ?? "",
  reusable_idea: row.reusable_idea ?? row.reusableIdea ?? "",
  reusable_idea_zh: row.reusable_idea_zh ?? row.reusableIdeaZh ?? "",
  notes: row.notes ?? "",
  curation_status: row.curation_status ?? row.curationStatus ?? "raw",
  needs_enrichment:
    row.needs_enrichment === undefined
      ? Boolean(row.needsEnrichment ?? true)
      : Boolean(row.needs_enrichment)
});

export const buildEnrichmentBatchPayload = (rows, createdAt = toIsoDate()) => ({
  schemaVersion: "1.0",
  createdAt,
  instructions:
    "Fill translation, categorization, decision, display-image, and reasoning fields. Keep ids and source facts unchanged.",
  items: rows.map(toBatchItem)
});

export const writeEnrichmentBatchPayload = async (rows, createdAt = toIsoDate()) => {
  const payload = buildEnrichmentBatchPayload(rows, createdAt);
  const relativePath = await writeEnrichmentBatch(createdAt, payload);

  return {
    createdAt,
    payload,
    relativePath
  };
};

export const selectPendingEnrichmentRows = (db, limit = null, sourceName = null) => {
  const baseQuery = `
      SELECT
        id,
        source_name,
        source_type,
        issue_id,
        issue_title,
        published_at,
        title,
        title_zh,
        description,
        description_zh,
        item_type,
        item_url,
        domain,
        source_section_name,
        source_section_slug,
        position_in_issue,
        position_in_section,
        is_sponsored,
        source_image_url,
        image_source_type,
        source_image_path,
        tags_json,
        primary_category,
        secondary_categories_json,
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
        summary_zh,
        why_it_matters,
        why_it_matters_zh,
        reusable_idea,
        reusable_idea_zh,
        notes,
        screenshot_path,
        preview_image_path,
        thumbnail_path,
        hero_image_path,
        curation_status,
        markdown_path,
        needs_enrichment
      FROM items
      WHERE needs_enrichment = 1
      ${sourceName ? "AND source_name = ?" : ""}
      ORDER BY collected_at DESC, title ASC
  `;

  if (Number.isFinite(limit) && limit > 0) {
    return sourceName
      ? db.prepare(`${baseQuery} LIMIT ?`).all(sourceName, limit)
      : db.prepare(`${baseQuery} LIMIT ?`).all(limit);
  }

  return sourceName ? db.prepare(baseQuery).all(sourceName) : db.prepare(baseQuery).all();
};

export const selectEnrichmentRowsByIds = (db, ids) => {
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(", ");

  return db
    .prepare(`
      SELECT
        id,
        source_name,
        source_type,
        issue_id,
        issue_title,
        published_at,
        title,
        title_zh,
        description,
        description_zh,
        item_type,
        item_url,
        domain,
        source_section_name,
        source_section_slug,
        position_in_issue,
        position_in_section,
        is_sponsored,
        source_image_url,
        image_source_type,
        source_image_path,
        tags_json,
        primary_category,
        secondary_categories_json,
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
        summary_zh,
        why_it_matters,
        why_it_matters_zh,
        reusable_idea,
        reusable_idea_zh,
        notes,
        screenshot_path,
        preview_image_path,
        thumbnail_path,
        hero_image_path,
        curation_status,
        markdown_path,
        needs_enrichment
      FROM items
      WHERE id IN (${placeholders})
      ORDER BY title ASC
    `)
    .all(...ids);
};
