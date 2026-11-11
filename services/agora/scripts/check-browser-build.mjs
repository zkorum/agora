import { readFile, readdir } from "node:fs/promises";

import { parse } from "espree";

const assetsDirectory = new URL("../dist/spa/assets/", import.meta.url);
const legacyFiles = (await readdir(assetsDirectory)).filter(
  (file) => file.includes("-legacy-") && file.endsWith(".js")
);

if (!legacyFiles.some((file) => file.startsWith("polyfills-legacy-"))) {
  throw new Error("Missing legacy polyfill bundle");
}
if (!legacyFiles.some((file) => file.startsWith("index-legacy-"))) {
  throw new Error("Missing legacy application bundle");
}

for (const file of legacyFiles) {
  const code = await readFile(new URL(file, assetsDirectory), "utf8");
  try {
    // Vue's browser contract requires native ES2016, including in lazy chunks.
    parse(code, { ecmaVersion: 2016, sourceType: "script" });
  } catch (error) {
    throw new Error(`Unsupported legacy syntax in ${file}`, { cause: error });
  }
}

console.info(`Verified ES2016 syntax in ${legacyFiles.length} legacy bundles`);
