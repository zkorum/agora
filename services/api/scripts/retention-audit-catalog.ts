import { and, count, eq, gt, inArray, sql } from "drizzle-orm";
import {
    alias,
    boolean,
    customType,
    doublePrecision,
    integer,
    pgSchema,
    text,
} from "drizzle-orm/pg-core";
import type { PostgresTransaction } from "../src/shared-backend/db.js";

// Diagnostics-only mappings of existing system catalogs; these never create DDL.
const oid = customType<{ data: number; driverData: number }>({
    dataType: () => "oid",
});
const catalog = pgSchema("pg_catalog");
const namespaces = catalog.table("pg_namespace", {
    id: oid("oid").notNull(),
    name: text("nspname").notNull(),
});
const relations = catalog.table("pg_class", {
    id: oid("oid").notNull(),
    namespaceId: oid("relnamespace").notNull(),
    name: text("relname").notNull(),
    kind: text("relkind").notNull(),
    rows: doublePrecision("reltuples").notNull(),
});
const attributes = catalog.table("pg_attribute", {
    relationId: oid("attrelid").notNull(),
    name: text("attname").notNull(),
    number: integer("attnum").notNull(),
    dropped: boolean("attisdropped").notNull(),
});
const indexes = catalog.table("pg_index", {
    indexId: oid("indexrelid").notNull(),
    relationId: oid("indrelid").notNull(),
    valid: boolean("indisvalid").notNull(),
    ready: boolean("indisready").notNull(),
});
const indexRelations = alias(relations, "audit_index_relation");
const constraints = catalog.table("pg_constraint", {
    relationId: oid("conrelid").notNull(),
    validated: boolean("convalidated").notNull(),
});
const triggers = catalog.table("pg_trigger", {
    relationId: oid("tgrelid").notNull(),
    name: text("tgname").notNull(),
    enabled: text("tgenabled").notNull(),
});

export interface AuditRelation {
    name: string;
    estimatedRows: number | undefined;
    totalBytes: string;
    columns: readonly string[];
    invalidIndexes: number;
    validIndexNames: readonly string[];
    unvalidatedConstraints: number;
    enabledTriggers: readonly string[];
}

export type AuditRead = <T>(
    run: (tx: PostgresTransaction) => Promise<T>,
) => Promise<T>;

export async function readRetentionCatalog({
    read,
    names,
}: {
    read: AuditRead;
    names: readonly string[];
}): Promise<ReadonlyMap<string, AuditRelation>> {
    const scope = and(
        eq(namespaces.name, "public"),
        inArray(relations.name, [...names]),
        inArray(relations.kind, ["r", "p"]),
    );
    const tables = await read(
        async (db) =>
            await db
                .select({
                    name: relations.name,
                    estimate: relations.rows,
                    // PostgreSQL relation sizing has no Drizzle helper; return bigint bytes as
                    // text, never round large storage figures through a JavaScript number.
                    bytes: sql<string>`pg_catalog.pg_total_relation_size(${relations.id})::text`,
                })
                .from(relations)
                .innerJoin(namespaces, eq(namespaces.id, relations.namespaceId))
                .where(scope),
    );
    const columns = await read(
        async (db) =>
            await db
                .select({ table: relations.name, column: attributes.name })
                .from(relations)
                .innerJoin(namespaces, eq(namespaces.id, relations.namespaceId))
                .innerJoin(attributes, eq(attributes.relationId, relations.id))
                .where(
                    and(
                        scope,
                        gt(attributes.number, 0),
                        eq(attributes.dropped, false),
                    ),
                ),
    );
    const catalogIndexes = await read(
        async (db) =>
            await db
                .select({
                    table: relations.name,
                    name: indexRelations.name,
                    valid: indexes.valid,
                    ready: indexes.ready,
                })
                .from(relations)
                .innerJoin(namespaces, eq(namespaces.id, relations.namespaceId))
                .innerJoin(indexes, eq(indexes.relationId, relations.id))
                .innerJoin(
                    indexRelations,
                    eq(indexRelations.id, indexes.indexId),
                )
                .where(scope),
    );
    const unvalidated = await read(
        async (db) =>
            await db
                .select({ table: relations.name, total: count() })
                .from(relations)
                .innerJoin(namespaces, eq(namespaces.id, relations.namespaceId))
                .innerJoin(
                    constraints,
                    eq(constraints.relationId, relations.id),
                )
                .where(and(scope, eq(constraints.validated, false)))
                .groupBy(relations.name),
    );
    const installedTriggers = await read(
        async (db) =>
            await db
                .select({ table: relations.name, name: triggers.name })
                .from(relations)
                .innerJoin(namespaces, eq(namespaces.id, relations.namespaceId))
                .innerJoin(triggers, eq(triggers.relationId, relations.id))
                .where(and(scope, inArray(triggers.enabled, ["O", "A"]))),
    );
    return new Map(
        tables.map((table) => [
            table.name,
            {
                name: table.name,
                estimatedRows:
                    table.estimate < 0 ? undefined : Math.round(table.estimate),
                totalBytes: table.bytes,
                columns: columns
                    .filter((column) => column.table === table.name)
                    .map((column) => column.column),
                invalidIndexes: catalogIndexes.filter(
                    (row) =>
                        row.table === table.name && (!row.valid || !row.ready),
                ).length,
                validIndexNames: catalogIndexes
                    .filter(
                        (row) =>
                            row.table === table.name && row.valid && row.ready,
                    )
                    .map((row) => row.name),
                unvalidatedConstraints:
                    unvalidated.find((row) => row.table === table.name)
                        ?.total ?? 0,
                enabledTriggers: installedTriggers
                    .filter((row) => row.table === table.name)
                    .map((row) => row.name),
            },
        ]),
    );
}
