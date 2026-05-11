const knownSections = new Map([
  ["原创", "original"],
  ["精选资源", "featured-resources"],
  ["本期推荐", "recommended"],
  ["近期推荐", "recommended"],
  ["工具", "tools"],
  ["诚聘", "jobs"]
]);

const ignoredSections = new Set(["诚聘", "招聘", "工作机会", "职位"]);

export async function extractFatbobmanWeeklyIssue(page) {
  return page.evaluate(({ sectionEntries, ignoredEntries }) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const known = new Map(sectionEntries);
    const ignored = new Set(ignoredEntries);

    const root =
      document.querySelector("main") ||
      document.querySelector("article") ||
      document.body;
    const issueHeading = root.querySelector("h1") || document.querySelector("h1");
    const issueMarker = normalize(root.querySelector("p, div")?.textContent || "");
    const fullText = normalize(root.textContent || "");
    const publishedMatch =
      fullText.match(/发表于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/) ||
      fullText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    const publishedAt = publishedMatch
      ? `${publishedMatch[1]}-${String(publishedMatch[2]).padStart(2, "0")}-${String(
          publishedMatch[3]
        ).padStart(2, "0")}`
      : "";

    const allSectionHeadings = Array.from(root.querySelectorAll("h2")).filter((node) =>
      known.has(normalize(node.textContent || ""))
    );
    const excludedSectionNames = Array.from(
      new Set(
        allSectionHeadings
          .map((node) => normalize(node.textContent || ""))
          .filter((name) => ignored.has(name))
      )
    );
    const sectionHeadings = allSectionHeadings.filter(
      (node) => !ignored.has(normalize(node.textContent || ""))
    );

    const firstSection = allSectionHeadings[0] || null;
    const commentNodes = [];
    if (firstSection) {
      let current = issueHeading?.nextElementSibling || null;
      while (current && current !== firstSection) {
        if (current instanceof HTMLElement && current.tagName !== "BLOCKQUOTE") {
          commentNodes.push(current);
        }
        current = current.nextElementSibling;
      }
    }
    const comment = normalize(commentNodes.map((node) => node.textContent || "").join(" "));

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
        if (node.tagName === "HR") {
          flush();
          continue;
        }
        if (node.tagName === "H3" && current.length) flush();
        current.push(node);
      }

      flush();
      return groups.filter((group) =>
        group.some((node) => node.tagName === "H3" || node.querySelector("a[href]"))
      );
    };

    const parseGroup = (group) => {
      const heading = group.find((node) => node.tagName === "H3");
      const titleNode =
        heading ||
        group.find((node) => node instanceof HTMLElement && node.querySelector("a[href]"));
      if (!(titleNode instanceof HTMLElement)) return null;

      const titleAnchor = titleNode.querySelector("a[href]");
      if (!(titleAnchor instanceof HTMLAnchorElement)) return null;

      const title =
        heading instanceof HTMLElement
          ? normalize(heading.textContent || titleAnchor.textContent || "")
          : normalize(titleAnchor.textContent || titleNode.textContent || "");
      const contentNodes = group.filter((node) => node !== titleNode);
      const description = normalize(
        contentNodes
          .filter((node) => {
            const text = normalize(node.textContent || "");
            if (!text) return false;
            if (text === "链接已复制") return false;
            return true;
          })
          .map((node) => node.textContent || "")
          .join(" ")
      );

      return {
        title,
        href: titleAnchor.href,
        description,
        text: normalize(group.map((node) => node.textContent || "").join(" "))
      };
    };

    let positionInIssue = 0;
    const items = [];

    for (const heading of sectionHeadings) {
      const sectionName = normalize(heading.textContent || "");
      const sectionSlug = known.get(sectionName) || "";
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
      issueMarker,
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
