---
name: inspiration-briefing
description: Use when turning this repo's inspiration vault into a project-facing brief, especially to shortlist relevant items, group them into directions, and propose reusable interaction or visual approaches for a new product, landing page, feature, or interface concept.
---

# Inspiration Briefing

This skill converts the vault from a passive gallery into a proposal engine.

Use this skill when the user wants:

- project inspiration based on a concrete goal or product idea
- a shortlist of relevant vault items for a new interface
- multiple visual or interaction directions instead of a single recommendation
- a proposal that balances inspiration quality with implementation cost
- recommendations that account for personal preference signals such as favorites, ratings, reuse confidence, or rejected reasons

Do not use this skill for:

- collecting more Spark issues
- filling enrichment fields on raw items
- rewriting source facts

## Workflow

1. Restate the brief in operational terms.
Extract the product type, target mood, implementation constraints, platform, and any stated dislikes.

2. Read the compact vault index first.
Start with `vault/site/data/items.json`. It is the fastest way to scan:
- categories
- tags
- interaction and visual patterns
- decision fields such as `fitForProjects`, `fitForScenes`, `complexityLevel`, `implementationCost`, `platformFit`, `reuseConfidence`
- personal signals such as `favorite`, `personalRating`, `usedInProjects`, `rejectedReason`, `revisitLater`, `tasteProfile`

3. Shortlist candidate items.
Prefer `reviewed` and `enriched` items. Filter out items that conflict with the brief:
- wrong platform
- implementation cost too high
- already rejected for a relevant reason
- obviously mismatched visual language

4. Open Markdown cards only when needed.
Read `vault/items/**/*.md` for a small number of finalists when you need more nuance than the gallery index provides.

5. Produce directions, not just a list.
Default to 3 to 5 directions. Each direction should include:
- a short direction name
- the core idea
- why it fits the brief
- 2 to 4 supporting vault items
- recommended interaction patterns
- recommended visual patterns
- implementation posture: `low`, `medium`, or `high`
- what to avoid

6. Make tradeoffs explicit.
If the strongest references are expensive or platform-misaligned, say so directly and suggest a lower-cost alternative path.

## Output Shape

Unless the user asks for another format, structure the answer like this:

1. Brief read
- one short paragraph summarizing the goal and constraints

2. Recommended directions
- 3 to 5 flat bullets or short subsections
- each direction names the references by `displayTitle` or file-backed title

3. Suggested starting point
- pick one direction as the best default
- explain why it is the best balance of fit, novelty, and cost

## Selection Rules

- Prefer items with strong `reuseConfidence` over merely flashy items.
- Use `qualityScore` and `noveltyScore` together; high novelty alone is not enough.
- Respect `personalRating`, `favorite`, and `rejectedReason` when those fields exist.
- When a field is empty, say you are inferring from the visible metadata.
- Do not recommend an item that has already been used in the same project unless the user wants iteration on an existing direction.

## Fast Path

If the user wants a quick answer:

- read `vault/site/data/items.json`
- shortlist 5 to 8 candidates
- produce 3 directions
- avoid deep Markdown reads unless the metadata is insufficient
