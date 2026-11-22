// @ts-check
// Record only catalog-proven equivalent operations from the disposable upgrade
// rehearsal. This tool never connects to an application database.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { source } from "./stage_coordinated_migration.mjs";

const path = process.argv[2];
if (path === undefined)
    throw new Error("Supply the disposable catalog audit JSON path.");
const report = z
    .object({
        equivalentIndexes: z.array(
            z.object({ name: z.string().regex(/^\w+$/) }),
        ),
        equivalentChecks: z.array(
            z.object({
                table_name: z.string().regex(/^\w+$/),
                name: z.string().regex(/^\w+$/),
            }),
        ),
    })
    .parse(JSON.parse(await readFile(path, "utf8")));
const draft = await readFile(
    new URL(`../drizzle/${source}/migration.sql`, import.meta.url),
    "utf8",
);
const drops = new Set(
    [...draft.matchAll(/DROP INDEX "(\w+)";/g)].map((match) => match[1]),
);
const replacements = new Set(
    [
        ...draft.matchAll(
            /ALTER TABLE "(\w+)" DROP CONSTRAINT "(\w+)", ADD CONSTRAINT "\w+" CHECK/g,
        ),
    ].map((match) => `${match[1]}.${match[2]}`),
);
const indexes = report.equivalentIndexes
    .map(({ name }) => name)
    .filter((name) => drops.has(name))
    .sort();
const checks = report.equivalentChecks
    .map(({ table_name, name }) => `${table_name}.${name}`)
    .filter((key) => replacements.has(key))
    .sort();
if (indexes.length !== 94 || checks.length !== 116)
    throw new Error(
        "Catalog audit differs; review the no-op inventory before recording it.",
    );
await writeFile(
    fileURLToPath(
        new URL("./coordinated_migration_noops.mjs", import.meta.url),
    ),
    "// Generated from PostgreSQL catalog equality in the populated upgrade rehearsal.\n" +
        "// The final-schema parity regression verifies that omitting these changes loses no structure.\n" +
        `export const equivalentIndexRebuilds = ${JSON.stringify(indexes, null, 4)};\n` +
        `export const equivalentCheckReplacements = ${JSON.stringify(checks, null, 4)};\n`,
);
