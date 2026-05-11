import fs from "node:fs/promises";
import path from "node:path";
import { fetchItemById, openVaultDatabase, upsertItem, writeMarkdownCard } from "./lib/vault.mjs";
import {
  parseJsonArray,
  resolvePrimaryCategory,
  resolveSecondaryCategories,
  toIsoDate
} from "./lib/normalize.mjs";
import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: npm run vault:apply-enrichment -- <path-to-enrichment.json>");
  process.exit(1);
}

const asArray = (value) => (Array.isArray(value) ? value.map(String) : []);
const asFlag = (value, fallback = 0) => {
  const candidate = value ?? fallback;
  if (typeof candidate === "string") {
    const normalized = candidate.trim().toLowerCase();
    if (["", "0", "false", "no", "off"].includes(normalized)) return 0;
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
  }
  return Number(Boolean(candidate));
};
const pick = (enrichment, key, fallback) =>
  enrichment[key] ?? enrichment.current?.[key] ?? fallback;

const main = async () => {
  const absoluteInput = path.resolve(process.cwd(), inputFile);
  const payload = JSON.parse(await fs.readFile(absoluteInput, "utf8"));
  const items = Array.isArray(payload) ? payload : payload.items;

  if (!Array.isArray(items)) {
    throw new Error("Enrichment payload must be an array or an object with an items array.");
  }

  const db = openVaultDatabase();
  const appliedAt = toIsoDate();

  try {
    for (const enrichment of items) {
      if (!enrichment?.id) {
        throw new Error("Every enrichment item must include an id.");
      }

      const existing = fetchItemById(db, enrichment.id);
      if (!existing) {
        throw new Error(`Unknown item id: ${enrichment.id}`);
      }

      const record = {
        id: existing.id,
        issueKey: existing.issue_key,
        sourceName: existing.source_name,
        sourceType: existing.source_type,
        issueId: existing.issue_id,
        issueTitle: existing.issue_title,
        issueUrl: existing.issue_url,
        pageTitle: existing.page_title,
        publishedAt: existing.published_at ?? "",
        itemUrl: existing.item_url,
        domain: existing.domain,
        title: existing.title,
        titleZh: String(pick(enrichment, "title_zh", existing.title_zh ?? "")),
        description: existing.description,
        descriptionZh: String(
          pick(enrichment, "description_zh", existing.description_zh ?? "")
        ),
        itemType: existing.item_type,
        sourceImageUrl: existing.source_image_url,
        imageSourceType: existing.image_source_type,
        sourceImagePath: existing.source_image_path,
        sourceSectionName: existing.source_section_name ?? "",
        sourceSectionSlug: existing.source_section_slug ?? "",
        positionInIssue: existing.position_in_issue ?? null,
        positionInSection: existing.position_in_section ?? null,
        isSponsored: Number(existing.is_sponsored ?? 0),
        rawText: existing.raw_text,
        contentHash: existing.content_hash,
        collectedAt: existing.collected_at,
        importedAt: existing.imported_at,
        markdownPath: existing.markdown_path,
        screenshotPath: pick(enrichment, "screenshot_path", existing.screenshot_path),
        previewImagePath: String(
          pick(enrichment, "preview_image_path", existing.preview_image_path ?? "")
        ),
        thumbnailPath: String(
          pick(enrichment, "thumbnail_path", existing.thumbnail_path ?? "")
        ),
        heroImagePath: String(
          pick(enrichment, "hero_image_path", existing.hero_image_path ?? "")
        ),
        tags: asArray(pick(enrichment, "tags", parseJsonArray(existing.tags_json))),
        primaryCategory: resolvePrimaryCategory(
          existing.title,
          String(pick(enrichment, "primary_category", existing.primary_category ?? ""))
        ),
        secondaryCategories: asArray(
          resolveSecondaryCategories(
            existing.title,
            pick(
              enrichment,
              "secondary_categories",
              parseJsonArray(existing.secondary_categories_json)
            )
          )
        ),
        interactionPatterns: asArray(
          pick(enrichment, "interaction_patterns", parseJsonArray(existing.interaction_patterns_json))
        ),
        visualPatterns: asArray(
          pick(enrichment, "visual_patterns", parseJsonArray(existing.visual_patterns_json))
        ),
        techKeywords: asArray(
          pick(enrichment, "tech_keywords", parseJsonArray(existing.tech_keywords_json))
        ),
        useCases: asArray(pick(enrichment, "use_cases", parseJsonArray(existing.use_cases_json))),
        fitForProjects: asArray(
          pick(enrichment, "fit_for_projects", parseJsonArray(existing.fit_for_projects_json))
        ),
        fitForScenes: asArray(
          pick(enrichment, "fit_for_scenes", parseJsonArray(existing.fit_for_scenes_json))
        ),
        complexityLevel: String(
          pick(enrichment, "complexity_level", existing.complexity_level ?? "")
        ),
        implementationCost: String(
          pick(enrichment, "implementation_cost", existing.implementation_cost ?? "")
        ),
        platformFit: asArray(
          pick(enrichment, "platform_fit", parseJsonArray(existing.platform_fit_json))
        ),
        noveltyScore: pick(enrichment, "novelty_score", existing.novelty_score),
        reuseConfidence: String(
          pick(enrichment, "reuse_confidence", existing.reuse_confidence ?? "")
        ),
        personalRating: pick(enrichment, "personal_rating", existing.personal_rating),
        favorite: asFlag(pick(enrichment, "favorite", existing.favorite ?? 0)),
        usedInProjects: asArray(
          pick(enrichment, "used_in_projects", parseJsonArray(existing.used_in_projects_json))
        ),
        rejectedReason: String(
          pick(enrichment, "rejected_reason", existing.rejected_reason ?? "")
        ),
        revisitLater: asFlag(pick(enrichment, "revisit_later", existing.revisit_later ?? 0)),
        tasteProfile: asArray(
          pick(enrichment, "taste_profile", parseJsonArray(existing.taste_profile_json))
        ),
        qualityScore: pick(enrichment, "quality_score", existing.quality_score),
        summary: String(pick(enrichment, "summary", existing.summary ?? "")),
        summaryZh: String(pick(enrichment, "summary_zh", existing.summary_zh ?? "")),
        whyItMatters: String(pick(enrichment, "why_it_matters", existing.why_it_matters ?? "")),
        whyItMattersZh: String(
          pick(enrichment, "why_it_matters_zh", existing.why_it_matters_zh ?? "")
        ),
        reusableIdea: String(pick(enrichment, "reusable_idea", existing.reusable_idea ?? "")),
        reusableIdeaZh: String(
          pick(enrichment, "reusable_idea_zh", existing.reusable_idea_zh ?? "")
        ),
        notes: String(pick(enrichment, "notes", existing.notes ?? "")),
        curationStatus: String(
          pick(enrichment, "curation_status", existing.curation_status ?? "raw")
        ),
        needsEnrichment: Number(Boolean(pick(enrichment, "needs_enrichment", 0))),
        createdAt: existing.created_at,
        updatedAt: appliedAt
      };

      upsertItem(db, record);
      await writeMarkdownCard(record);
    }

    const galleryResult = await renderGallerySite(loadGalleryData(db));

    console.log(`Applied enrichment to ${items.length} items`);
    console.log(`Gallery: ${galleryResult.indexPath}`);
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
