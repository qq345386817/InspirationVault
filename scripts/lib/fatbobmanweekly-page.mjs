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
    const slugify = (value) =>
      normalize(value)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
        .replace(/^-+|-+$/g, "");

    const known = new Map(sectionEntries);
    const ignored = new Set(ignoredEntries);

    const root =
      document.querySelector("article") ||
      document.querySelector("main") ||
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

    const allSectionHeadings = Array.from(root.querySelectorAll("h2")).filter((node) => {
      const name = normalize(node.textContent || "");
      return Boolean(name) && !ignored.has(name);
    });
    const excludedSectionNames = Array.from(
      new Set(
        Array.from(root.querySelectorAll("h2"))
          .map((node) => normalize(node.textContent || ""))
          .filter((name) => ignored.has(name))
      )
    );
    const sectionHeadings = allSectionHeadings;

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

    const sectionMeta = (sectionName, subsectionName = "") => {
      if (!subsectionName || subsectionName === sectionName) {
        return {
          sectionName,
          sectionSlug: known.get(sectionName) || slugify(sectionName)
        };
      }

      return {
        sectionName: `${sectionName} / ${subsectionName}`,
        sectionSlug: `${known.get(sectionName) || slugify(sectionName)}-${slugify(
          subsectionName
        )}`
      };
    };

    const splitGroups = (nodes) => {
      const groups = [];
      let current = [];
      let currentSectionName = "";
      let currentSectionSlug = "";
      const flush = () => {
        if (current.length) {
          groups.push({
            nodes: current,
            sectionName: currentSectionName,
            sectionSlug: currentSectionSlug
          });
          current = [];
        }
      };

      for (const { node, sectionName, sectionSlug } of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.tagName === "HR") {
          flush();
          continue;
        }
        if (node.tagName === "H3" && current.length) flush();
        if (!current.length) {
          currentSectionName = sectionName;
          currentSectionSlug = sectionSlug;
        }
        current.push(node);
      }

      flush();
      return groups.filter((group) =>
        group.nodes.some((node) => node.tagName === "H3" || node.querySelector("a[href]"))
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

    const parseListItem = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      const firstParagraph = node.querySelector("p") || node;
      const strongTitle = firstParagraph.querySelector("strong");
      const firstAnchor = firstParagraph.querySelector("a[href]");
      let titleAnchor = firstAnchor;
      let title = "";

      if (strongTitle && !strongTitle.querySelector("a[href]")) {
        title = normalize(strongTitle.textContent || "");
        titleAnchor =
          Array.from(node.querySelectorAll("a[href]")).find(
            (anchor) => !firstParagraph.contains(anchor)
          ) ||
          firstAnchor ||
          null;
      } else if (firstAnchor instanceof HTMLAnchorElement) {
        title = normalize(firstAnchor.textContent || firstParagraph.textContent || "");
      }

      if (!(titleAnchor instanceof HTMLAnchorElement)) return null;
      if (!title) title = normalize(titleAnchor.textContent || "");

      const descriptionNodes = Array.from(node.children).filter(
        (child) => child !== firstParagraph
      );
      const description = normalize(
        descriptionNodes.length
          ? descriptionNodes.map((child) => child.textContent || "").join(" ")
          : node.textContent?.replace(firstParagraph.textContent || "", "") || ""
      );

      return {
        title,
        href: titleAnchor.href,
        description,
        text: normalize(node.textContent || "")
      };
    };

    let positionInIssue = 0;
    const items = [];

    for (const heading of sectionHeadings) {
      const sectionName = normalize(heading.textContent || "");
      let currentSubsectionName = "";
      const sectionNodes = [];

      for (const node of collectSectionNodes(heading)) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.tagName === "H3" && !node.querySelector("a[href]")) {
          currentSubsectionName = normalize(node.textContent || "");
          continue;
        }

        const meta = sectionMeta(sectionName, currentSubsectionName);

        if (node.matches("ul, ol")) {
          for (const listItem of Array.from(node.children).filter(
            (child) => child instanceof HTMLElement && child.tagName === "LI"
          )) {
            const item = parseListItem(listItem);
            if (!item?.title || !item.href) continue;
            positionInIssue += 1;
            const positionInSection =
              items.filter((existing) => existing.sectionName === meta.sectionName).length + 1;
            items.push({
              ...item,
              ...meta,
              positionInIssue,
              positionInSection,
              sponsored: false
            });
          }
          continue;
        }

        sectionNodes.push({ node, ...meta });
      }

      const groups = splitGroups(sectionNodes);
      let positionInSection = 0;

      for (const group of groups) {
        const item = parseGroup(group.nodes);
        if (!item?.title || !item.href) continue;
        positionInIssue += 1;
        positionInSection += 1;
        items.push({
          ...item,
          sectionName: group.sectionName || sectionName,
          sectionSlug: group.sectionSlug || known.get(sectionName) || slugify(sectionName),
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
