const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const knownSections = new Map([
  ["comment", "comment"],
  ["sponsored link", "sponsored-link"],
  ["books", "books"],
  ["news", "news"],
  ["tools", "tools"],
  ["videos", "videos"],
  ["code", "code"],
  ["design", "design"],
  ["business and marketing", "business-and-marketing"],
  ["jobs", "jobs"],
  ["job listings", "jobs"],
  ["and finally", "and-finally"],
  ["and finally...", "and-finally"]
]);

export async function extractIosDevWeeklyIssue(page) {
  return page.evaluate((sectionEntries) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const slugify = (value) =>
      normalize(value)
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const known = new Map(sectionEntries);
    const headingTags = new Set(["H2", "H3"]);
    const isKnownSectionHeading = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (!headingTags.has(node.tagName)) return false;
      return known.has(normalize(node.textContent).toLowerCase());
    };

    const root = document.querySelector("main") || document.querySelector("article") || document.body;
    const issueHeading =
      root.querySelector("h1") ||
      document.querySelector("h1");
    const timeNode = document.querySelector("time[datetime]");
    const metaPublished = document.querySelector('meta[property="article:published_time"]');
    const publishedAt =
      timeNode?.getAttribute("datetime") ||
      metaPublished?.getAttribute("content") ||
      "";

    const headings = Array.from(root.querySelectorAll("h2, h3")).filter((node) =>
      isKnownSectionHeading(node)
    );

    const extractSectionNodes = (heading) => {
      const nodes = [];
      let current = heading.nextElementSibling;
      while (current && !isKnownSectionHeading(current)) {
        nodes.push(current);
        current = current.nextElementSibling;
      }
      return nodes;
    };

    const splitGroups = (nodes) => {
      const groups = [];
      let current = [];

      const pushCurrent = () => {
        if (current.length) {
          groups.push(current);
          current = [];
        }
      };

      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.tagName === "HR") {
          pushCurrent();
          continue;
        }
        if (node instanceof HTMLAnchorElement && node.href && current.length) {
          pushCurrent();
        }
        if (/^H[34]$/.test(node.tagName) && current.length) {
          pushCurrent();
        }
        current.push(node);
      }

      pushCurrent();
      return groups;
    };

    const parseGroup = (group) => {
      const heading = group.find((node) => /^H[34]$/.test(node.tagName));
      const directAnchor = group.find(
        (node) => node instanceof HTMLAnchorElement && node.href
      );
      const titleAnchor =
        heading?.querySelector("a[href]") ||
        directAnchor ||
        group.map((node) => node.querySelector?.("a[href]")).find(Boolean) ||
        null;

      if (!(titleAnchor instanceof HTMLAnchorElement)) return null;

      const title = normalize(
        heading?.textContent || titleAnchor.textContent || titleAnchor.getAttribute("title")
      );
      const href = titleAnchor.href;
      const description = normalize(
        group
          .filter((node) => node !== heading && node !== titleAnchor)
          .map((node) => node.textContent || "")
          .join(" ")
      );
      const text = normalize(group.map((node) => node.textContent || "").join(" "));

      return {
        title,
        href,
        description,
        text
      };
    };

    const commentSection = headings.find(
      (heading) => known.get(normalize(heading.textContent).toLowerCase()) === "comment"
    );
    const comment = commentSection
      ? normalize(extractSectionNodes(commentSection).map((node) => node.textContent || "").join(" "))
      : "";

    let positionInIssue = 0;
    const items = [];

    for (const heading of headings) {
      const sectionName = normalize(heading.textContent);
      const sectionSlug = known.get(sectionName.toLowerCase()) || slugify(sectionName);
      if (sectionSlug === "comment") continue;

      const groups = splitGroups(extractSectionNodes(heading));
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
          sponsored: sectionSlug === "sponsored-link"
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
      sponsoredMarkerCount: items.filter((item) => item.sponsored).length,
      itemCount: items.length,
      items
    };
  }, Array.from(knownSections.entries()));
}
