import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { generatePythonSharedTypes } from "./sync-python-shared-lib.js";

const { values } = parseArgs({
    options: {
        "shared-src": { type: "string" },
        output: { type: "string" },
    },
});

if (values["shared-src"] === undefined || values.output === undefined) {
    throw new Error(
        "Usage: sync-python-shared-cli --shared-src <path> --output <path>",
    );
}

const languagesPath = join(values["shared-src"], "languages.ts");
const sharedPath = join(values["shared-src"], "shared.ts");
const output = generatePythonSharedTypes({
    sources: {
        languagesTs: await readFile(languagesPath, "utf-8"),
        sharedTs: await readFile(sharedPath, "utf-8"),
    },
    sourcePaths: [languagesPath, sharedPath],
});

await writeFile(values.output, output);

console.log(`[sync-python-shared] Generated ${values.output}`);
