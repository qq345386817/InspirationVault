const trimText = (value) => String(value || "").replace(/\s+/g, " ").trim();

export const extractGitHubRepository = async (page) =>
  page.evaluate(() => {
    const trim = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bySelector = (selector, root = document) => trim(root.querySelector(selector)?.textContent || "");
    const bySelectors = (selectors) => {
      for (const selector of selectors) {
        const value = bySelector(selector);
        if (value) return value;
      }
      return "";
    };
    const metaContent = (selector) =>
      trim(document.querySelector(selector)?.getAttribute("content") || "");

    const canonicalUrl =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") || location.href;
    const parsed = new URL(canonicalUrl, location.origin);
    const [owner = "", repo = ""] = parsed.pathname.split("/").filter(Boolean).slice(0, 2);
    const repoPath = owner && repo ? `/${owner}/${repo}` : "";
    const repoFullName = owner && repo ? `${owner}/${repo}` : "";

    const unique = (values) => Array.from(new Set(values.filter(Boolean)));
    const repoLinkText = (suffixes) => {
      for (const anchor of document.querySelectorAll("a[href]")) {
        const href = anchor.getAttribute("href") || "";
        const matched = suffixes.some(
          (suffix) => href === `${repoPath}${suffix}` || href === `${repoPath}${suffix}/`
        );
        if (!matched) continue;
        const value = trim(anchor.textContent || "");
        if (value) return value;
      }
      return "";
    };

    const topics = unique(
      Array.from(
        document.querySelectorAll('a[href*="/topics/"], [data-testid="repository-topic-list"] a[href]')
      )
        .map((node) => trim(node.textContent || ""))
        .filter((value) => value.length <= 64)
    );
    const programmingLanguage = bySelectors([
      'span[itemprop="programmingLanguage"]',
      '[data-testid="repository-sidebar"] span[itemprop="programmingLanguage"]',
      '[data-testid="repo-language-color"] + span'
    ]);
    const license = bySelectors([
      '[data-testid="repository-sidebar"] a[href*="LICENSE"]',
      '[data-testid="repository-sidebar"] [href*="/blob/"]'
    ]);
    const homepage = Array.from(
      document.querySelectorAll(
        '[data-testid="repository-sidebar"] a[href], nav[aria-label="Repository"] a[href]'
      )
    )
      .map((node) => node.getAttribute("href") || "")
      .find((href) => /^https?:\/\//i.test(href) && !href.includes("github.com"));
    const stars = repoLinkText(["/stargazers"]);
    const forks = repoLinkText(["/forks"]);
    const readmeLines = unique(
      Array.from(document.querySelectorAll("article.markdown-body p, article.markdown-body li"))
        .map((node) => trim(node.textContent || ""))
        .filter(Boolean)
    );
    const readmeExcerpt = trim(readmeLines.join(" ").slice(0, 900));
    const descriptionRaw =
      metaContent('meta[property="og:description"]') ||
      metaContent('meta[name="description"]') ||
      bySelectors(['[data-testid="repository-description"]', '[itemprop="about"]']);
    const description = trim(
      descriptionRaw
        .replace(/\s*-\s*GitHub\s*$/i, "")
        .replace(new RegExp(`\\s*-\\s*${escapeRegExp(repoFullName)}\\s*$`, "i"), "")
    );
    const title =
      metaContent('meta[property="og:title"]') ||
      bySelectors(['strong[itemprop="name"] a', 'h1 strong a', "title"]) ||
      repoFullName;
    const sourceImageUrl = metaContent('meta[property="og:image"]');
    const rawFacts = [
      repoFullName ? `Repository: ${repoFullName}` : "",
      description ? `Description: ${description}` : "",
      programmingLanguage ? `Language: ${programmingLanguage}` : "",
      stars ? `Stars: ${stars}` : "",
      forks ? `Forks: ${forks}` : "",
      license ? `License: ${license}` : "",
      homepage ? `Homepage: ${homepage}` : "",
      topics.length ? `Topics: ${topics.join(", ")}` : "",
      readmeExcerpt ? `README: ${readmeExcerpt}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    return {
      title,
      repoFullName: repoFullName || title,
      repoOwner: owner,
      repoName: repo,
      description,
      sourceImageUrl,
      imageSourceType: sourceImageUrl ? "og" : "",
      programmingLanguage,
      license,
      homepage: homepage || "",
      stars,
      forks,
      topics,
      readmeExcerpt,
      rawFacts
    };
  }).then((result) => ({
    ...result,
    title: trimText(result.title),
    repoFullName: trimText(result.repoFullName),
    repoOwner: trimText(result.repoOwner),
    repoName: trimText(result.repoName),
    description: trimText(result.description),
    programmingLanguage: trimText(result.programmingLanguage),
    license: trimText(result.license),
    homepage: trimText(result.homepage),
    stars: trimText(result.stars),
    forks: trimText(result.forks),
    topics: Array.isArray(result.topics) ? result.topics.map(trimText).filter(Boolean) : [],
    readmeExcerpt: trimText(result.readmeExcerpt),
    rawFacts: trimText(result.rawFacts)
  }));
