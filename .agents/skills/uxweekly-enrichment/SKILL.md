---
name: uxweekly-enrichment
description: Use when enriching 体验碎周报 items in this repo, especially to summarize UX/design weekly links, classify them with UX-weekly-specific taxonomy, and prepare metadata for retrieval in `vault/enrichment/batches/*.json` and `vault/items/uxweekly/**/*.md`.
---

# UX Weekly Enrichment

This skill enriches `uxweekly` entries that come from `ftium4.com` UX Weekly pages. It should not be used for CodePen Spark or iOS Dev Weekly items.

Use this skill when the task is to:

- process all pending `uxweekly` enrichment items from the vault
- summarize UX/design weekly links in Chinese
- classify them with UX-weekly-specific taxonomy
- preserve issue and section context such as `大产品小细节`, `推荐阅读`, `工具资源`, `产品发现`
- write concise reasoning fields such as `summary`, `why_it_matters`, and `reusable_idea`
- automatically apply the enriched result back into the vault

## Workflow

1. Build a fresh batch from the current UX Weekly pending queue:

```bash
npm run vault:prepare-enrichment -- uxweekly
```

2. Read only the newest UX Weekly batch unless the user specifies another file.

3. Read the taxonomy in [references/taxonomy.md](references/taxonomy.md).

4. Fill only enrichment fields.

5. Keep enrichment conservative.
- Treat the Chinese weekly blurb as the main source of truth.
- Do not overwrite source facts such as `item_url`, `issue_id`, or section names.
- If the source title is already clear Chinese, `title_zh` can mirror it with minor cleanup.
- Prefer retrieval-oriented tags over aesthetic freeform phrases.

6. Apply the result immediately:

```bash
npm run vault:apply-enrichment -- <batch-file>
```

## Output Rules

### Categories

- Use UX-weekly-specific high-level categories.
- Prefer taxonomy categories before inventing new ones.

### Tags

- Prefer 3 to 6 tags.
- Keep them useful for retrieval, such as `internationalization`, `figma`, `ux-writing`, `design-system`, `ai-design`, `interaction`.

### Chinese Fields

- Write natural Chinese.
- `summary_zh`, `why_it_matters_zh`, and `reusable_idea_zh` should be compact and useful.

### Decision Fields

- `fit_for_projects` should describe product/design contexts where the idea is useful.
- `fit_for_scenes` should describe moments like interface review, interaction design, design-system work, or discovery.
- `complexity_level` and `implementation_cost` should reflect the likely effort of applying the idea, not the effort of reading it.

### Quality Score

Use `1-5`:

- `1`: weak or generic
- `2`: mildly useful
- `3`: useful reference
- `4`: strong design/product reference
- `5`: excellent reference worth revisiting

### Summary

- One sentence
- State what the link is about

### Why It Matters

- One or two sentences
- Explain why it belongs in the UX/design external brain

### Reusable Idea

- One or two sentences
- Focus on reusable interaction, product, research, or design judgement

## Completion

The default completion path for this skill is:

1. run `vault:prepare-enrichment -- uxweekly`
2. choose the newest UX Weekly batch
3. enrich every item
4. set `needs_enrichment` to `false`
5. set `curation_status` to `enriched`
6. run `vault:apply-enrichment`
7. report which batch file was applied
