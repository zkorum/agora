#!/usr/bin/env npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
    generateApiTestSchemaFixtures,
    parseApiTestSchemaFixtureConfig,
} from "./api-test-schema-fixtures-lib.js";

function getArg(name: string): string {
    const idx = process.argv.indexOf(`--${name}`);
    if (idx === -1 || idx + 1 >= process.argv.length) {
        console.error(`Missing required argument: --${name}`);
        process.exit(1);
    }
    return process.argv[idx + 1];
}

const sqlPath = getArg("sql");
const configPath = getArg("config");
const outputDir = getArg("output-dir");

const sql = readFileSync(sqlPath, "utf-8");
const config = parseApiTestSchemaFixtureConfig(
    readFileSync(configPath, "utf-8"),
);
const fixtures = generateApiTestSchemaFixtures({ sql, config });

mkdirSync(outputDir, { recursive: true });

for (const [fixtureName, fixtureSql] of fixtures) {
    const outputPath = join(outputDir, `${fixtureName}.sql`);
    writeFileSync(outputPath, fixtureSql);
    console.log(`[sync-api-test-schema] Generated ${outputPath}`);
}
