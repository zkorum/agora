import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { z } from "zod";
import { zodImportWorkerContracts } from "../src/service/importQueueContract.js";

function isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function removeJsonSchemaSafeIntegerBounds(value: unknown): void {
    if (Array.isArray(value)) {
        for (const item of value) {
            removeJsonSchemaSafeIntegerBounds(item);
        }
        return;
    }
    if (!isJsonObject(value)) {
        return;
    }

    if (value.type === "integer") {
        if (value.minimum === -9007199254740991) {
            delete value.minimum;
        }
        if (value.maximum === 9007199254740991) {
            delete value.maximum;
        }
    }

    for (const child of Object.values(value)) {
        removeJsonSchemaSafeIntegerBounds(child);
    }
}

if (process.argv.length < 3) {
    throw new Error(
        "Usage: tsx scripts/export-import-worker-contract-schema.ts <output-path>",
    );
}
const outputPath = process.argv[2];

const schema = z.toJSONSchema(zodImportWorkerContracts, {
    io: "input",
});
removeJsonSchemaSafeIntegerBounds(schema);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`);
