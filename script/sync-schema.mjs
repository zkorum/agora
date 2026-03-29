#!/usr/bin/env node

/**
 * Schema Codegen Pipeline: Drizzle schema.ts → filtered SQL → Pydantic v2 models
 *
 * Reads @service annotations from schema.ts, filters drizzle-kit export SQL
 * to only include tables tagged for the target service, then generates
 * Pydantic v2 models directly (no external codegen tool).
 *
 * Usage:
 *   node script/sync-schema.mjs \
 *     --service scoring-worker \
 *     --schema-ts services/shared-backend/src/schema.ts \
 *     --sql /tmp/agora-schema.sql \
 *     --output services/scoring-worker/src/scoring_worker/generated_models.py
 */

import { readFileSync, writeFileSync } from "node:fs";

// --- Parse CLI args ---

const args = process.argv.slice(2);
function getArg(name) {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || idx + 1 >= args.length) {
        console.error(`Missing required argument: --${name}`);
        process.exit(1);
    }
    return args[idx + 1];
}

const targetService = getArg("service");
const schemaPath = getArg("schema-ts");
const sqlPath = getArg("sql");
const outputPath = getArg("output");

// --- Step 1: Parse @service annotations from schema.ts ---

const schemaTs = readFileSync(schemaPath, "utf-8");

const annotationRegex =
    /\/\*\*\s*@service\s+([^*]+)\*\/\s*\n\s*(?:\/\/[^\n]*\n\s*)*export\s+const\s+\w+\s*=\s*pgTable\(\s*"(\w+)"/g;

const taggedTables = new Map();
let match;
while ((match = annotationRegex.exec(schemaTs)) !== null) {
    const services = match[1]
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    const tableName = match[2];
    taggedTables.set(tableName, new Set(services));
}

const allowedTables = new Set();
for (const [table, services] of taggedTables) {
    if (services.has(targetService)) {
        allowedTables.add(table);
    }
}

console.log(
    `[sync-schema] ${allowedTables.size} table(s) tagged for "${targetService}":`,
);
for (const t of allowedTables) {
    console.log(`  - ${t}`);
}

if (allowedTables.size === 0) {
    console.error(
        `[sync-schema] No tables tagged for service "${targetService}".`,
    );
    process.exit(1);
}

// --- Step 2: Parse CREATE TABLE statements from SQL DDL ---

const fullSql = readFileSync(sqlPath, "utf-8");

// Extract CREATE TABLE blocks. Each block ends with ");"
const tableRegex =
    /CREATE\s+TABLE\s+"(\w+)"\s*\(([\s\S]*?)\);/g;

/** @type {Map<string, Array<{name: string, sqlType: string, nullable: boolean, hasDefault: boolean, defaultValue: string | null}>>} */
const tables = new Map();

while ((match = tableRegex.exec(fullSql)) !== null) {
    const tableName = match[1];
    if (!allowedTables.has(tableName)) continue;

    const body = match[2];
    const columns = [];

    // Parse each column line
    for (const line of body.split("\n")) {
        const trimmed = line.trim().replace(/,$/, "");
        if (!trimmed || trimmed.startsWith("CONSTRAINT")) continue;

        // Match: "column_name" type [NOT NULL] [DEFAULT ...]
        const colMatch = trimmed.match(
            /^"(\w+)"\s+(.+?)$/,
        );
        if (!colMatch) continue;

        const colName = colMatch[1];
        let rest = colMatch[2];

        // Skip generated identity columns' sequence details but keep the type
        const nullable = !rest.includes("NOT NULL");
        const hasDefault =
            rest.includes("DEFAULT") ||
            rest.includes("GENERATED");

        // Extract default value
        let defaultValue = null;
        const defaultMatch = rest.match(/DEFAULT\s+(.+?)(?:\s+NOT NULL|\s*$)/i);
        if (defaultMatch) {
            defaultValue = defaultMatch[1].trim();
        }

        // Clean up type: remove constraints, keep just the SQL type
        let sqlType = rest
            .replace(/\s+NOT NULL/g, "")
            .replace(/\s+NULL/g, "")
            .replace(/DEFAULT\s+\S+/g, "")
            .replace(/PRIMARY KEY/g, "")
            .replace(/GENERATED ALWAYS AS IDENTITY\s*\([^)]*\)/g, "")
            .replace(/UNIQUE/g, "")
            .trim();

        // Normalize
        sqlType = sqlType.replace(/\s+/g, " ").trim();
        if (sqlType.length === 0) sqlType = "integer"; // fallback for identity columns

        columns.push({ name: colName, sqlType, nullable, hasDefault, defaultValue });
    }

    if (columns.length > 0) {
        tables.set(tableName, columns);
    }
}

// Also extract referenced enums
// Format: CREATE TYPE "public"."enum_name" AS ENUM(...)
const enumRegex =
    /CREATE\s+TYPE\s+"(?:public"\.)?"?(\w+)"?\s+AS\s+ENUM\s*\(([^)]+)\)/g;

/** @type {Map<string, string[]>} */
const enums = new Map();
while ((match = enumRegex.exec(fullSql)) !== null) {
    const enumName = match[1];
    const values = match[2]
        .split(",")
        .map((v) => v.trim().replace(/^'|'$/g, ""));
    enums.set(enumName, values);
}

// --- Step 3: Map SQL types to Python types ---

const SQL_TO_PYTHON = {
    integer: "int",
    bigint: "int",
    smallint: "int",
    serial: "int",
    real: "float",
    "double precision": "float",
    numeric: "float",
    boolean: "bool",
    text: "str",
    uuid: "UUID",
    jsonb: "Any",
    json: "Any",
    timestamp: "datetime",
    date: "date",
};

function sqlTypeToPython(sqlType) {
    // Strip surrounding quotes (drizzle-kit emits quoted enum references: "conversation_type")
    const stripped = sqlType.replace(/^"|"$/g, "").trim();
    const lower = stripped.toLowerCase();

    // varchar(N) → str
    if (lower.startsWith("varchar")) return "str";

    // text[] → list[str]
    if (lower === "text[]") return "list[str]";

    // integer[] → list[int]
    if (lower === "integer[]") return "list[int]";

    // Check enum types
    for (const [enumName] of enums) {
        if (lower === enumName) return toPascalCase(enumName);
    }

    // Handle "timestamp (N)" variants
    if (lower.startsWith("timestamp")) return "datetime";

    // Direct lookup
    for (const [sqlKey, pyType] of Object.entries(SQL_TO_PYTHON)) {
        if (lower.startsWith(sqlKey)) return pyType;
    }

    return "Any"; // fallback
}

function toPascalCase(snake) {
    return snake
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");
}

function toSnakeCase(name) {
    return name; // already snake_case from SQL
}

// --- Step 4: Determine which enums are actually used ---

const usedEnums = new Set();
for (const [, columns] of tables) {
    for (const col of columns) {
        const lower = col.sqlType.replace(/^"|"$/g, "").toLowerCase().trim();
        for (const [enumName] of enums) {
            if (lower === enumName) {
                usedEnums.add(enumName);
            }
        }
    }
}

// --- Step 5: Generate Python code ---

const needsUUID = [...tables.values()].some((cols) =>
    cols.some((c) => c.sqlType.toLowerCase().includes("uuid")),
);
const needsDatetime = [...tables.values()].some((cols) =>
    cols.some((c) => c.sqlType.toLowerCase().startsWith("timestamp")),
);
const needsAny = [...tables.values()].some((cols) =>
    cols.some((c) =>
        c.sqlType.toLowerCase().includes("jsonb") ||
        c.sqlType.toLowerCase().includes("json"),
    ),
);

const tableList = Array.from(tables.keys()).join(", ");
// Keep header lines short enough for ruff (100 char line limit)
let output = `# WARNING: GENERATED FROM shared-backend/src/schema.ts
# DO NOT MODIFY -- Re-generate with: make sync-python-models
# Service: ${targetService}

from __future__ import annotations

`;

// Build stdlib typing imports (merged into one line if both needed)
const typingNames = ["TYPE_CHECKING"];
if (needsAny) typingNames.push("Any");

// Stdlib imports block (sorted by module name)
const stdlibLines = [];
if (usedEnums.size > 0) stdlibLines.push("from enum import StrEnum");
stdlibLines.push(`from typing import ${typingNames.join(", ")}`);

// Third-party imports block
const thirdPartyLines = [];
thirdPartyLines.push("from pydantic import BaseModel");

// TYPE_CHECKING block (stdlib types only used in annotations, sorted)
const tcLines = [];
if (needsDatetime) tcLines.push("    from datetime import datetime");
if (needsUUID) tcLines.push("    from uuid import UUID");

output += stdlibLines.join("\n") + "\n";
output += "\n" + thirdPartyLines.join("\n") + "\n";
if (tcLines.length > 0) {
    output += `\nif TYPE_CHECKING:\n${tcLines.join("\n")}\n`;
}

// Enums (only used ones, use StrEnum for Python 3.11+)
for (const enumName of usedEnums) {
    const values = enums.get(enumName);
    const className = toPascalCase(enumName);
    output += `\n\nclass ${className}(StrEnum):\n`;
    for (const v of values) {
        const attrName = v.replace(/-/g, "_");
        output += `    ${attrName} = "${v}"\n`;
    }
}

// Models
for (const [tableName, columns] of tables) {
    const className = toPascalCase(tableName);
    output += `\n\nclass ${className}(BaseModel):\n`;
    output += `    """Table: ${tableName}"""\n\n`;

    for (const col of columns) {
        const pyType = sqlTypeToPython(col.sqlType);
        const fieldName = toSnakeCase(col.name);

        let typeAnnotation;
        if (col.nullable) {
            typeAnnotation = `${pyType} | None`;
        } else {
            typeAnnotation = pyType;
        }

        // Add default for nullable or default-having columns
        if (col.nullable && col.hasDefault) {
            output += `    ${fieldName}: ${typeAnnotation} = None\n`;
        } else if (col.nullable) {
            output += `    ${fieldName}: ${typeAnnotation} = None\n`;
        } else if (col.hasDefault && col.defaultValue !== null) {
            // Map SQL defaults to Python
            let pyDefault;
            if (col.defaultValue === "true") pyDefault = "True";
            else if (col.defaultValue === "false") pyDefault = "False";
            else if (col.defaultValue === "now()") pyDefault = "None";
            else if (col.defaultValue.match(/^-?\d+$/))
                pyDefault = col.defaultValue;
            else pyDefault = "None";

            if (pyDefault === "None") {
                output += `    ${fieldName}: ${typeAnnotation} | None = None\n`;
            } else {
                output += `    ${fieldName}: ${typeAnnotation} = ${pyDefault}\n`;
            }
        } else {
            output += `    ${fieldName}: ${typeAnnotation}\n`;
        }
    }
}

output += "\n";

writeFileSync(outputPath, output);
console.log(
    `[sync-schema] Generated ${outputPath} (${tables.size} table(s), ${usedEnums.size} enum(s))`,
);
