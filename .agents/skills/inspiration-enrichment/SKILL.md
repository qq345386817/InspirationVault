---
name: inspiration-enrichment
description: Use when enriching CodePen Spark items in this repo, especially to tag interaction inspiration, summarize why they matter, identify reusable interaction or visual patterns, and prepare high-quality metadata for retrieval in `vault/enrichment/batches/*.json` and `vault/items/**/*.md`.
---

# Inspiration Enrichment

This skill enriches CodePen Spark items that already exist in the local vault. It does not collect source data and it does not change raw facts such as `id`, `title`, `item_url`, `issue_id`, or `description`.

Use this skill when the task is to:

- process all pending enrichment items from the vault
- process all pending Spark enrichment items from the vault
- improve retrieval metadata for inspiration items
- translate important display text into Chinese
- assign categories for future visual browsing
- prepare preview-image metadata for future gallery views
- tag interaction, visual, technical, and use-case patterns
- write concise reasoning fields such as `summary`, `why_it_matters`, and `reusable_idea`
- automatically apply the enriched result back into the vault

Do not use this skill for:

- collecting pages from CodePen
- enriching iOS Dev Weekly items
- changing source URLs or source descriptions
- inventing unsupported implementation details

## Workflow

1. Build a fresh batch from the current pending queue.
Unless the user explicitly names another file, run:

```bash
npm run vault:prepare-enrichment -- codepen
```

This creates a fresh batch containing all `needs_enrichment = 1` items.

2. Read the newest batch file.
Only load the batch you need. Read linked Markdown cards in `vault/items/` only when the batch description is not enough.

3. Read the taxonomy.
Use [references/taxonomy.md](references/taxonomy.md) to keep Spark labels consistent.

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
- `preview_image_path`
- `thumbnail_path`
- `hero_image_path`
- `source_image_path`
- `curation_status`
- `needs_enrichment`

5. Keep enrichment conservative.
- Prefer evidence from the title, description, URL, and obvious domain cues.
- Do not guess libraries or rendering technology unless the source strongly indicates them.
- If unsure, leave a field sparse instead of speculative.

6. Apply the result immediately.
After editing the batch in place, run:

```bash
npm run vault:apply-enrichment -- <batch-file>
```

The default completion path for this skill is:

1. run `vault:prepare-enrichment` to create a fresh all-pending batch
2. pick the newest pending batch unless the user specifies another file
3. enrich every item in that batch
4. set `needs_enrichment` to `false` for sufficiently enriched items
5. set `curation_status` to `enriched` unless a better state is clearly appropriate
6. run `vault:apply-enrichment`
7. report which batch file was applied

Do not stop after analysis if the user clearly wants the enrichment completed.

## Output Rules

### Tags

- Keep `tags` short and retrieval-oriented.
- Prefer 3 to 6 tags.
- Use noun-like terms.

### Chinese Fields

- `title_zh`, `description_zh`, `summary_zh`, `why_it_matters_zh`, and `reusable_idea_zh` should read naturally in Chinese.
- Prefer concise, idiomatic Chinese over literal translation.
- Keep the meaning faithful to the source.

### Categories

- `primary_category` should be a single high-level bucket.
- `secondary_categories` should be 0 to 3 narrower buckets.
- Prefer categories from the taxonomy before inventing new ones.

### Interaction Patterns

- Capture how the user engages with the piece.
- Prefer 0 to 3 values.
- Examples: `drag`, `hover`, `toggle`, `parameter-input`, `randomize`, `scroll-reactive`

### Visual Patterns

- Capture the visual language, not the topic.
- Prefer 0 to 3 values.
- Examples: `layered`, `neon`, `playful`, `editorial`, `grid`, `skeuomorphic`

### Tech Keywords

- Use only when likely supported by evidence.
- Good examples: `css`, `svg`, `canvas`, `webgl`, `gsap`, `threejs`

### Use Cases

- Name the type of future project where the idea could be reused.
- Prefer 1 to 3 values.
- Good examples: `landing-page`, `design-tool`, `portfolio`, `dashboard`, `creative-dev`

### Decision Fields

- `fit_for_projects` should describe the product or site types where this item is most applicable.
- `fit_for_scenes` should describe the specific surface or moment where it belongs, such as a hero, feature section, or onboarding step.
- `complexity_level` should be `low`, `medium`, or `high`.
- `implementation_cost` should be `low`, `medium`, or `high`.
- `platform_fit` should stay concrete, such as `web`, `desktop-web`, or `mobile-web`.
- `novelty_score` uses the same 1-5 scale as `quality_score`, but measures distinctiveness rather than overall value.
- `reuse_confidence` should be `low`, `medium`, or `high`.

### Personal Memory Fields

- `personal_rating` is your own 1-5 preference signal and can stay empty when unknown.
- `favorite` should stay `false` unless the user has clearly indicated strong preference.
- `used_in_projects` should list actual project names only when known.
- `rejected_reason` should stay empty unless there is a concrete reason this should not be reused.
- `revisit_later` should only be `true` when the item seems promising but not yet ready.
- `taste_profile` should capture personal aesthetic fit in short terms, not generic style tags.

### Quality Score

Use a 1-5 scale:

- `1`: weak or generic
- `2`: mildly interesting but not distinctive
- `3`: useful reference
- `4`: strong inspiration with reusable ideas
- `5`: exceptional reference likely worth revisiting often

### Summary

- One sentence
- State what it is, not why you personally like it

### Why It Matters

- One or two sentences
- Explain why it deserves a place in the vault
- Focus on transfer value for future projects

### Reusable Idea

- One or two sentences
- Describe the pattern that could be adapted elsewhere

### Notes

- Optional
- Use for uncertainty, caveats, or especially narrow implementation hints

### Preview Image Fields

- `source_image_path`, `preview_image_path`, `thumbnail_path`, and `hero_image_path` are optional.
- Do not invent asset paths. Leave them blank unless the file already exists or the user explicitly provides one.

### Curation Status

- Use `raw` for untouched imports.
- Use `enriched` after a solid metadata pass.
- Use `reviewed` when the item looks polished enough for future visual presentation.

## Fast Path

If the user asks for quick enrichment:

- fill `tags`
- fill `interaction_patterns`
- fill `visual_patterns`
- set `quality_score`
- write `why_it_matters`
- leave `notes` empty unless needed

## Consistency

- Keep wording compact
- Prefer stable vocabulary over novelty
- Avoid synonyms when an existing taxonomy term fits
- Set `needs_enrichment` to `false` when the item is sufficiently enriched
