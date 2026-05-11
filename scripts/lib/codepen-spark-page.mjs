const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export async function detectAccessState(page) {
  const url = page.url();
  const title = await page.title();
  const bodyText = normalizeText(await page.locator("body").innerText().catch(() => ""));
  const blockedTitlePattern =
    /attention required|sorry, you have been blocked|cloudflare|just a moment/i;
  const blockedBodyPattern =
    /you have been blocked|enable cookies|performing security verification|verifies you are not a bot|security service/i;
  const blockedUrlPattern =
    /__cf_chl_rt_tk=|\/cdn-cgi\/challenge-platform\/|challenge-platform|cloudflare/i;
  const sparkItemsVisible = await page
    .locator("[class*='SparkPage_sparkItems']")
    .first()
    .isVisible()
    .catch(() => false);

  return {
    url,
    title,
    bodyPreview: bodyText.slice(0, 400),
    blocked:
      !sparkItemsVisible &&
      (blockedUrlPattern.test(url) ||
        blockedTitlePattern.test(title) ||
        blockedBodyPattern.test(bodyText))
  };
}

export async function extractSparkItems(page, config) {
  return page.evaluate((runtimeConfig) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const detectSparkItemType = (card) => {
      const typedNode = card.querySelector("[class*='SparkItem_sparkItemImage']");
      const classNames = normalize(typedNode?.className || card.className);
      const match = classNames.match(/SparkItem_sparkItemType([A-Za-z]+)/);
      return match ? match[1].toLowerCase() : null;
    };

    const sparkSection = document.querySelector("[class*='SparkPage_sparkItems']");
    if (sparkSection) {
      const issueTitle = normalize(sparkSection.querySelector("h2")?.textContent);
      const cards = Array.from(
        sparkSection.querySelectorAll("[class*='SparkItem_root']")
      ).filter((node) => node instanceof HTMLElement);

      const items = cards
        .map((card) => {
          const titleAnchor = card.querySelector("h3 a[href]");
          if (!(titleAnchor instanceof HTMLAnchorElement)) return null;
          const imageNode = card.querySelector("img");

          const title = normalize(titleAnchor.textContent);
          const href = titleAnchor.href;
          const description = normalize(
            card.querySelector("[class*='SparkItem_sparkItemDescription']")?.textContent
          );
          const itemType = detectSparkItemType(card);
          const sponsored =
            Boolean(card.querySelector("[class*='SparkItem_sponsoredTag']")) ||
            itemType === "sponsor" ||
            /^sponsored:?/i.test(normalize(card.textContent));

          return {
            title,
            href,
            description,
            imageUrl:
              imageNode instanceof HTMLImageElement
                ? imageNode.currentSrc || imageNode.src || ""
                : "",
            imageSourceType:
              imageNode instanceof HTMLImageElement && (imageNode.currentSrc || imageNode.src)
                ? "spark-card"
                : "",
            itemType,
            sponsored,
            text: normalize(card.textContent)
          };
        })
        .filter(Boolean);

      const filteredItems = items.filter((item) => !item.sponsored);

      return {
        extractedAt: new Date().toISOString(),
        url: window.location.href,
        title: document.title,
        issueTitle,
        sponsoredMarkerCount: items.length - filteredItems.length,
        sponsoredPreview: items
          .filter((item) => item.sponsored)
          .slice(0, 10)
          .map(({ title, href, itemType }) => ({ title, href, itemType })),
        itemCount: filteredItems.length,
        items: filteredItems
      };
    }

    const sponsorPatterns = runtimeConfig.sponsorPatterns.map((item) =>
      item.toLowerCase()
    );
    const cardSelectors = runtimeConfig.cardSelectors.join(", ");
    const minCardTextLength = runtimeConfig.minCardTextLength;
    const maxCardTextLength = runtimeConfig.maxCardTextLength;

    if (!cardSelectors.trim()) {
      return {
        extractedAt: new Date().toISOString(),
        url: window.location.href,
        title: document.title,
        sponsoredMarkerCount: 0,
        sponsoredPreview: [],
        itemCount: 0,
        items: []
      };
    }

    const isSponsorText = (text) => {
      const normalized = normalize(text).toLowerCase();
      if (!normalized) return false;
      return sponsorPatterns.some(
        (pattern) =>
          normalized === pattern ||
          normalized.startsWith(`${pattern} `) ||
          normalized.endsWith(` ${pattern}`) ||
          normalized.includes(` ${pattern} `)
      );
    };

    const findClosestCard = (node) => {
      const directMatch = node.closest(cardSelectors);
      if (directMatch) return directMatch;

      let current = node.parentElement;
      while (current && current !== document.body) {
        const text = normalize(current.innerText);
        if (
          text.length >= minCardTextLength &&
          text.length <= maxCardTextLength &&
          current.querySelector("a[href]")
        ) {
          return current;
        }
        current = current.parentElement;
      }

      return null;
    };

    const leafNodes = Array.from(document.querySelectorAll("body *")).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.children.length > 0) return false;

      const text = normalize(node.innerText || node.textContent);
      return text.length > 0 && text.length <= 60;
    });

    const sponsorMarkers = leafNodes.filter((node) =>
      isSponsorText(node.innerText || node.textContent)
    );

    const sponsoredCards = new Set(
      sponsorMarkers
        .map((node) => findClosestCard(node))
        .filter(Boolean)
    );

    const cardCandidates = Array.from(document.querySelectorAll(cardSelectors)).filter(
      (node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (sponsoredCards.has(node)) return false;
        if (node.closest("header, footer, nav, aside")) return false;

        const text = normalize(node.innerText);
        if (text.length < minCardTextLength || text.length > maxCardTextLength) {
          return false;
        }

        if (isSponsorText(text)) return false;

        const links = Array.from(node.querySelectorAll("a[href]")).filter(
          (anchor) => anchor.href && !anchor.href.startsWith("javascript:")
        );

        return links.length > 0;
      }
    );

    const items = [];
    const seenKeys = new Set();

    for (const card of cardCandidates) {
      const anchors = Array.from(card.querySelectorAll("a[href]")).filter(
        (anchor) => anchor.href && !anchor.href.startsWith("javascript:")
      );

      if (!anchors.length) continue;

      const primaryAnchor =
        anchors.find((anchor) => normalize(anchor.textContent).length >= 4) || anchors[0];

      const title = normalize(primaryAnchor.textContent) || normalize(card.innerText).slice(0, 120);
      const href = primaryAnchor.href;
      const text = normalize(card.innerText);
      const key = `${title}::${href}`;

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      items.push({
        title,
        href,
        text
      });
    }

    return {
      extractedAt: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      sponsoredMarkerCount: sponsorMarkers.length,
      sponsoredPreview: sponsorMarkers.slice(0, 10).map((node) => ({
        text: normalize(node.textContent),
        html: node.outerHTML.slice(0, 300)
      })),
      itemCount: items.length,
      items
    };
  }, config);
}
