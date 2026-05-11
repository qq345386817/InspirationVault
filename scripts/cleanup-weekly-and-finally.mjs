import fs from "node:fs/promises";
import path from "node:path";
import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";
import { openVaultDatabase, vaultRoot } from "./lib/vault.mjs";

const sourceName = "iosdevweekly";
const excludedSectionSlugs = ["and-finally", "sponsored-link", "books", "videos", "jobs"];

const latestAppearanceForItem = (db, itemId) =>
  db.prepare(`
    SELECT
      appearance_key,
      item_id,
      issue_key,
      source_name,
      source_type,
      issue_id,
      issue_title,
      issue_url,
      page_title,
      published_at,
      item_url,
      title,
      description,
      section_name,
      section_slug,
      position_in_issue,
      position_in_section,
      is_sponsored,
      collected_at,
      imported_at,
      created_at,
      updated_at
    FROM item_appearances
    WHERE item_id = ?
    ORDER BY updated_at DESC, imported_at DESC, created_at DESC, rowid DESC
    LIMIT 1
  `).get(itemId);

const updateItemFromAppearance = (db, itemId, appearance) => {
  db.prepare(`
    UPDATE items
    SET
      issue_key = ?,
      source_name = ?,
      source_type = ?,
      issue_id = ?,
      issue_title = ?,
      issue_url = ?,
      page_title = ?,
      published_at = ?,
      item_url = ?,
      title = ?,
      description = ?,
      source_section_name = ?,
      source_section_slug = ?,
      position_in_issue = ?,
      position_in_section = ?,
      is_sponsored = ?,
      collected_at = ?,
      imported_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    appearance.issue_key,
    appearance.source_name,
    appearance.source_type,
    appearance.issue_id,
    appearance.issue_title,
    appearance.issue_url,
    appearance.page_title,
    appearance.published_at || "",
    appearance.item_url,
    appearance.title,
    appearance.description || "",
    appearance.section_name || "",
    appearance.section_slug || "",
    appearance.position_in_issue,
    appearance.position_in_section,
    appearance.is_sponsored ? 1 : 0,
    appearance.collected_at,
    appearance.imported_at,
    appearance.updated_at,
    itemId
  );
};

const refreshIssueStats = (db, issueKey) => {
  const stats =
    db.prepare(`
      SELECT
        COUNT(*) AS item_count,
        COALESCE(SUM(is_sponsored), 0) AS sponsored_count
      FROM item_appearances
      WHERE issue_key = ?
    `).get(issueKey) || { item_count: 0, sponsored_count: 0 };

  db.prepare(`
    UPDATE issues
    SET
      item_count = ?,
      sponsored_count = ?
    WHERE issue_key = ?
  `).run(stats.item_count || 0, stats.sponsored_count || 0, issueKey);
};

const main = async () => {
  const db = openVaultDatabase();

  try {
    const appearances = db
      .prepare(`
        SELECT
          appearance_key,
          item_id,
          issue_key
        FROM item_appearances
        WHERE source_name = ?
          AND section_slug IN (${excludedSectionSlugs.map(() => "?").join(", ")})
      `)
      .all(sourceName, ...excludedSectionSlugs);

    if (!appearances.length) {
      const galleryResult = await renderGallerySite(loadGalleryData(db));
      console.log("No weekly excluded-section appearances found.");
      console.log(`Gallery: ${galleryResult.indexPath}`);
      return;
    }

    const itemIds = [...new Set(appearances.map((row) => row.item_id))];
    const issueKeys = [...new Set(appearances.map((row) => row.issue_key))];
    const markdownRows = db
      .prepare(
        `SELECT id, markdown_path FROM items WHERE id IN (${itemIds.map(() => "?").join(", ")})`
      )
      .all(...itemIds);
    const markdownMap = new Map(markdownRows.map((row) => [row.id, row.markdown_path]));
    const markdownsToDelete = [];

    db.exec("BEGIN");
    try {
      db.prepare(`
        DELETE FROM item_appearances
        WHERE source_name = ?
          AND section_slug IN (${excludedSectionSlugs.map(() => "?").join(", ")})
      `).run(sourceName, ...excludedSectionSlugs);

      for (const itemId of itemIds) {
        const latestAppearance = latestAppearanceForItem(db, itemId);
        if (latestAppearance) {
          updateItemFromAppearance(db, itemId, latestAppearance);
          continue;
        }

        const markdownPath = markdownMap.get(itemId);
        if (markdownPath) {
          markdownsToDelete.push(path.join(vaultRoot, markdownPath));
        }

        db.prepare(`DELETE FROM items WHERE id = ?`).run(itemId);
      }

      for (const issueKey of issueKeys) {
        refreshIssueStats(db, issueKey);
      }

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    for (const markdownPath of markdownsToDelete) {
      await fs.rm(markdownPath, { force: true });
    }

    const galleryResult = await renderGallerySite(loadGalleryData(db));
    console.log(
      `Removed weekly excluded-section appearances (${excludedSectionSlugs.join(", ")}): ${appearances.length}`
    );
    console.log(`Removed orphaned items: ${markdownsToDelete.length}`);
    console.log(`Gallery: ${galleryResult.indexPath}`);
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
