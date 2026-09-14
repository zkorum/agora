import { and, desc, eq, notLike, sql } from "drizzle-orm";
import {
    bigint,
    boolean,
    customType,
    doublePrecision,
    numeric,
    pgSchema,
    pgView,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

const oid = customType<{ data: number; driverData: number }>({
    dataType: () => "oid",
});
// Existing PostgreSQL objects, scoped to diagnostics tooling. These definitions
// are not part of the application migration schema and create no database objects.
const databases = pgSchema("pg_catalog").table("pg_database", {
    oid: oid("oid"),
    name: text("datname").notNull(),
});
const statements = pgView("pg_stat_statements", {
    userId: oid("userid"),
    databaseId: oid("dbid"),
    topLevel: boolean("toplevel"),
    queryId: bigint("queryid", { mode: "bigint" }),
    query: text("query"),
    calls: bigint("calls", { mode: "number" }),
    rows: bigint("rows", { mode: "number" }),
    totalExecTime: doublePrecision("total_exec_time"),
    sharedHits: bigint("shared_blks_hit", { mode: "number" }),
    sharedReads: bigint("shared_blks_read", { mode: "number" }),
    tempWrites: bigint("temp_blks_written", { mode: "number" }),
    walBytes: numeric("wal_bytes"),
    readTime: doublePrecision("blk_read_time"),
    writeTime: doublePrecision("blk_write_time"),
}).existing();
const info = pgView("pg_stat_statements_info", {
    reset: timestamp("stats_reset", { withTimezone: true }),
    dealloc: bigint("dealloc", { mode: "number" }),
}).existing();

export function buildQueryStatisticsQuery(db: PostgresJsDatabase) {
    return db
        .select({
            user_id: sql<string>`${statements.userId}::text`,
            toplevel: statements.topLevel,
            queryid: sql<string>`${statements.queryId}::text`,
            query: sql<string>`left(${statements.query}, 4000)`,
            calls: statements.calls,
            total_exec_time: statements.totalExecTime,
            rows: statements.rows,
            shared_blks_hit: statements.sharedHits,
            shared_blks_read: statements.sharedReads,
            temp_blks_written: statements.tempWrites,
            wal_bytes: sql<number>`${statements.walBytes}::float8`,
            blk_read_time: statements.readTime,
            blk_write_time: statements.writeTime,
        })
        .from(statements)
        .where(
            and(
                eq(
                    statements.databaseId,
                    db
                        .select({ oid: databases.oid })
                        .from(databases)
                        .where(eq(databases.name, sql`current_database()`)),
                ),
                sql`${statements.query} ~* ${"(maxdiff|ranking_|survey_|device|auth_)"}`,
                notLike(statements.query, "%pg_stat_%"),
                notLike(statements.query, "%ranking-performance-monitor%"),
                sql`${statements.query} ~* ${"^[[:space:]]*(SELECT|INSERT|UPDATE|DELETE|WITH)([[:space:](]|$)"}`,
            ),
        )
        .orderBy(desc(statements.totalExecTime))
        .limit(500);
}
export async function fetchQueryStatistics(db: PostgresJsDatabase) {
    const states = await db
        .select({
            reset: sql<string | null>`${info.reset}::text`,
            dealloc: info.dealloc,
        })
        .from(info);
    const state = states.at(0);
    if (state === undefined)
        throw new Error("PostgreSQL statement statistics are unavailable");
    return {
        reset: state.reset,
        dealloc: state.dealloc,
        queries: await buildQueryStatisticsQuery(db),
    };
}
