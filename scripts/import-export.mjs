import fs from "node:fs/promises";
import path from "node:path";
import { importPayloadIntoVault } from "./lib/importer.mjs";
import { ensureVaultLayout, vaultRoot } from "./lib/vault.mjs";

const inputFile = process.argv[2];
const inboxRoot = path.join(vaultRoot, "inbox");
const processedRoot = path.join(inboxRoot, "processed");

const listInboxJsonFiles = async () => {
  const entries = await fs.readdir(inboxRoot, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(inboxRoot, entry.name))
    .sort((left, right) => left.localeCompare(right));
};

const uniqueProcessedTarget = async (sourceFile) => {
  const parsed = path.parse(sourceFile);
  let candidate = path.join(processedRoot, `${parsed.name}${parsed.ext}`);
  let sequence = 1;

  for (;;) {
    try {
      await fs.access(candidate);
      candidate = path.join(processedRoot, `${parsed.name}-${sequence}${parsed.ext}`);
      sequence += 1;
    } catch {
      return candidate;
    }
  }
};

const moveToProcessed = async (sourceFile) => {
  const targetFile = await uniqueProcessedTarget(sourceFile);
  await fs.rename(sourceFile, targetFile);
  return targetFile;
};

const main = async () => {
  await ensureVaultLayout();

  const inputFiles = inputFile
    ? [path.resolve(process.cwd(), inputFile)]
    : await listInboxJsonFiles();

  if (!inputFiles.length) {
    console.log(`No JSON files found in ${inboxRoot}`);
    return;
  }

  let importedFileCount = 0;
  let failedFileCount = 0;
  let totalImportedItems = 0;
  let totalSkippedDuplicates = 0;
  let totalReusedExistingItems = 0;

  for (const absoluteInput of inputFiles) {
    try {
      const payload = JSON.parse(await fs.readFile(absoluteInput, "utf8"));
      const result = await importPayloadIntoVault({
        payload,
        originName: absoluteInput
      });

      importedFileCount += 1;
      totalImportedItems += result.records.length;
      totalSkippedDuplicates += result.skippedDuplicates.length;
      totalReusedExistingItems += result.reusedExistingItems.length;

      console.log(
        `Imported ${result.records.length}/${result.normalizedExport.itemCount} new items from ${path.basename(absoluteInput)}`
      );
      if (result.skippedDuplicates.length) {
        console.log(`Skipped duplicates in payload: ${result.skippedDuplicates.length}`);
      }
      if (result.reusedExistingItems.length) {
        console.log(`Reused existing items by URL: ${result.reusedExistingItems.length}`);
      }
      console.log(
        `Issue: ${result.normalizedExport.issueId} ${result.normalizedExport.issueTitle}`
      );

      if (!inputFile) {
        const processedFile = await moveToProcessed(absoluteInput);
        console.log(`Moved to processed: ${processedFile}`);
      }
    } catch (error) {
      failedFileCount += 1;
      console.error(`Failed to import ${absoluteInput}`);
      console.error(error);
    }
  }

  if (inputFiles.length > 1 || !inputFile) {
    console.log(
      `Summary: files imported ${importedFileCount}/${inputFiles.length}, new items ${totalImportedItems}, reused existing ${totalReusedExistingItems}, duplicates skipped ${totalSkippedDuplicates}, failures ${failedFileCount}`
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
