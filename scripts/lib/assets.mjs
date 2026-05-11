import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { vaultRoot } from "./vault.mjs";
import { extractYear, slugify } from "./normalize.mjs";

const assetsRoot = path.join(vaultRoot, "assets");

const extensionFromMime = (mimeType) => {
  const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
  switch (normalized) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    case "image/svg+xml":
      return "svg";
    default:
      return "";
  }
};

const extensionFromUrl = (url) => {
  try {
    return path.extname(new URL(url).pathname).replace(/^\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const fileExists = async (filepath) => {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
};

const resizeWithSips = async (inputPath, outputPath, maxSize) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "/usr/bin/sips",
      ["-s", "format", "jpeg", "-Z", String(maxSize), inputPath, "--out", outputPath],
      { stdio: "ignore" }
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`sips exited with code ${code}`));
    });
  });

const relativeAssetPath = (...parts) => path.posix.join("assets", ...parts);

export const ensureImageAssets = async (record) => {
  if (!record.sourceImageUrl) {
    return record;
  }

  const year = extractYear(record.collectedAt);
  const itemBase = `${record.id}-${slugify(record.title, "item")}`;
  const targetDir = path.join(assetsRoot, record.sourceName, year);
  await fs.mkdir(targetDir, { recursive: true });

  let sourceImagePath = record.sourceImagePath || "";
  let previewImagePath = record.previewImagePath || "";
  let thumbnailPath = record.thumbnailPath || "";
  let heroImagePath = record.heroImagePath || "";

  const existingSourcePath = sourceImagePath ? path.join(vaultRoot, sourceImagePath) : "";
  if (!sourceImagePath || !(await fileExists(existingSourcePath))) {
    try {
      const response = await fetch(record.sourceImageUrl, { redirect: "follow" });
      if (!response.ok) {
        return record;
      }

      const extension =
        extensionFromMime(response.headers.get("content-type")) ||
        extensionFromUrl(record.sourceImageUrl) ||
        "jpg";
      const sourceFilename = `${itemBase}-source.${extension}`;
      const sourceAbsolutePath = path.join(targetDir, sourceFilename);
      const buffer = Buffer.from(await response.arrayBuffer());

      await fs.writeFile(sourceAbsolutePath, buffer);
      sourceImagePath = relativeAssetPath(record.sourceName, year, sourceFilename);
    } catch {
      return record;
    }
  }

  const sourceAbsolutePath = path.join(vaultRoot, sourceImagePath);
  const previewFilename = `${itemBase}-preview.jpg`;
  const thumbnailFilename = `${itemBase}-thumb.jpg`;
  const heroFilename = `${itemBase}-hero.jpg`;

  const previewAbsolutePath = path.join(targetDir, previewFilename);
  const thumbnailAbsolutePath = path.join(targetDir, thumbnailFilename);
  const heroAbsolutePath = path.join(targetDir, heroFilename);

  try {
    if (!(await fileExists(previewAbsolutePath))) {
      await resizeWithSips(sourceAbsolutePath, previewAbsolutePath, 900);
    }
    previewImagePath = relativeAssetPath(record.sourceName, year, previewFilename);
  } catch {
    previewImagePath = sourceImagePath;
  }

  try {
    if (!(await fileExists(thumbnailAbsolutePath))) {
      await resizeWithSips(sourceAbsolutePath, thumbnailAbsolutePath, 420);
    }
    thumbnailPath = relativeAssetPath(record.sourceName, year, thumbnailFilename);
  } catch {
    thumbnailPath = previewImagePath || sourceImagePath;
  }

  try {
    if (!(await fileExists(heroAbsolutePath))) {
      await resizeWithSips(sourceAbsolutePath, heroAbsolutePath, 1200);
    }
    heroImagePath = relativeAssetPath(record.sourceName, year, heroFilename);
  } catch {
    heroImagePath = previewImagePath || sourceImagePath;
  }

  return {
    ...record,
    sourceImagePath,
    previewImagePath,
    thumbnailPath,
    heroImagePath
  };
};
