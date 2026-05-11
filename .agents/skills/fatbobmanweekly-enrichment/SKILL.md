---
name: fatbobmanweekly-enrichment
description: Use when enriching Fatbobman Swift Weekly items in this repo, especially to summarize Swift, SwiftUI, Apple platform, and developer-tooling newsletter links with a source-specific taxonomy.
---

# Fatbobman Weekly Enrichment

This skill enriches `fatbobmanweekly` entries from `fatbobman.com/zh/weekly/...`.
It should not be used for CodePen Spark, iOS Dev Weekly, or UX Weekly items.

Use this skill when the task is to:

- process all pending `fatbobmanweekly` enrichment items from the vault
- summarize Swift and Apple developer ecosystem links in Chinese
- classify them with Fatbobman-weekly-specific taxonomy
- preserve issue and section context such as `原创`, `近期推荐`, and `工具`
- write concise retrieval fields such as `summary`, `why_it_matters`, and `reusable_idea`
- automatically apply the enriched result back into the vault

## Workflow

1. Build a fresh batch from the current Fatbobman Weekly pending queue:

```bash
npm run vault:prepare-enrichment -- fatbobmanweekly
```

2. Read only the newest Fatbobman Weekly batch unless the user specifies another file.

3. Read the taxonomy in [references/taxonomy.md](references/taxonomy.md).

4. Fill only enrichment fields.

5. Keep enrichment conservative.
- Treat the Chinese weekly blurb as the main source of truth.
- Do not overwrite source facts such as `item_url`, `issue_id`, or section names.
- Prefer retrieval-oriented tags over broad generic labels.
- Do not include job/recruiting entries if they appear.

6. Apply the result immediately:

```bash
npm run vault:apply-enrichment -- <batch-file>
```

## Output Rules

### Categories

- Use Fatbobman-weekly-specific high-level categories.
- Prefer taxonomy categories before inventing new ones.

### Tags

- Prefer 3 to 6 tags.
- Keep them useful for retrieval, such as `swift`, `swiftui`, `xcode`, `ios`, `architecture`, `developer-tooling`, `apple-ecosystem`.

### Chinese Fields

- Write natural Chinese.
- `summary_zh`, `why_it_matters_zh`, and `reusable_idea_zh` should be compact and useful.

### Decision Fields

- `fit_for_projects` should describe app development or engineering contexts where the item is useful.
- `fit_for_scenes` should describe moments like architecture review, debugging, tooling selection, learning, or implementation planning.
- `complexity_level` and `implementation_cost` should reflect the likely effort of applying the idea.

### Quality Score

Use `1-5`:

- `1`: weak or generic
- `2`: mildly useful
- `3`: useful reference
- `4`: strong technical or tooling reference
- `5`: excellent reference worth revisiting

## Completion

The default completion path for this skill is:

1. run `vault:prepare-enrichment -- fatbobmanweekly`
2. choose the newest Fatbobman Weekly batch
3. enrich every item
4. set `needs_enrichment` to `false`
5. set `curation_status` to `enriched`
6. run `vault:apply-enrichment`
7. report which batch file was applied
