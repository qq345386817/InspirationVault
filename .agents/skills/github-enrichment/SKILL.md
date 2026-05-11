---
name: github-enrichment
description: Use when enriching standalone GitHub repository items in this repo, especially to summarize open-source projects, classify them with a GitHub-project taxonomy, and prepare metadata for retrieval in `vault/enrichment/batches/*.json` and `vault/items/github/**/*.md`.
---

# GitHub Enrichment

This skill enriches `github` entries collected from standalone GitHub repository links.
It should not be used for Spark, iOS Dev Weekly, UX Weekly, or Fatbobman Weekly items.

Use this skill when the task is to:

- process all pending `github` enrichment items from the vault
- summarize repository value in Chinese
- classify GitHub repos with a project/tooling-oriented taxonomy
- preserve source facts such as repo URL, repo name, and extracted description
- write concise retrieval fields such as `summary`, `why_it_matters`, and `reusable_idea`
- automatically apply the enriched result back into the vault

## Workflow

1. Build a fresh batch from the current GitHub pending queue:

```bash
npm run vault:prepare-enrichment -- github
```

2. Read only the newest GitHub batch unless the user specifies another file.

3. Read the taxonomy in [references/taxonomy.md](references/taxonomy.md).

4. Fill only enrichment fields.

5. Keep enrichment conservative.
- Treat the repo description and extracted README 摘要 as the main source of truth.
- Do not invent features that are not visible from the source card.
- Prefer retrieval-oriented tags over vague praise.
- If the repo name is brand-like, `title_zh` can keep the original name.

6. Apply the result immediately:

```bash
npm run vault:apply-enrichment -- <batch-file>
```

## Output Rules

### Categories

- Use GitHub-project-specific high-level categories.
- Prefer taxonomy categories before inventing new ones.

### Tags

- Prefer 3 to 6 tags.
- Keep them useful for retrieval, such as `ai-tooling`, `browser-extension`, `developer-tooling`, `productivity`, `frontend`, `automation`.

### Chinese Fields

- Write natural Chinese.
- `summary_zh`, `why_it_matters_zh`, and `reusable_idea_zh` should be compact and useful.

### Decision Fields

- `fit_for_projects` should describe what kinds of future projects may reuse the repo idea.
- `fit_for_scenes` should describe moments like tooling selection, feature inspiration, prototyping, or workflow automation.
- `complexity_level` and `implementation_cost` should reflect the likely effort of adopting or imitating the repo idea.

### Quality Score

Use `1-5`:

- `1`: weak or generic
- `2`: mildly useful
- `3`: useful reference
- `4`: strong repo or tool reference
- `5`: excellent repo worth revisiting

## Completion

The default completion path for this skill is:

1. run `vault:prepare-enrichment -- github`
2. choose the newest GitHub batch
3. enrich every item
4. set `needs_enrichment` to `false`
5. set `curation_status` to `enriched`
6. run `vault:apply-enrichment`
7. report which batch file was applied
