import {
  selectPendingEnrichmentRows,
  writeEnrichmentBatchPayload
} from "./lib/enrichment.mjs";
import { openVaultDatabase } from "./lib/vault.mjs";

const rawLimitArg = process.argv[2];
const rawSourceArg = process.argv[3];
const sourceArg =
  rawSourceArg || (rawLimitArg && Number.isNaN(Number(rawLimitArg)) ? rawLimitArg : null);
const limitArg =
  rawLimitArg === undefined || Number.isNaN(Number(rawLimitArg)) ? null : Number(rawLimitArg);
const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : null;
const sourceName = sourceArg ? String(sourceArg).trim() : null;

const main = async () => {
  const db = openVaultDatabase();

  try {
    const rows = selectPendingEnrichmentRows(db, limit, sourceName);
    const { payload, relativePath } = await writeEnrichmentBatchPayload(rows);

    console.log(
      `Prepared enrichment batch with ${payload.items.length} pending items${sourceName ? ` for ${sourceName}` : ""}`
    );
    console.log(`Saved to vault/${relativePath}`);
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
