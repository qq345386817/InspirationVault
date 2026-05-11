import {
  copyRawImport,
  ensureVaultLayout,
  markdownPathForItem,
  openVaultDatabase,
  readExistingItem,
  readExistingItemByUrl,
  upsertIssue,
  upsertItemAppearance,
  upsertItem,
  vaultRoot,
  writeMarkdownCard
} from "./vault.mjs";
import { ensureImageAssets } from "./assets.mjs";
import { mergeImportedRecord, normalizeExportPayload, toIsoDate } from "./normalize.mjs";

export const importPayloadIntoVault = async ({
  payload,
  originName = "session-export.json"
}) => {
  const normalizedExport = normalizeExportPayload(payload);
  const importedAt = toIsoDate();

  await ensureVaultLayout();
  const db = openVaultDatabase();

  try {
    const rawRelativePath = await copyRawImport(
      normalizedExport,
      importedAt.replace(/[:.]/g, "-"),
      originName,
      payload
    );

    upsertIssue(db, normalizedExport, rawRelativePath, importedAt);

    const records = [];
    const skippedDuplicates = [];
    const reusedExistingItems = [];
    const seenUrls = new Set();

    for (const item of normalizedExport.items) {
      if (seenUrls.has(item.itemUrl)) {
        skippedDuplicates.push({
          title: item.title,
          itemUrl: item.itemUrl,
          reason: "duplicate-url-in-import"
        });
        continue;
      }
      seenUrls.add(item.itemUrl);

      const existingByUrl = readExistingItemByUrl(db, item.itemUrl);
      const existing = existingByUrl || readExistingItem(db, item.id);
      const record = mergeImportedRecord({
        normalizedExport,
        item,
        importedAt,
        existing,
        markdownRelativePath: markdownPathForItem(normalizedExport, item)
      });
      const recordWithAssets = await ensureImageAssets(record);

      upsertItem(db, recordWithAssets);
      upsertItemAppearance(db, {
        appearanceKey: `${normalizedExport.issueKey}::${recordWithAssets.id}`,
        itemId: recordWithAssets.id,
        issueKey: normalizedExport.issueKey,
        sourceName: normalizedExport.sourceName,
        sourceType: normalizedExport.sourceType,
        issueId: normalizedExport.issueId,
        issueTitle: normalizedExport.issueTitle,
        issueUrl: normalizedExport.issueUrl,
        pageTitle: normalizedExport.pageTitle,
        publishedAt: normalizedExport.publishedAt,
        itemUrl: recordWithAssets.itemUrl,
        title: recordWithAssets.title,
        description: recordWithAssets.description,
        sectionName: recordWithAssets.sourceSectionName,
        sectionSlug: recordWithAssets.sourceSectionSlug,
        positionInIssue: recordWithAssets.positionInIssue,
        positionInSection: recordWithAssets.positionInSection,
        isSponsored: recordWithAssets.isSponsored,
        collectedAt: recordWithAssets.collectedAt,
        importedAt,
        createdAt: existing?.created_at || importedAt,
        updatedAt: importedAt
      });
      await writeMarkdownCard(recordWithAssets);
      if (existingByUrl) {
        reusedExistingItems.push({
          id: existingByUrl.id,
          title: existingByUrl.title,
          itemUrl: existingByUrl.item_url,
          issueKey: normalizedExport.issueKey
        });
      } else {
        records.push(recordWithAssets);
      }
    }

    return {
      normalizedExport,
      importedAt,
      rawRelativePath,
      records,
      skippedDuplicates,
      reusedExistingItems,
      itemIds: records.map((record) => record.id),
      vaultRoot
    };
  } finally {
    db.close();
  }
};
