const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const knownSections = new Map([
  ["大产品小细节", "product-detail"],
  ["推荐阅读", "recommended-reading"],
  ["工具资源", "tool-resource"],
  ["产品发现", "product-discovery"]
]);

const ignoredSections = new Set(["招聘信息", "招聘", "好工作", "工作机会", "求职招聘"]);

export async function extractUxWeeklyIssue(page) {
  return page.evaluate(({ sectionEntries, ignoredEntries }) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const slugify = (value) =>
      normalize(value)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const known = new Map(sectionEntries);
    const ignored = new Set(ignoredEntries);
    const root =
      document.querySelector("main article") ||
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.body;

    const issueHeading = root.querySelector("h1") || document.querySelector("h1");
    const text = normalize(root.textContent || "");
    const publishedMatch = text.match(/(\d{4}-\d{2}-\d{2})\s*发表/) || text.match(/(\d{4}-\d{2}-\d{2})/);
    const publishedAt = publishedMatch ? publishedMatch[1] : "";
    const leadingQuote = issueHeading?.parentElement?.querySelector("blockquote");

    const allSectionNames = Array.from(root.querySelectorAll("h2")).map((node) =>
      normalize(node.textContent || "")
    );
    const excludedSectionNames = Array.from(new Set(allSectionNames.filter((name) => ignored.has(name))));
    const sectionHeadings = Array.from(root.querySelectorAll("h2")).filter((node) =>
      known.has(normalize(node.textContent || ""))
    );

    const firstSection = sectionHeadings[0] || null;
    const commentNodes = [];
    if (!leadingQuote && firstSection) {
      let current = issueHeading?.nextElementSibling || null;
      while (current && current !== firstSection) {
        commentNodes.push(current);
        current = current.nextElementSibling;
      }
    }

    const comment = leadingQuote
      ? normalize(leadingQuote.textContent || "")
      : normalize(commentNodes.map((node) => node.textContent || "").join(" "));

    const collectSectionNodes = (heading) => {
      const nodes = [];
      let current = heading.nextElementSibling;
      while (current && current.tagName !== "H2") {
        nodes.push(current);
        current = current.nextElementSibling;
      }
      return nodes;
    };

    const splitGroups = (nodes) => {
      const groups = [];
      let current = [];

      const flush = () => {
        if (current.length) {
          groups.push(current);
          current = [];
        }
      };

      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.tagName === "H3") flush();
        current.push(node);
      }

      flush();
      return groups.filter((group) => group.some((node) => node.tagName === "H3"));
    };

    const parseGroup = (group) => {
      const heading = group.find((node) => node.tagName === "H3");
      if (!(heading instanceof HTMLElement)) return null;

      const title = normalize(heading.textContent || "");
      const contentNodes = group.filter((node) => node !== heading);
      const anchors = contentNodes
        .flatMap((node) => Array.from(node.querySelectorAll?.("a[href]") || []))
        .filter((node) => node instanceof HTMLAnchorElement);
      const link =
        anchors.find((anchor) => {
          try {
            const url = new URL(anchor.href, window.location.href);
            return url.hostname !== window.location.hostname;
          } catch {
            return false;
          }
        }) || anchors[0] || null;

      if (!(link instanceof HTMLAnchorElement)) return null;

      const description = normalize(
        contentNodes
          .filter((node) => {
            const nodeText = normalize(node.textContent || "");
            if (!nodeText) return false;
            if (nodeText.startsWith("：")) return false;
            if (nodeText.startsWith("🔗")) return false;
            if (/^[🔗\s：:]*https?:\/\//i.test(nodeText)) return false;
            if (/^来自\s*/.test(nodeText)) return false;
            return true;
          })
          .map((node) => node.textContent || "")
          .join(" ")
      );

      const imageNode = contentNodes
        .flatMap((node) => Array.from(node.querySelectorAll?.("img") || []))
        .find((node) => node instanceof HTMLImageElement);

      return {
        title,
        href: link.href,
        description,
        sourceImageUrl: imageNode?.src || "",
        text: normalize(group.map((node) => node.textContent || "").join(" "))
      };
    };

    let positionInIssue = 0;
    const items = [];

    for (const heading of sectionHeadings) {
      const sectionName = normalize(heading.textContent || "");
      const sectionSlug = known.get(sectionName) || slugify(sectionName);
      const groups = splitGroups(collectSectionNodes(heading));
      let positionInSection = 0;

      for (const group of groups) {
        const item = parseGroup(group);
        if (!item?.title || !item.href) continue;

        positionInIssue += 1;
        positionInSection += 1;

        items.push({
          ...item,
          sectionName,
          sectionSlug,
          positionInIssue,
          positionInSection,
          sponsored: false
        });
      }
    }

    return {
      extractedAt: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      issueTitle: normalize(issueHeading?.textContent || ""),
      publishedAt,
      comment,
      excludedSectionNames,
      sponsoredMarkerCount: 0,
      itemCount: items.length,
      items
    };
  }, {
    sectionEntries: Array.from(knownSections.entries()),
    ignoredEntries: Array.from(ignoredSections.values())
  });
}
