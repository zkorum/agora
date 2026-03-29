#!/usr/bin/env npx tsx
/**
 * CLI entrypoint for schema codegen.
 * Reads files, calls pure functions from sync-schema-lib, writes output.
 *
 * Usage:
 *   npx tsx scripts/sync-schema-cli.ts \
 *     --service scoring-worker \
 *     --schema-ts src/schema.ts \
 *     --sql /tmp/agora-schema.sql \
 *     --output ../../scoring-worker/src/scoring_worker/generated_models.py
 */

import { readFileSync, writeFileSync } from "node:fs";
import {
    parseServiceAnnotations,
    filterTablesForService,
    parseSqlTables,
    parseEnums,
    generateSqlAlchemyModels,
} from "./sync-schema-lib.js";

function getArg(name: string): string {
    const idx = process.argv.indexOf(`--${name}`);
    if (idx === -1 || idx + 1 >= process.argv.length) {
        console.error(`Missing required argument: --${name}`);
        process.exit(1);
    }
    return process.argv[idx + 1];
}

const service = getArg("service");
const schemaPath = getArg("schema-ts");
const sqlPath = getArg("sql");
const outputPath = getArg("output");

const schemaTs = readFileSync(schemaPath, "utf-8");
const sql = readFileSync(sqlPath, "utf-8");

const annotations = parseServiceAnnotations(schemaTs);
const allowed = filterTablesForService(annotations, service);

if (allowed.size === 0) {
    console.error(
        `[sync-schema] No tables tagged for service "${service}".`,
    );
    process.exit(1);
}

console.log(
    `[sync-schema] ${String(allowed.size)} table(s) tagged for "${service}":`,
);
for (const t of allowed) console.log(`  - ${t}`);

const tables = parseSqlTables(sql, allowed);
const enums = parseEnums(sql);
const output = generateSqlAlchemyModels({ tables, enums, service });

writeFileSync(outputPath, output);
console.log(
    `[sync-schema] Generated ${outputPath} (${String(tables.size)} table(s))`,
);
