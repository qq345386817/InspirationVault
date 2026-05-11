// ==UserScript==
// @name         CodePen Spark Export
// @namespace    https://codepen.io/
// @version      0.1.0
// @description  Export non-sponsored items from the current CodePen Spark page as JSON for the inspiration vault.
// @match        https://codepen.io/spark/*
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const SCRIPT_NAME = "CodePen Spark Export";
  const BUTTON_ID = "codepen-spark-export-button";

  const normalizeText = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const slugify = (value, fallback = "spark") => {
    const slug = normalizeText(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || fallback;
  };

  const notify = (text) => {
    if (typeof GM_notification === "function") {
      GM_notification({
        title: SCRIPT_NAME,
        text,
        timeout: 3000
      });
      return;
    }

    window.alert(text);
  };

  const detectSparkItemType = (card) => {
    const typedNode = card.querySelector("[class*='SparkItem_sparkItemImage']");
    const classNames = normalizeText(typedNode?.className || card.className);
    const match = classNames.match(/SparkItem_sparkItemType([A-Za-z]+)/);
    return match ? match[1].toLowerCase() : "";
  };

  const extractIssueId = () => {
    const match = window.location.pathname.match(/\/spark\/(\d+)/);
    return match ? match[1] : "";
  };

  const buildPayload = () => {
    const sparkSection = document.querySelector("[class*='SparkPage_sparkItems']");
    if (!(sparkSection instanceof HTMLElement)) {
      throw new Error("当前页面没有检测到 Spark 主内容区。请先确认已经进入真实 Spark 页面。");
    }

    const issueTitle = normalizeText(sparkSection.querySelector("h2")?.textContent);
    const cards = Array.from(
      sparkSection.querySelectorAll("[class*='SparkItem_root']")
    ).filter((node) => node instanceof HTMLElement);

    const rawItems = cards
      .map((card) => {
        const titleAnchor = card.querySelector("h3 a[href]");
        if (!(titleAnchor instanceof HTMLAnchorElement)) return null;

        const imageNode = card.querySelector("img");
        const title = normalizeText(titleAnchor.textContent);
        const href = titleAnchor.href;
        const description = normalizeText(
          card.querySelector("[class*='SparkItem_sparkItemDescription']")?.textContent
        );
        const itemType = detectSparkItemType(card);
        const sponsored =
          Boolean(card.querySelector("[class*='SparkItem_sponsoredTag']")) ||
          itemType === "sponsor" ||
          /^sponsored:?/i.test(normalizeText(card.textContent));

        return {
          title,
          href,
          description,
          sourceImageUrl:
            imageNode instanceof HTMLImageElement
              ? imageNode.currentSrc || imageNode.src || ""
              : "",
          imageSourceType:
            imageNode instanceof HTMLImageElement && (imageNode.currentSrc || imageNode.src)
              ? "spark-card"
              : "",
          itemType: itemType || "",
          sponsored,
          text: normalizeText(card.textContent)
        };
      })
      .filter(Boolean);

    const items = rawItems.filter((item) => !item.sponsored);

    return {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      collector: "tampermonkey",
      sourceName: "codepen",
      sourceType: "spark_issue",
      issueId: extractIssueId(),
      issueTitle,
      url: window.location.href,
      pageTitle: document.title,
      sponsoredCount: rawItems.length - items.length,
      itemCount: items.length,
      items
    };
  };

  const downloadPayload = (payload) => {
    const filename = [
      `spark-${payload.issueId || "issue"}`,
      slugify(payload.issueTitle || payload.pageTitle || "export"),
      `${payload.exportedAt.replace(/[:.]/g, "-")}.json`
    ].join("-");

    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);

    const cleanup = () => {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    };

    if (typeof GM_download === "function") {
      GM_download({
        url: objectUrl,
        name: filename,
        saveAs: true,
        onload: cleanup,
        onerror: () => {
          cleanup();
          notify("导出失败。Tampermonkey 下载接口返回错误。");
        }
      });
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    cleanup();
  };

  const runExport = () => {
    try {
      const payload = buildPayload();
      if (!payload.items.length) {
        notify("没有提取到可导出的 Spark 条目。");
        return;
      }

      downloadPayload(payload);
      notify(`已导出 ${payload.items.length} 条非 Sponsored Spark。`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "导出失败。");
      console.error(SCRIPT_NAME, error);
    }
  };

  const ensureButton = () => {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "导出 Spark JSON";
    button.setAttribute(
      "style",
      [
        "position:fixed",
        "right:20px",
        "bottom:20px",
        "z-index:2147483647",
        "padding:10px 14px",
        "border:none",
        "border-radius:999px",
        "background:#111827",
        "color:#ffffff",
        "font:600 13px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        "box-shadow:0 10px 30px rgba(0,0,0,.24)",
        "cursor:pointer"
      ].join(";")
    );
    button.addEventListener("click", runExport);
    document.body.append(button);
  };

  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("导出当前 Spark JSON", runExport);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton, { once: true });
  } else {
    ensureButton();
  }
})();
