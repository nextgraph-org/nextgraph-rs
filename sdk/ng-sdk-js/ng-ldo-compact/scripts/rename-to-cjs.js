#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { readdir, rename } = require("fs/promises");
const { join, extname } = require("path");

const root = process.argv[2] || "./dist/cjs";

async function renameJsToCjs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await renameJsToCjs(fullPath);
    } else if (entry.isFile() && extname(entry.name) === ".js") {
      const newPath = fullPath.replace(/\.js$/, ".cjs");
      console.log(`Renaming ${fullPath} → ${newPath}`);
      await rename(fullPath, newPath);
    }
  }
}

renameJsToCjs(root).catch((err) => {
  console.error("Rename failed:", err);
  process.exit(1);
});
