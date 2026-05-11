---
name: weekly-enrichment
description: Use when enriching iOS Dev Weekly items in this repo, especially to summarize technical newsletter links, classify them with weekly-specific taxonomy, and prepare high-quality metadata for retrieval in `vault/enrichment/batches/*.json` and `vault/items/iosdevweekly/**/*.md`.
---

# Weekly Enrichment

This skill enriches newsletter-style weekly items that already exist in the local vault. It is designed for `iosdevweekly` entries and should not be used for CodePen Spark inspiration items.

Use this skill when the task is to:

- process all pending `iosdevweekly` enrichment items from the vault
- translate and summarize weekly links in Chinese
- assign weekly-specific technical tags and categories
- preserve issue and section context such as `News`, `Tools`, `Code`, or `Sponsored Link`
- write concise reasoning fields such as `summary`, `why_it_matters`, and `reusable_idea`
- automatically apply the enriched result back into the vault

Do not use this skill for:

- collecting pages from iOS Dev Weekly
- changing source URLs or issue metadata
- applying Spark-style visual inspiration taxonomy

## Workflow

1. Build a fresh batch from the current weekly pending queue.
Unless the user explicitly names another file, run:

```bash
npm run vault:prepare-enrichment -- iosdevweekly
```

2. Read the newest batch file.
Only load the batch you need. Read linked Markdown cards in `vault/items/iosdevweekly/` only when the batch description is not enough.

3. Read the taxonomy.
Use [references/taxonomy.md](references/taxonomy.md) to keep weekly labels consistent.

4. Fill only enrichment fields.
Allowed fields:
- `title_zh`
- `description_zh`
- `tags`
- `primary_category`
- `secondary_categories`
- `interaction_patterns`
- `visual_patterns`
- `tech_keywords`
- `use_cases`
- `fit_for_projects`
- `fit_for_scenes`
- `complexity_level`
- `implementation_cost`
- `platform_fit`
- `novelty_score`
- `reuse_confidence`
- `personal_rating`
- `favorite`
- `used_in_projects`
- `rejected_reason`
- `revisit_later`
- `taste_profile`
- `quality_score`
- `summary`
- `summary_zh`
- `why_it_matters`
- `why_it_matters_zh`
- `reusable_idea`
- `reusable_idea_zh`
- `notes`
- `curation_status`
- `needs_enrichment`

5. Keep enrichment conservative.
- Prefer the newsletter summary text over the raw link target when they conflict.
- Many weekly links point to author homepages or social profiles; the useful meaning may live in the weekly blurb, not the URL.
- Do not pretend the target URL title is the article title when the issue summary clearly provides the real topic.
- If unsure, keep wording broad and factual.

6. Apply the result immediately.
After editing the batch in place, run:

```bash
npm run vault:apply-enrichment -- <batch-file>
```

The default completion path for this skill is:

1. run `vault:prepare-enrichment -- iosdevweekly`
2. pick the newest weekly pending batch unless the user specifies another file
3. enrich every item in that batch
4. set `needs_enrichment` to `false` for sufficiently enriched items
5. set `curation_status` to `enriched` unless a better state is clearly appropriate
6. run `vault:apply-enrichment`
7. report which batch file was applied

## Output Rules

### Tags

- Keep `tags` technical and retrieval-oriented.
- Prefer 3 to 6 tags.
- Prefer nouns like `swift`, `xcode`, `visionos`, `concurrency`, `tooling`, `sandbox`.

### Chinese Fields

- `title_zh`, `description_zh`, `summary_zh`, `why_it_matters_zh`, and `reusable_idea_zh` should read naturally in Chinese.
- Prefer concise, idiomatic Chinese over literal translation.
- Treat the weekly blurb as the main source of truth.

### Categories

- `primary_category` should be a weekly-specific high-level bucket.
- `secondary_categories` should be 0 to 3 narrower technical topics.
- Prefer categories from the weekly taxonomy before inventing new ones.

### Interaction Patterns / Visual Patterns

- These fields are usually sparse for weekly items.
- Leave them empty unless the item is explicitly about interaction or interface techniques.

### Tech Keywords

- Use strong technical topic signals only.
- Good examples: `swift`, `swiftui`, `xcode`, `visionos`, `metal`, `concurrency`, `sandbox`.

### Use Cases

- Use future product or engineering contexts where the item might become useful.
- Good examples: `design-tool`, `dashboard`, `component-library`, `developer-tooling`.

### Decision Fields

- `fit_for_projects` should describe the project types where the knowledge is most relevant.
- `fit_for_scenes` should describe where this knowledge matters in work, such as architecture, feature work, or tooling maintenance.
- `complexity_level` and `implementation_cost` should reflect the likely engineering depth of applying the idea, not the effort of reading the article.

### Quality Score

Use a 1-5 scale:

- `1`: weak or generic
- `2`: mildly useful
- `3`: useful reference
- `4`: strong technical reference
- `5`: exceptional reference likely worth revisiting often

### Summary

- One sentence
- State what the link is about

### Why It Matters

- One or two sentences
- Explain why it is worth keeping in the technical external brain

### Reusable Idea

- One or two sentences
- Focus on the engineering judgement, workflow lesson, or product implication

## Consistency

- Keep wording compact
- Prefer stable technical vocabulary over novelty
- Avoid Spark-oriented aesthetic labels
- Set `needs_enrichment` to `false` when the item is sufficiently enriched
