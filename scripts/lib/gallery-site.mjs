import fs from "node:fs/promises";
import path from "node:path";
import { vaultRoot } from "./vault.mjs";
import { parseJsonArray } from "./normalize.mjs";

const siteRoot = path.join(vaultRoot, "site");
const dataRoot = path.join(siteRoot, "data");
const sparkPath = path.join(siteRoot, "spark.html");
const weeklyPath = path.join(siteRoot, "weekly.html");
const uxWeeklyPath = path.join(siteRoot, "ux-weekly.html");
const fatbobmanWeeklyPath = path.join(siteRoot, "fatbobman-weekly.html");
const githubPath = path.join(siteRoot, "github.html");

const statusOrder = {
  reviewed: 0,
  enriched: 1,
  raw: 2
};

const categoryLabels = {
  uncategorized: "未分类",
  "challenge-collection": "挑战合集",
  "architecture-patterns": "架构模式",
  "business-career": "商业与职业",
  "component-pattern": "组件模式",
  "creative-coding": "创意编码",
  "data-visualization": "数据可视化",
  "design-ops": "设计流程",
  "design-principle": "设计原则",
  "editorial-ui": "编辑式界面",
  "editorial-observation": "观察与评论",
  "ecosystem-news": "生态新闻",
  "engineering-practice": "工程实践",
  "form-ui": "表单界面",
  "graphics-xr": "图形与 XR",
  "interaction-pattern": "交互模式",
  "interaction-demo": "交互演示",
  internationalization: "国际化",
  layout: "布局系统",
  motion: "动态设计",
  navigation: "导航设计",
  "platform-development": "平台开发",
  "product-case-study": "产品案例",
  "product-discovery": "产品发现",
  "reading-note": "阅读摘要",
  "tool-resource": "工具资源",
  "tooling-workflow": "工具与工作流",
  "visual-craft": "视觉细节",
  "visual-system": "视觉系统"
};

const sourceLabels = {
  codepen: "CodePen Spark",
  iosdevweekly: "iOS Dev Weekly",
  uxweekly: "体验碎周报",
  fatbobmanweekly: "肘子的 Swift 周报",
  github: "GitHub 项目"
};

const hashString = (value) => {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const normalizeStatus = (value) => {
  const status = String(value || "raw").toLowerCase();
  return ["reviewed", "enriched", "raw"].includes(status) ? status : "raw";
};

const resolveSiteAssetPath = (assetPath) => {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  if (path.isAbsolute(assetPath)) {
    const relative = path.relative(siteRoot, assetPath);
    if (!relative.startsWith("..")) {
      return relative.split(path.sep).join("/");
    }
    return "";
  }
  return path.posix.join("..", assetPath.replace(/\\/g, "/"));
};

const selectPreviewImage = (row) =>
  resolveSiteAssetPath(
    row.thumbnail_path ||
      row.preview_image_path ||
      row.hero_image_path ||
      row.source_image_path ||
      row.screenshot_path
  );

const displayTitle = (row) => row.title_zh || row.title;

const displaySummary = (row) =>
  row.summary_zh ||
  row.summary ||
  row.why_it_matters_zh ||
  row.why_it_matters ||
  row.description_zh ||
  row.description ||
  "";

const toItemPayload = (row) => {
  const title = displayTitle(row);
  const hash = hashString(row.id);
  const hueA = hash % 360;
  const hueB = (hash + 48) % 360;
  const category = row.primary_category || "uncategorized";
  const secondaryCategories = parseJsonArray(row.secondary_categories_json);
  const tags = parseJsonArray(row.tags_json);
  const interactionPatterns = parseJsonArray(row.interaction_patterns_json);
  const visualPatterns = parseJsonArray(row.visual_patterns_json);
  const techKeywords = parseJsonArray(row.tech_keywords_json);
  const useCases = parseJsonArray(row.use_cases_json);
  const fitForProjects = parseJsonArray(row.fit_for_projects_json);
  const fitForScenes = parseJsonArray(row.fit_for_scenes_json);
  const platformFit = parseJsonArray(row.platform_fit_json);
  const usedInProjects = parseJsonArray(row.used_in_projects_json);
  const tasteProfile = parseJsonArray(row.taste_profile_json);
  const qualityScore =
    row.quality_score === null || row.quality_score === undefined
      ? null
      : Number(row.quality_score);
  const noveltyScore =
    row.novelty_score === null || row.novelty_score === undefined
      ? null
      : Number(row.novelty_score);
  const personalRating =
    row.personal_rating === null || row.personal_rating === undefined
      ? null
      : Number(row.personal_rating);
  const status = normalizeStatus(row.curation_status);

  return {
    id: row.id,
    title: row.title,
    titleZh: row.title_zh,
    displayTitle: title,
    description: row.description,
    descriptionZh: row.description_zh,
    summary: row.summary,
    summaryZh: row.summary_zh,
    displaySummary: displaySummary(row),
    whyItMatters: row.why_it_matters,
    whyItMattersZh: row.why_it_matters_zh,
    reusableIdea: row.reusable_idea,
    reusableIdeaZh: row.reusable_idea_zh,
    itemUrl: row.item_url,
    issueId: row.issue_id,
    issueTitle: row.issue_title,
    issueUrl: row.issue_url,
    itemType: row.item_type || "",
    sourceName: row.source_name,
    sourceLabel: sourceLabels[row.source_name] || row.source_name,
    sourceSectionName: row.source_section_name || "",
    sourceSectionSlug: row.source_section_slug || "",
    positionInIssue:
      row.position_in_issue === null || row.position_in_issue === undefined
        ? null
        : Number(row.position_in_issue),
    positionInSection:
      row.position_in_section === null || row.position_in_section === undefined
        ? null
        : Number(row.position_in_section),
    isSponsored: Boolean(row.is_sponsored),
    publishedAt: row.published_at || "",
    sourceImageUrl: row.source_image_url || "",
    imageSourceType: row.image_source_type || "",
    category,
    secondaryCategories,
    tags,
    interactionPatterns,
    visualPatterns,
    techKeywords,
    useCases,
    fitForProjects,
    fitForScenes,
    complexityLevel: row.complexity_level || "",
    implementationCost: row.implementation_cost || "",
    platformFit,
    noveltyScore,
    reuseConfidence: row.reuse_confidence || "",
    personalRating,
    favorite: Boolean(row.favorite),
    usedInProjects,
    rejectedReason: row.rejected_reason || "",
    revisitLater: Boolean(row.revisit_later),
    tasteProfile,
    qualityScore,
    curationStatus: status,
    previewImage: selectPreviewImage(row),
    sourceImagePath: resolveSiteAssetPath(row.source_image_path),
    screenshotPath: resolveSiteAssetPath(row.screenshot_path),
    previewImagePath: resolveSiteAssetPath(row.preview_image_path),
    thumbnailPath: resolveSiteAssetPath(row.thumbnail_path),
    heroImagePath: resolveSiteAssetPath(row.hero_image_path),
    markdownPath: path.posix.join("..", row.markdown_path.replace(/\\/g, "/")),
    collectedAt: row.collected_at,
    updatedAt: row.updated_at,
    placeholder: {
      hueA,
      hueB,
      label: title.slice(0, 2).toUpperCase()
    }
  };
};

const compareItems = (left, right) => {
  const statusDelta = (statusOrder[left.curationStatus] ?? 9) - (statusOrder[right.curationStatus] ?? 9);
  if (statusDelta !== 0) return statusDelta;

  const favoriteDelta = Number(right.favorite) - Number(left.favorite);
  if (favoriteDelta !== 0) return favoriteDelta;

  const personalLeft = left.personalRating ?? -1;
  const personalRight = right.personalRating ?? -1;
  if (personalLeft !== personalRight) return personalRight - personalLeft;

  const scoreLeft = left.qualityScore ?? -1;
  const scoreRight = right.qualityScore ?? -1;
  if (scoreLeft !== scoreRight) return scoreRight - scoreLeft;

  return right.updatedAt.localeCompare(left.updatedAt);
};

export const loadGalleryData = (db) => {
  const rows = db
    .prepare(`
      SELECT
        id,
        source_name,
        issue_id,
        issue_title,
        issue_url,
        published_at,
        item_url,
        item_type,
        title,
        title_zh,
        description,
        description_zh,
        summary,
        summary_zh,
        why_it_matters,
        why_it_matters_zh,
        reusable_idea,
        reusable_idea_zh,
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
        source_image_url,
        image_source_type,
        source_image_path,
        source_section_name,
        source_section_slug,
        position_in_issue,
        position_in_section,
        is_sponsored,
        screenshot_path,
        preview_image_path,
        thumbnail_path,
        hero_image_path,
        curation_status,
        markdown_path,
        collected_at,
        updated_at
      FROM items
      ORDER BY updated_at DESC, title ASC
    `)
    .all();

  const items = rows.map(toItemPayload).sort(compareItems);
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const sections = Array.from(
    new Set(items.map((item) => item.sourceSectionName).filter(Boolean))
  ).sort();
  const sources = Array.from(new Set(items.map((item) => item.sourceName))).sort();
  const statuses = Array.from(new Set(items.map((item) => item.curationStatus))).sort(
    (left, right) => (statusOrder[left] ?? 9) - (statusOrder[right] ?? 9)
  );

  return {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    categories,
    sections,
    sources,
    statuses,
    items
  };
};

const filterGalleryData = (data, sourceName) => {
  const items = data.items.filter((item) => item.sourceName === sourceName);
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const sections = Array.from(
    new Set(items.map((item) => item.sourceSectionName).filter(Boolean))
  ).sort();
  const sources = Array.from(new Set(items.map((item) => item.sourceName))).sort();
  const statuses = Array.from(new Set(items.map((item) => item.curationStatus))).sort(
    (left, right) => (statusOrder[left] ?? 9) - (statusOrder[right] ?? 9)
  );

  return {
    generatedAt: data.generatedAt,
    totalItems: items.length,
    categories,
    sections,
    sources,
    statuses,
    items
  };
};

const renderIndexHtml = (data, page = {}) => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${page.title || "Inspiration Vault"}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="shell">
      <header class="hero">
        <p class="eyebrow">Inspiration Vault</p>
        <div class="hero-grid">
          <div>
            <h1>${page.heading || "灵感画廊"}</h1>
            <p class="hero-copy">
              ${page.copy || "面向未来项目的外脑库。这里同时聚合了 CodePen Spark 的灵感条目和 iOS Dev Weekly 的周报链接，并逐步补齐中文、分类、可复用思路和预览素材。"}
            </p>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-label">Total Items</span>
              <span class="stat-value" id="stat-total">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">${
                page.statsLabel ||
                (page.showIssueContext ? "Sections / Categories" : "Categories / Sources")
              }</span>
              <span class="stat-value" id="stat-categories">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Updated</span>
              <span class="stat-value stat-small" id="stat-updated">-</span>
            </div>
          </div>
        </div>
      </header>

      <section class="toolbar">
        <label class="search">
          <span>Search</span>
          <input id="search-input" type="search" placeholder="${page.searchPlaceholder || "搜索标题、中文摘要、标签、分类"}" />
        </label>
        ${page.showSourceFilter === false
          ? ""
          : `<label class="filter">
          <span>Source</span>
          <select id="source-filter">
            <option value="">All</option>
          </select>
        </label>`}
        ${page.showSponsoredFilter
          ? `<label class="filter">
          <span>Sponsored</span>
          <select id="sponsored-filter">
            <option value="">All</option>
            <option value="organic">Organic Only</option>
            <option value="sponsored">Sponsored Only</option>
          </select>
        </label>`
          : ""}
        <label class="filter">
          <span>Status</span>
          <select id="status-filter">
            <option value="">All</option>
          </select>
        </label>
        <label class="filter">
          <span>Sort</span>
          <select id="sort-filter">
            <option value="recommended">Recommended</option>
            <option value="newest">Newest</option>
            <option value="quality">Top Quality</option>
            <option value="novelty">Most Novel</option>
            <option value="easy">Lowest Cost</option>
          </select>
        </label>
      </section>

      ${page.showSectionChips
        ? `<section class="chips" id="section-chips"></section>`
        : ""}
      <section class="chips" id="category-chips"></section>
      <section class="results-bar">
        <div class="results-copy">
          <p class="results-title" id="results-title">全部灵感</p>
          <p class="results-meta" id="results-meta">0 条结果</p>
        </div>
        <div class="page-actions">
          <button class="page-button" id="page-prev" type="button">上一页</button>
          <p class="page-meta" id="page-meta">第 1 / 1 页</p>
          <button class="page-button" id="page-next" type="button">下一页</button>
        </div>
      </section>
      <section class="gallery" id="gallery"></section>
      <section class="pagination" id="pagination"></section>
    </div>

    <dialog class="detail" id="detail-dialog">
      <form method="dialog" class="detail-close-wrap">
        <button class="detail-close" aria-label="Close">×</button>
      </form>
      <div class="detail-body" id="detail-body"></div>
    </dialog>

    <script id="vault-data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
    <script id="vault-page-config" type="application/json">${JSON.stringify(page).replace(/</g, "\\u003c")}</script>
    <script type="module">${appJs.replace(/<\/script>/gi, "<\\/script>")}</script>
  </body>
</html>
`;

const renderHomeHtml = (data) => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inspiration Vault</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="shell">
      <header class="hero">
        <p class="eyebrow">Inspiration Vault</p>
        <div class="hero-grid">
          <div>
            <h1>内容入口</h1>
            <p class="hero-copy">
              这个外脑库已经拆成五条独立内容线：交互与视觉灵感、iOS 技术周报、体验设计周报、Swift 开发生态周报，以及 GitHub 开源项目。它们现在使用不同页面入口，不再混在同一张内容墙里。
            </p>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-label">Sources</span>
              <span class="stat-value">${data.sources.length}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Total Items</span>
              <span class="stat-value">${data.totalItems}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Updated</span>
              <span class="stat-value stat-small">${new Date(data.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <section class="gallery" style="margin-top: 24px;">
        <a class="card" href="./spark.html" style="text-decoration:none;color:inherit;">
          <div class="card-cover" style="--hue-a: 22; --hue-b: 58;">
            <div class="placeholder">SP</div>
          </div>
          <div class="card-meta">
            <span class="badge">CodePen Spark</span>
          </div>
          <div>
            <h2>Spark 灵感库</h2>
            <p class="subtitle">交互、视觉、创意编码</p>
          </div>
          <p class="summary">浏览 CodePen Spark 收集来的灵感条目、配图、中文摘要和可复用交互模式。</p>
        </a>

        <a class="card" href="./weekly.html" style="text-decoration:none;color:inherit;">
          <div class="card-cover" style="--hue-a: 194; --hue-b: 232;">
            <div class="placeholder">WK</div>
          </div>
          <div class="card-meta">
            <span class="badge">iOS Dev Weekly</span>
          </div>
          <div>
            <h2>Weekly 技术周报</h2>
            <p class="subtitle">iOS、Swift、工具、工程实践</p>
          </div>
          <p class="summary">浏览 iOS Dev Weekly 收集来的技术条目、栏目上下文、中文整理和工程决策价值。</p>
        </a>

        <a class="card" href="./ux-weekly.html" style="text-decoration:none;color:inherit;">
          <div class="card-cover" style="--hue-a: 138; --hue-b: 176;">
            <div class="placeholder">UX</div>
          </div>
          <div class="card-meta">
            <span class="badge">体验碎周报</span>
          </div>
          <div>
            <h2>UX 周报</h2>
            <p class="subtitle">体验设计、交互案例、工具资源</p>
          </div>
          <p class="summary">浏览体验碎周报收集来的产品细节、推荐阅读、工具资源与产品发现条目。</p>
        </a>

        <a class="card" href="./fatbobman-weekly.html" style="text-decoration:none;color:inherit;">
          <div class="card-cover" style="--hue-a: 278; --hue-b: 316;">
            <div class="placeholder">SW</div>
          </div>
          <div class="card-meta">
            <span class="badge">肘子的 Swift 周报</span>
          </div>
          <div>
            <h2>Swift 周报</h2>
            <p class="subtitle">Swift、SwiftUI、Apple 开发生态</p>
          </div>
          <p class="summary">浏览 Fatbobman 周报收集来的 Swift 技术文章、推荐阅读和开发工具条目。</p>
        </a>

        <a class="card" href="./github.html" style="text-decoration:none;color:inherit;">
          <div class="card-cover" style="--hue-a: 210; --hue-b: 246;">
            <div class="placeholder">GH</div>
          </div>
          <div class="card-meta">
            <span class="badge">GitHub</span>
          </div>
          <div>
            <h2>GitHub 项目库</h2>
            <p class="subtitle">开源项目、工具、产品原型</p>
          </div>
          <p class="summary">浏览单独收集的 GitHub repo，沉淀值得跟踪的开源工具、产品形态、实现思路与可复用资产。</p>
        </a>
      </section>
    </div>
  </body>
</html>
`;

const stylesCss = `:root {
  --bg: #f6f0e7;
  --panel: rgba(255, 252, 246, 0.88);
  --panel-strong: #fffaf2;
  --ink: #1b1b19;
  --muted: #5e5a55;
  --line: rgba(27, 27, 25, 0.12);
  --accent: #c55d2d;
  --accent-2: #f2c14e;
  --shadow: 0 18px 40px rgba(30, 22, 12, 0.12);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--ink);
  background:
    radial-gradient(circle at top left, rgba(242, 193, 78, 0.22), transparent 28%),
    radial-gradient(circle at right 15%, rgba(197, 93, 45, 0.14), transparent 22%),
    linear-gradient(180deg, #f9f5ee 0%, var(--bg) 100%);
  font: 15px/1.55 "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
}

.shell {
  width: min(1340px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.hero {
  padding: 34px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 250, 242, 0.95), rgba(255, 247, 235, 0.78));
  box-shadow: var(--shadow);
}

.eyebrow {
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 12px;
  color: var(--accent);
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
  gap: 24px;
}

h1 {
  margin: 0 0 14px;
  font: 700 clamp(32px, 5vw, 60px)/0.95 "Georgia", "Times New Roman", serif;
}

.hero-copy {
  max-width: 62ch;
  margin: 0;
  color: var(--muted);
  font-size: 16px;
}

.hero-stats {
  display: grid;
  gap: 12px;
}

.stat {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.7);
}

.stat-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.stat-value {
  display: block;
  font: 700 28px/1 "Georgia", "Times New Roman", serif;
}

.stat-small {
  font-size: 17px;
  line-height: 1.3;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px 190px 200px;
  gap: 14px;
  margin: 22px 0 12px;
}

.search,
.filter {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--panel);
  backdrop-filter: blur(10px);
}

.search span,
.filter span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

input,
select {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font: inherit;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--ink);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.chip:hover,
.chip[data-active="true"] {
  transform: translateY(-1px);
  border-color: rgba(197, 93, 45, 0.35);
  background: rgba(242, 193, 78, 0.22);
}

.results-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.results-title {
  margin: 0;
  font: 700 26px/1.05 "Georgia", "Times New Roman", serif;
}

.results-meta,
.page-meta {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.page-actions,
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.page-button {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 14px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, opacity 160ms ease;
}

.page-button:hover:not(:disabled),
.page-button[data-active="true"] {
  transform: translateY(-1px);
  border-color: rgba(197, 93, 45, 0.35);
  background: rgba(242, 193, 78, 0.22);
}

.page-button:disabled {
  cursor: default;
  opacity: 0.45;
}

.pagination {
  justify-content: center;
  margin-top: 22px;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.card {
  display: grid;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 14px;
  background: var(--panel);
  box-shadow: 0 10px 24px rgba(30, 22, 12, 0.08);
  backdrop-filter: blur(14px);
  cursor: pointer;
}

.card:hover {
  transform: translateY(-2px);
}

.card.card-text {
  gap: 10px;
}

.card-cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  background: linear-gradient(135deg, hsl(var(--hue-a) 70% 78%), hsl(var(--hue-b) 80% 68%));
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 700 42px/1 "Georgia", "Times New Roman", serif;
  color: rgba(24, 24, 24, 0.55);
}

.card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.badge {
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(27, 27, 25, 0.06);
  color: var(--muted);
  font-size: 12px;
}

.badge.status-reviewed {
  background: rgba(72, 133, 75, 0.12);
  color: #356334;
}

.badge.status-enriched {
  background: rgba(197, 93, 45, 0.12);
  color: #974720;
}

.card h2 {
  margin: 0;
  font: 700 23px/1.08 "Georgia", "Times New Roman", serif;
}

.card .subtitle {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.card .context {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.01em;
}

.card .summary {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
}

.detail {
  width: min(960px, calc(100vw - 24px));
  border: 0;
  border-radius: 28px;
  padding: 18px;
  background: var(--panel-strong);
  box-shadow: var(--shadow);
}

.detail::backdrop {
  background: rgba(16, 15, 12, 0.35);
  backdrop-filter: blur(4px);
}

.detail-close-wrap {
  display: flex;
  justify-content: flex-end;
  margin: 0;
}

.detail-close {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: rgba(27, 27, 25, 0.08);
  font-size: 26px;
  cursor: pointer;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 24px;
}

.detail-grid.detail-grid-single {
  grid-template-columns: 1fr;
}

.detail-image {
  overflow: hidden;
  border-radius: 20px;
  min-height: 320px;
  background: linear-gradient(135deg, hsl(var(--hue-a) 70% 78%), hsl(var(--hue-b) 80% 68%));
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-copy h2 {
  margin: 0 0 10px;
  font: 700 clamp(28px, 4vw, 46px)/0.94 "Georgia", "Times New Roman", serif;
}

.detail-copy p {
  margin: 0 0 12px;
}

.detail-section {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.detail-label {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.detail-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.detail-links a {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid rgba(27, 27, 25, 0.22);
}

.empty {
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--muted);
  text-align: center;
}

@media (max-width: 900px) {
  .hero-grid,
  .detail-grid,
  .toolbar {
    grid-template-columns: 1fr;
  }
}
`;

const appJs = `const state = {
  data: null,
  view: null,
  search: "",
  source: "",
  section: "",
  sponsored: "",
  category: "",
  status: "",
  sort: "recommended",
  page: 1,
  pageSize: 24
};

const categoryLabels = ${JSON.stringify(categoryLabels)};
const sourceLabels = ${JSON.stringify(sourceLabels)};

const galleryNode = document.querySelector("#gallery");
const categoryChipsNode = document.querySelector("#category-chips");
const sectionChipsNode = document.querySelector("#section-chips");
const searchInput = document.querySelector("#search-input");
const sourceFilter = document.querySelector("#source-filter");
const sponsoredFilter = document.querySelector("#sponsored-filter");
const statusFilter = document.querySelector("#status-filter");
const sortFilter = document.querySelector("#sort-filter");
const resultsTitleNode = document.querySelector("#results-title");
const resultsMetaNode = document.querySelector("#results-meta");
const pageMetaNode = document.querySelector("#page-meta");
const paginationNode = document.querySelector("#pagination");
const prevButton = document.querySelector("#page-prev");
const nextButton = document.querySelector("#page-next");
const dialog = document.querySelector("#detail-dialog");
const detailBody = document.querySelector("#detail-body");

const complexityOrder = {
  low: 0,
  medium: 1,
  high: 2
};

const costOrder = {
  low: 0,
  medium: 1,
  high: 2
};

const categoryLabel = (value) => categoryLabels[value] || value || categoryLabels.uncategorized;
const sourceLabel = (value) => sourceLabels[value] || value || "Unknown";
const usesIssueContext = () => Boolean(state.view?.showIssueContext);
const statsLabelText = () =>
  state.view?.statsLabel ||
  (usesIssueContext() ? "Sections / Categories" : "Categories / Sources");
const defaultResultsTitle = () =>
  state.view?.defaultResultsTitle ||
  (usesIssueContext() ? "全部周报条目" : "全部灵感");
const sectionLabel = (value) => value || "未分栏";
const formatPublished = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const setStats = (data) => {
  const statLabelNode = document.querySelector(".hero-stats .stat:nth-child(2) .stat-label");
  if (statLabelNode) {
    statLabelNode.textContent = statsLabelText();
  }
  document.querySelector("#stat-total").textContent = String(data.totalItems);
  const statNode = document.querySelector("#stat-categories");
  statNode.textContent = usesIssueContext()
    ? \`\${data.sections.length} / \${data.categories.length}\`
    : \`\${data.categories.length} / \${data.sources.length}\`;
  document.querySelector("#stat-updated").textContent = new Date(data.generatedAt).toLocaleString();
};

const matches = (item) => {
  const haystack = [
    item.displayTitle,
    item.title,
    item.titleZh,
    item.displaySummary,
    item.description,
    item.descriptionZh,
    item.sourceLabel,
    item.sourceSectionName,
    item.issueTitle,
    item.category,
    ...item.secondaryCategories,
    ...item.tags,
    ...item.interactionPatterns,
    ...item.visualPatterns,
    ...item.useCases,
    ...item.fitForProjects,
    ...item.fitForScenes,
    ...item.platformFit,
    ...item.usedInProjects,
    ...item.tasteProfile,
    item.complexityLevel,
    item.implementationCost,
    item.reuseConfidence,
    item.rejectedReason
  ]
    .join(" ")
    .toLowerCase();

  if (state.search && !haystack.includes(state.search)) return false;
  if (state.source && item.sourceName !== state.source) return false;
  if (state.section && item.sourceSectionName !== state.section) return false;
  if (state.sponsored === "organic" && item.isSponsored) return false;
  if (state.sponsored === "sponsored" && !item.isSponsored) return false;
  if (state.category && item.category !== state.category) return false;
  if (state.status && item.curationStatus !== state.status) return false;
  return true;
};

const badge = (label, extraClass = "") => \`<span class="badge \${extraClass}">\${label}</span>\`;

const renderChips = (data) => {
  const counts = new Map();
  data.items.forEach((item) => {
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  });
  const chips = [
    { label: \`All · \${data.totalItems}\`, value: "" },
    ...data.categories.map((category) => ({
      label: \`\${categoryLabel(category)} · \${counts.get(category) || 0}\`,
      value: category
    }))
  ];

  categoryChipsNode.innerHTML = chips
    .map(
      (chip) =>
        \`<button class="chip" data-value="\${chip.value}" data-active="\${chip.value === state.category}">\${chip.label}</button>\`
    )
    .join("");

  categoryChipsNode.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.value || "";
      state.page = 1;
      render();
    });
  });
};

const renderSectionChips = (data) => {
  if (!sectionChipsNode) return;

  const counts = new Map();
  data.items.forEach((item) => {
    if (!item.sourceSectionName) return;
    counts.set(item.sourceSectionName, (counts.get(item.sourceSectionName) || 0) + 1);
  });

  const chips = [
    { label: \`All Sections · \${data.totalItems}\`, value: "" },
    ...data.sections.map((section) => ({
      label: \`\${sectionLabel(section)} · \${counts.get(section) || 0}\`,
      value: section
    }))
  ];

  sectionChipsNode.innerHTML = chips
    .map(
      (chip) =>
        \`<button class="chip" data-value="\${chip.value}" data-active="\${chip.value === state.section}">\${chip.label}</button>\`
    )
    .join("");

  sectionChipsNode.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.section = button.dataset.value || "";
      state.page = 1;
      render();
    });
  });
};

const renderStatusOptions = (data) => {
  statusFilter.innerHTML =
    '<option value="">All</option>' +
    data.statuses.map((status) => \`<option value="\${status}">\${status}</option>\`).join("");
  statusFilter.value = state.status;
};

const renderSourceOptions = (data) => {
  if (!sourceFilter) return;
  sourceFilter.innerHTML =
    '<option value="">All</option>' +
    data.sources.map((source) => \`<option value="\${source}">\${sourceLabel(source)}</option>\`).join("");
  sourceFilter.value = state.source;
};

const renderSponsoredOptions = () => {
  if (!sponsoredFilter) return;
  sponsoredFilter.value = state.sponsored;
};

const renderSortOptions = () => {
  sortFilter.value = state.sort;
};

const shouldShowImages = () => state.view?.showImages !== false;

const imageMarkup = (item, className) => {
  if (item.previewImage) {
    return \`<img src="\${item.previewImage}" alt="">\`;
  }
  return \`<div class="placeholder">\${item.placeholder.label}</div>\`;
};

const detailSection = (label, value) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return "";
  const body = Array.isArray(value) ? value.join(" · ") : value;
  return \`
    <section class="detail-section">
      <p class="detail-label">\${label}</p>
      <p>\${body}</p>
    </section>
  \`;
};

const compareRecommended = (left, right) => {
  const statusOrder = { reviewed: 0, enriched: 1, raw: 2 };
  const statusDelta = (statusOrder[left.curationStatus] ?? 9) - (statusOrder[right.curationStatus] ?? 9);
  if (statusDelta !== 0) return statusDelta;

  const favoriteDelta = Number(right.favorite) - Number(left.favorite);
  if (favoriteDelta !== 0) return favoriteDelta;

  const personalLeft = left.personalRating ?? -1;
  const personalRight = right.personalRating ?? -1;
  if (personalLeft !== personalRight) return personalRight - personalLeft;

  const scoreLeft = left.qualityScore ?? -1;
  const scoreRight = right.qualityScore ?? -1;
  if (scoreLeft !== scoreRight) return scoreRight - scoreLeft;

  return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
};

const sortItems = (items) => {
  const sorted = [...items];

  if (state.sort === "newest") {
    return sorted.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
  }

  if (state.sort === "quality") {
    return sorted.sort((left, right) => {
      const scoreDelta = (right.qualityScore ?? -1) - (left.qualityScore ?? -1);
      if (scoreDelta !== 0) return scoreDelta;
      return compareRecommended(left, right);
    });
  }

  if (state.sort === "novelty") {
    return sorted.sort((left, right) => {
      const noveltyDelta = (right.noveltyScore ?? -1) - (left.noveltyScore ?? -1);
      if (noveltyDelta !== 0) return noveltyDelta;
      return compareRecommended(left, right);
    });
  }

  if (state.sort === "easy") {
    return sorted.sort((left, right) => {
      const costDelta = (costOrder[left.implementationCost] ?? 9) - (costOrder[right.implementationCost] ?? 9);
      if (costDelta !== 0) return costDelta;
      const complexityDelta = (complexityOrder[left.complexityLevel] ?? 9) - (complexityOrder[right.complexityLevel] ?? 9);
      if (complexityDelta !== 0) return complexityDelta;
      return compareRecommended(left, right);
    });
  }

  return sorted.sort(compareRecommended);
};

const paginateItems = (items) => {
  const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  return {
    totalPages,
    pageItems: items.slice(start, start + state.pageSize)
  };
};

const renderResultsBar = (items, totalPages) => {
  const title =
    [
      state.source ? sourceLabel(state.source) : "",
      state.section ? sectionLabel(state.section) : "",
      state.category ? categoryLabel(state.category) : ""
    ]
      .filter(Boolean)
      .join(" · ") || defaultResultsTitle();
  const start = items.length ? (state.page - 1) * state.pageSize + 1 : 0;
  const end = items.length ? Math.min(start + state.pageSize - 1, items.length) : 0;
  resultsTitleNode.textContent = title;
  resultsMetaNode.textContent = items.length
    ? \`共 \${items.length} 条，当前显示 \${start}-\${end} 条\`
    : "当前没有匹配结果";
  pageMetaNode.textContent = \`第 \${state.page} / \${totalPages} 页\`;
  prevButton.disabled = state.page <= 1;
  nextButton.disabled = state.page >= totalPages;
};

const renderPagination = (totalPages) => {
  if (totalPages <= 1) {
    paginationNode.innerHTML = "";
    return;
  }

  const pages = [];
  const start = Math.max(1, state.page - 2);
  const end = Math.min(totalPages, state.page + 2);

  if (start > 1) pages.push(1);
  if (start > 2) pages.push("ellipsis-left");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("ellipsis-right");
  if (end < totalPages) pages.push(totalPages);

  paginationNode.innerHTML = pages
    .map((entry) => {
      if (String(entry).startsWith("ellipsis")) {
        return '<span class="page-meta">…</span>';
      }
      return \`<button class="page-button" type="button" data-page="\${entry}" data-active="\${Number(entry) === state.page}">\${entry}</button>\`;
    })
    .join("");

  paginationNode.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = Number(button.dataset.page);
      render();
    });
  });
};

const openDetail = (item) => {
  const showImages = shouldShowImages();
  const detailContext = usesIssueContext()
    ? [item.sourceSectionName, item.issueTitle, formatPublished(item.publishedAt)].filter(Boolean).join(" · ")
    : [item.sourceSectionName, item.issueTitle].filter(Boolean).join(" · ");
  detailBody.innerHTML = \`
    <div class="detail-grid \${showImages ? "" : "detail-grid-single"}">
      \${showImages
        ? \`<div class="detail-image" style="--hue-a: \${item.placeholder.hueA}; --hue-b: \${item.placeholder.hueB};">
        \${imageMarkup(item)}
      </div>\`
        : ""}
      <div class="detail-copy">
        <div class="card-meta">
          \${badge(item.sourceLabel)}
          \${badge(categoryLabel(item.category))}
          \${badge(item.curationStatus, 'status-' + item.curationStatus)}
          \${item.isSponsored ? badge('Sponsored') : ""}
          \${item.qualityScore ? badge('Score ' + item.qualityScore) : ""}
        </div>
        <h2>\${item.displayTitle}</h2>
        <p class="subtitle">\${detailContext || (item.titleZh && item.title ? item.title : "")}</p>
        <p>\${item.displaySummary || "暂无摘要。"}</p>
        \${usesIssueContext() ? detailSection("Issue", item.issueTitle) : detailSection("Source", item.sourceLabel)}
        \${detailSection("Section", item.sourceSectionName)}
        \${detailSection("Published", formatPublished(item.publishedAt))}
        \${detailSection("Why It Matters", item.whyItMattersZh || item.whyItMatters)}
        \${detailSection("Reusable Idea", item.reusableIdeaZh || item.reusableIdea)}
        \${detailSection("Tags", item.tags)}
        \${detailSection("Secondary Categories", item.secondaryCategories)}
        \${detailSection("Interaction", item.interactionPatterns)}
        \${detailSection("Visual", item.visualPatterns)}
        \${detailSection("Use Cases", item.useCases)}
        \${detailSection("Fit For Projects", item.fitForProjects)}
        \${detailSection("Fit For Scenes", item.fitForScenes)}
        \${detailSection("Platform Fit", item.platformFit)}
        \${detailSection("Complexity", item.complexityLevel)}
        \${detailSection("Implementation Cost", item.implementationCost)}
        \${detailSection("Novelty Score", item.noveltyScore)}
        \${detailSection("Reuse Confidence", item.reuseConfidence)}
        \${detailSection("Personal Rating", item.personalRating)}
        \${detailSection("Favorite", item.favorite ? "yes" : "")}
        \${detailSection("Revisit Later", item.revisitLater ? "yes" : "")}
        \${detailSection("Taste Profile", item.tasteProfile)}
        \${detailSection("Used In Projects", item.usedInProjects)}
        \${detailSection("Rejected Reason", item.rejectedReason)}
        <div class="detail-links">
          <a href="\${item.itemUrl}" target="_blank" rel="noreferrer">Open Source</a>
          <a href="\${item.issueUrl}" target="_blank" rel="noreferrer">Open Issue</a>
          <a href="\${item.markdownPath}" target="_blank" rel="noreferrer">Open Markdown</a>
        </div>
      </div>
    </div>
  \`;
  dialog.showModal();
};

const renderCards = (items) => {
  if (!items.length) {
    galleryNode.innerHTML = '<div class="empty">当前筛选条件下没有条目。</div>';
    return;
  }

  const showImages = shouldShowImages();
  galleryNode.innerHTML = items
    .map(
      (item) => {
        const cardSubtitle =
          usesIssueContext()
            ? [item.sourceSectionName, item.issueTitle].filter(Boolean).join(" · ")
            : ([item.sourceSectionName, item.issueTitle].filter(Boolean).join(' · ') || (item.titleZh && item.title ? item.title : item.issueTitle));
        const cardContext =
          usesIssueContext()
            ? [formatPublished(item.publishedAt), item.isSponsored ? "Sponsored" : ""].filter(Boolean).join(" · ")
            : "";

        return \`
        <article class="card \${showImages ? "" : "card-text"}" data-id="\${item.id}">
          \${showImages
            ? \`<div class="card-cover" style="--hue-a: \${item.placeholder.hueA}; --hue-b: \${item.placeholder.hueB};">
            \${imageMarkup(item)}
          </div>\`
            : ""}
          <div class="card-meta">
            \${usesIssueContext() ? "" : badge(item.sourceLabel)}
            \${badge(categoryLabel(item.category))}
            \${badge(item.curationStatus, 'status-' + item.curationStatus)}
            \${item.isSponsored ? badge('Sponsored') : ""}
            \${item.qualityScore ? badge('Score ' + item.qualityScore) : ""}
          </div>
          <div>
            <h2>\${item.displayTitle}</h2>
            <p class="subtitle">\${cardSubtitle}</p>
            \${cardContext ? \`<p class="context">\${cardContext}</p>\` : ""}
          </div>
          <p class="summary">\${item.displaySummary || "暂无摘要。"}</p>
        </article>
      \`;
      }
    )
    .join("");

  galleryNode.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const item = state.data.items.find((entry) => entry.id === card.dataset.id);
      if (item) openDetail(item);
    });
  });
};

const render = () => {
  setStats(state.data);
  renderSectionChips(state.data);
  renderChips(state.data);
  renderSourceOptions(state.data);
  renderSponsoredOptions();
  renderStatusOptions(state.data);
  renderSortOptions();
  const filteredItems = state.data.items.filter(matches);
  const sortedItems = sortItems(filteredItems);
  const { pageItems, totalPages } = paginateItems(sortedItems);
  renderResultsBar(sortedItems, totalPages);
  renderCards(pageItems);
  renderPagination(totalPages);
};

const loadInlineData = () => {
  const node = document.querySelector("#vault-data");
  if (!node?.textContent) return null;

  try {
    return JSON.parse(node.textContent);
  } catch (error) {
    console.warn("Failed to parse inline gallery data.", error);
    return null;
  }
};

const loadPageConfig = () => {
  const node = document.querySelector("#vault-page-config");
  if (!node?.textContent) return {};

  try {
    return JSON.parse(node.textContent);
  } catch (error) {
    console.warn("Failed to parse page config.", error);
    return {};
  }
};

const loadData = async () => {
  const inlineData = loadInlineData();
  if (inlineData?.items?.length) {
    return inlineData;
  }

  const response = await fetch("./data/items.json");
  return response.json();
};

const main = async () => {
  state.view = loadPageConfig();
  state.data = await loadData();
  render();
};

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  state.page = 1;
  render();
});

if (sourceFilter) {
  sourceFilter.addEventListener("change", (event) => {
    state.source = event.target.value;
    state.page = 1;
    render();
  });
}

if (sponsoredFilter) {
  sponsoredFilter.addEventListener("change", (event) => {
    state.sponsored = event.target.value;
    state.page = 1;
    render();
  });
}

statusFilter.addEventListener("change", (event) => {
  state.status = event.target.value;
  state.page = 1;
  render();
});

sortFilter.addEventListener("change", (event) => {
  state.sort = event.target.value;
  state.page = 1;
  render();
});

prevButton.addEventListener("click", () => {
  if (state.page <= 1) return;
  state.page -= 1;
  render();
});

nextButton.addEventListener("click", () => {
  state.page += 1;
  render();
});

dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  const inside =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;
  if (!inside) dialog.close();
});

main().catch((error) => {
  galleryNode.innerHTML = '<div class="empty">画廊数据加载失败。</div>';
  console.error(error);
});
`;

export const renderGallerySite = async (data) => {
  await fs.mkdir(dataRoot, { recursive: true });

  const sparkData = filterGalleryData(data, "codepen");
  const weeklyData = filterGalleryData(data, "iosdevweekly");
  const uxWeeklyData = filterGalleryData(data, "uxweekly");
  const fatbobmanWeeklyData = filterGalleryData(data, "fatbobmanweekly");
  const githubData = filterGalleryData(data, "github");

  await Promise.all([
    fs.writeFile(path.join(dataRoot, "items.json"), JSON.stringify(data, null, 2)),
    fs.writeFile(path.join(dataRoot, "spark-items.json"), JSON.stringify(sparkData, null, 2)),
    fs.writeFile(path.join(dataRoot, "weekly-items.json"), JSON.stringify(weeklyData, null, 2)),
    fs.writeFile(path.join(dataRoot, "ux-weekly-items.json"), JSON.stringify(uxWeeklyData, null, 2)),
    fs.writeFile(
      path.join(dataRoot, "fatbobman-weekly-items.json"),
      JSON.stringify(fatbobmanWeeklyData, null, 2)
    ),
    fs.writeFile(path.join(dataRoot, "github-items.json"), JSON.stringify(githubData, null, 2)),
    fs.writeFile(path.join(siteRoot, "index.html"), renderHomeHtml(data)),
    fs.writeFile(
      sparkPath,
      renderIndexHtml(sparkData, {
        mode: "spark",
        title: "Spark 灵感库",
        heading: "Spark 灵感库",
        copy: "这里收纳的是 CodePen Spark 的交互灵感、视觉模式和创意编码条目。它延续灵感库的标签体系与策展逻辑，只服务于灵感检索与项目启发。",
        searchPlaceholder: "搜索标题、中文摘要、标签、分类"
      })
    ),
    fs.writeFile(
      weeklyPath,
      renderIndexHtml(weeklyData, {
        mode: "weekly",
        title: "Weekly 技术周报",
        heading: "Weekly 技术周报",
        copy: "这里收纳的是 iOS Dev Weekly 的技术内容、工具链接和工程实践条目。它与 Spark 完全分开，服务于技术知识沉淀与趋势跟踪。",
        searchPlaceholder: "搜索标题、中文摘要、技术标签、栏目、期号",
        showImages: false,
        showSourceFilter: false,
        showSponsoredFilter: true,
        showSectionChips: true,
        showIssueContext: true,
        statsLabel: "Sections / Categories",
        defaultResultsTitle: "全部技术周报条目"
      })
    ),
    fs.writeFile(
      uxWeeklyPath,
      renderIndexHtml(uxWeeklyData, {
        mode: "uxweekly",
        title: "UX 周报",
        heading: "UX 周报",
        copy: "这里收纳的是体验碎周报里的体验设计案例、推荐阅读、工具资源与产品发现。它与技术周报和 Spark 灵感库分开，服务于体验设计观察与产品灵感沉淀。",
        searchPlaceholder: "搜索标题、中文摘要、标签、栏目、期号",
        showImages: true,
        showSourceFilter: false,
        showSponsoredFilter: false,
        showSectionChips: true,
        showIssueContext: true,
        statsLabel: "Sections / Categories",
        defaultResultsTitle: "全部 UX 周报条目"
      })
    ),
    fs.writeFile(
      fatbobmanWeeklyPath,
      renderIndexHtml(fatbobmanWeeklyData, {
        mode: "fatbobmanweekly",
        title: "Swift 周报",
        heading: "Swift 周报",
        copy: "这里收纳的是肘子的 Swift 周报里的原创文章、精选资源、近期推荐和开发工具。它与 iOS Dev Weekly、体验碎周报和 Spark 灵感库分开，服务于 Swift 与 Apple 开发生态知识沉淀。",
        searchPlaceholder: "搜索标题、中文摘要、Swift 标签、栏目、期号",
        showImages: false,
        showSourceFilter: false,
        showSponsoredFilter: false,
        showSectionChips: true,
        showIssueContext: true,
        statsLabel: "Sections / Categories",
        defaultResultsTitle: "全部 Swift 周报条目"
      })
    ),
    fs.writeFile(
      githubPath,
      renderIndexHtml(githubData, {
        mode: "github",
        title: "GitHub 项目库",
        heading: "GitHub 项目库",
        copy: "这里收纳的是单独保存下来的 GitHub repo。它与 Spark 和各类周报分开，服务于开源项目观察、工具积累、实现参考和未来项目的技术灵感。",
        searchPlaceholder: "搜索仓库名、中文摘要、标签、技术关键词",
        showImages: true,
        showSourceFilter: false,
        showSponsoredFilter: false,
        showSectionChips: false,
        showIssueContext: false,
        statsLabel: "Categories / Sources",
        defaultResultsTitle: "全部 GitHub 项目"
      })
    ),
    fs.writeFile(path.join(siteRoot, "styles.css"), stylesCss),
    fs.writeFile(path.join(siteRoot, "app.js"), appJs)
  ]);

  return {
    siteRoot,
    indexPath: path.join(siteRoot, "index.html"),
    dataPath: path.join(dataRoot, "items.json")
  };
};
