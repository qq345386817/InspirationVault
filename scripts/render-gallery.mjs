import { loadGalleryData, renderGallerySite } from "./lib/gallery-site.mjs";
import { openVaultDatabase } from "./lib/vault.mjs";

const main = async () => {
  const db = openVaultDatabase();

  try {
    const data = loadGalleryData(db);
    const output = await renderGallerySite(data);

    console.log(`Rendered gallery with ${data.totalItems} items`);
    console.log(`HTML: ${output.indexPath}`);
    console.log(`Data: ${output.dataPath}`);
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
