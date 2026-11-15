import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { getTableName, is, SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/shared-backend/schema.js";

const dialect = new PgDialect();
const tables = Object.values(schema).filter((value) => is(value, PgTable));
const inventory = tables
    .map((table) => {
        const config = getTableConfig(table);
        return {
            table: config.name,
            columns: config.columns.map((column) => ({
                name: column.name,
                type: column.getSQLType(),
                nullable: !column.notNull,
                primaryKey: column.primary,
            })),
            foreignKeys: config.foreignKeys.map((foreignKey) => {
                const reference = foreignKey.reference();
                return {
                    name: foreignKey.getName(),
                    columns: reference.columns.map((column) => column.name),
                    targetTable: getTableName(reference.foreignTable),
                    targetColumns: reference.foreignColumns.map(
                        (column) => column.name,
                    ),
                    onDelete: foreignKey.onDelete,
                };
            }),
            checks: config.checks.map((check) => ({
                name: check.name,
                expression: dialect.sqlToQuery(check.value).sql,
            })),
            uniqueConstraints: config.uniqueConstraints.map((constraint) => ({
                name: constraint.name,
                columns: constraint.columns.map((column) => column.name),
            })),
            indexes: config.indexes.map(({ config: index }) => ({
                name: index.name,
                unique: index.unique,
                columns: index.columns.map((column) =>
                    is(column, SQL)
                        ? dialect.sqlToQuery(column).sql
                        : z.object({ name: z.string() }).parse(column).name,
                ),
                predicate:
                    index.where === undefined
                        ? undefined
                        : dialect.sqlToQuery(index.where).sql,
            })),
        };
    })
    .sort((first, second) => first.table.localeCompare(second.table));

await writeFile(
    new URL("../../../doc/deletion-dependency-inventory.json", import.meta.url),
    `${JSON.stringify(
        {
            generatedBy:
                "services/api/scripts/export-deletion-dependency-inventory.ts",
            schemaSource:
                "services/shared-backend/src/schema.ts (sync before generating)",
            note: "Structural inventory only. Semantic copies and lifecycle ownership are reviewed separately in doc/deletion-dependency-contracts.md.",
            tables: inventory,
        },
        undefined,
        2,
    )}\n`,
);
console.info(
    `Exported ${String(inventory.length)} canonical tables and ${String(inventory.reduce((count, table) => count + table.foreignKeys.length, 0))} foreign keys`,
);
for (const table of inventory) {
    const references = table.foreignKeys.filter(
        (reference) => reference.targetTable === "user",
    );
    if (references.length > 0)
        console.info(
            `${table.table}: ${references.map((reference) => reference.columns.map((name) => `${name}${table.columns.find((column) => column.name === name)?.nullable ? "?" : " (required)"}`).join("+")).join(", ")}`,
        );
}
for (const table of inventory) {
    const copies = table.columns.filter((column) =>
        /json|bytea|\[\]/.test(column.type),
    );
    if (copies.length > 0)
        console.info(
            `Semantic copies ${table.table}: ${copies.map((column) => column.name).join(", ")}`,
        );
}
