import { config as loadEnv } from "dotenv";
import { createInterface } from "node:readline";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { withReplicas } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { z } from "zod";
import { sharedConfigSchema } from "../src/shared-backend/config.js";
import { getPrimaryDatabase } from "../src/shared-backend/db.js";
import {
    rankingDiagnosticsRequest,
    rankingDiagnosticsReply,
} from "../src/shared-backend/rankingDiagnosticsProtocol.js";
import { buildRankingDiagnosticsQuery } from "./ranking-diagnostics-queries.js";
import { fetchQueryStatistics } from "./ranking-diagnostics-postgres.js";

// Source-only diagnostics process. It has no HTTP listener or API app import.
loadEnv({ quiet: true });
function send(value: unknown): void {
    process.stdout.write(
        JSON.stringify(rankingDiagnosticsReply.parse(value)) + "\n",
    );
}
function localConnectionString(value: string | undefined): string {
    if (value === undefined)
        throw new Error(
            "Configure the API's local database connection strings",
        );
    const url = new URL(value);
    // Existing local API configurations use the wildcard address for clients.
    if (url.hostname === "0.0.0.0") url.hostname = "127.0.0.1";
    if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
        throw new Error("Diagnostics require local PostgreSQL connections");
    return url.toString();
}
async function main(): Promise<void> {
    const config = sharedConfigSchema
        .extend({
            PERF_CONNECTION_STRING: z.string().optional(),
            PERF_CONNECTION_STRING_READ: z.string().optional(),
        })
        .parse(process.env);
    const options = {
        max: 1,
        prepare: false,
        connect_timeout: 5,
        connection: {
            application_name: "ranking_performance_monitor",
            default_transaction_read_only: true,
            statement_timeout: 10000,
        },
    };
    const primaryUrl = localConnectionString(
        config.PERF_CONNECTION_STRING ?? config.CONNECTION_STRING,
    );
    const replicaUrl = localConnectionString(
        config.PERF_CONNECTION_STRING_READ ?? config.CONNECTION_STRING_READ,
    );
    const primary = postgres(primaryUrl, options);
    const replica = postgres(replicaUrl, options);
    const writer = drizzle(primary);
    const reader = drizzle(replica);
    const db = withReplicas(writer, [reader]);
    let input: ReturnType<typeof createInterface> | undefined;
    try {
        const identity = z.array(
            z.object({
                database: z.string(),
                read_only: z.literal("on"),
                stats_access: z.boolean(),
            }),
        );
        const identityQuery = sql`select current_database() as database, current_setting('transaction_read_only') as read_only, pg_has_role(current_user, 'pg_read_all_stats', 'MEMBER') as stats_access`;
        const primaryIdentity = identity.parse(
            await writer.execute(identityQuery),
        );
        const replicaIdentity = identity.parse(
            await reader.execute(identityQuery),
        );
        send({
            id: 0,
            ok: true,
            data: {
                primary: primaryIdentity.at(0)?.database,
                replica: replicaIdentity.at(0)?.database,
                pid: process.pid,
                primaryPort: Number(new URL(primaryUrl).port || 5432),
                replicaPort: Number(new URL(replicaUrl).port || 5432),
                primaryStatsAccess: primaryIdentity.at(0)?.stats_access,
                replicaStatsAccess: replicaIdentity.at(0)?.stats_access,
            },
        });
        input = createInterface({ input: process.stdin, crlfDelay: Infinity });
        for await (const line of input) {
            let parsed;
            try {
                parsed = rankingDiagnosticsRequest.safeParse(JSON.parse(line));
            } catch {
                send({ id: 0, ok: false, error: "invalid_request" });
                continue;
            }
            if (!parsed.success) {
                send({ id: 0, ok: false, error: "invalid_request" });
                continue;
            }
            const request = parsed.data;
            try {
                // Normal selects use the replica. Writer reads are explicit only
                // for authoritative baselines, pinned snapshots and comparisons.
                const readDb =
                    request.role === "primary" ? getPrimaryDatabase(db) : db;
                if (request.operation === "query-stats") {
                    send({
                        id: request.id,
                        ok: true,
                        data: await fetchQueryStatistics(readDb),
                    });
                    continue;
                }
                const query = buildRankingDiagnosticsQuery({
                    db: readDb,
                    request,
                });
                if (request.operation === "plan") {
                    const rows = z
                        .array(
                            z.object({
                                "QUERY PLAN": z.array(
                                    z.record(z.string(), z.json()),
                                ),
                            }),
                        )
                        .parse(
                            await getPrimaryDatabase(db).execute(
                                sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
                            ),
                        );
                    send({
                        id: request.id,
                        ok: true,
                        data: rows.at(0)?.["QUERY PLAN"] ?? [],
                    });
                } else {
                    // Drizzle owns parameter binding and result mapping. Normalize
                    // dates for the shared JSON protocol at the process boundary.
                    const rows = await query;
                    const data = rows.map((row) =>
                        "published_at" in row
                            ? {
                                  ...row,
                                  published_at:
                                      row.published_at?.toISOString() ?? null,
                              }
                            : row,
                    );
                    send({ id: request.id, ok: true, data });
                }
            } catch {
                send({ id: request.id, ok: false, error: "database_error" });
            }
        }
    } finally {
        input?.close();
        await Promise.all([
            primary.end({ timeout: 2 }),
            replica.end({ timeout: 2 }),
        ]);
    }
}
try {
    await main();
} catch {
    send({ id: 0, ok: false, error: "configuration_error" });
    process.exitCode = 1;
}
