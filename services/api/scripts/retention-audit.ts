import {
    and,
    eq,
    getColumnTable,
    getTableName,
    isNotNull,
    isNull,
    ne,
    notExists,
    sql,
} from "drizzle-orm";
import { getTableConfig, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import type { PostgresTransaction } from "../src/shared-backend/db.js";
import {
    comparisonAnswerTable,
    comparisonResponseTable,
    comparisonUserEntityScoreTable,
    conversationTable,
    conversationParticipantTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingInputAnswerTable,
    rankingInputItemTable,
    rankingInputParticipantTable,
    rankingInputSnapshotTable,
    rankingScoreTable,
    userTable,
} from "../src/shared-backend/schema.js";
import {
    readRetentionCatalog,
    type AuditRelation,
} from "./retention-audit-catalog.js";

export const auditOptionsSchema = z.object({
    rowLimit: z.number().int().min(1).max(10_000).default(1_000),
    statementTimeoutMs: z.number().int().min(1).max(30_000).default(2_000),
    lockTimeoutMs: z.number().int().min(1).max(1_000).default(250),
    maxDurationMs: z.number().int().min(1).max(300_000).default(30_000),
});
export type AuditOptions = z.infer<typeof auditOptionsSchema>;
type Failure =
    | "statement_timeout"
    | "lock_timeout"
    | "permission_denied"
    | "schema_changed"
    | "query_failed"
    | "budget_exhausted";
export type AuditMeasurement =
    | { status: "counted"; count: number; exact: boolean }
    | {
          status: "unavailable";
          reason: Failure | "schema_gap";
          missing?: string[];
      };
interface AuditCheck {
    name: string;
    blocking: boolean;
    dependencies: readonly AnyPgColumn[];
    read: (db: PostgresTransaction) => Promise<readonly unknown[]>;
}

const applicationTables = [
    comparisonResponseTable,
    comparisonAnswerTable,
    comparisonUserEntityScoreTable,
    rankingScoreTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
    rankingInputSnapshotTable,
    rankingInputParticipantTable,
    rankingInputItemTable,
    rankingInputAnswerTable,
    conversationTable,
    conversationParticipantTable,
    userTable,
];
const legacyNames = [
    "maxdiff_result",
    "maxdiff_comparison",
    "maxdiff_user_entity_score",
];

function hasColumn({
    catalog,
    column,
}: {
    catalog: ReadonlyMap<string, AuditRelation>;
    column: AnyPgColumn;
}): boolean {
    return (
        catalog
            .get(getTableName(getColumnTable(column)))
            ?.columns.includes(column.name) === true
    );
}
function missingColumns({
    catalog,
    columns,
}: {
    catalog: ReadonlyMap<string, AuditRelation>;
    columns: readonly AnyPgColumn[];
}): string[] {
    return [
        ...new Set(
            columns
                .filter((column) => !hasColumn({ catalog, column }))
                .map(
                    (column) => `${getTableName(getColumnTable(column))}.${column.name}`,
                ),
        ),
    ];
}

/** Select a bounded number of matching rows, not an unbounded COUNT(*) scan.
 * IDs stay internal and are discarded; the report contains counts only. A LIMIT
 * does not bound rows scanned, so every statement also has a short server timeout.
 */
export function buildRetentionChecks({
    catalog,
    limit,
}: {
    catalog: ReadonlyMap<string, AuditRelation>;
    limit: number;
}): AuditCheck[] {
    const captureInstalled = catalog.has(
        getTableName(rankingInputSnapshotTable),
    );
    const captureColumns = captureInstalled
        ? [
              rankingInputSnapshotTable.id,
              rankingInputSnapshotTable.statsSnapshotId,
              rankingInputSnapshotTable.sealedAt,
              rankingInputSnapshotTable.conversationId,
              rankingInputSnapshotTable.scoringInputRevision,
              rankingInputSnapshotTable.participantCount,
              rankingInputSnapshotTable.itemCount,
              rankingInputSnapshotTable.answerCount,
              rankingConversationStatsSnapshotTable.conversationId,
              rankingConversationStatsSnapshotTable.scoringInputRevision,
              rankingConversationStatsSnapshotTable.participantCount,
              rankingConversationStatsSnapshotTable.itemCount,
              rankingConversationStatsSnapshotTable.voteCount,
          ]
        : [];
    const captureMatchesSnapshot = and(
        eq(
            rankingInputSnapshotTable.statsSnapshotId,
            rankingConversationStatsSnapshotTable.id,
        ),
        isNotNull(rankingInputSnapshotTable.sealedAt),
        eq(
            rankingInputSnapshotTable.conversationId,
            rankingConversationStatsSnapshotTable.conversationId,
        ),
        eq(
            rankingInputSnapshotTable.scoringInputRevision,
            rankingConversationStatsSnapshotTable.scoringInputRevision,
        ),
        eq(
            rankingInputSnapshotTable.participantCount,
            rankingConversationStatsSnapshotTable.participantCount,
        ),
        eq(
            rankingInputSnapshotTable.itemCount,
            rankingConversationStatsSnapshotTable.itemCount,
        ),
        eq(
            rankingInputSnapshotTable.answerCount,
            rankingConversationStatsSnapshotTable.voteCount,
        ),
    );
    const checks: AuditCheck[] = [
        {
            name: "unclassified_legacy_trust_context",
            blocking: true,
            dependencies: [
                rankingScoreTable.id,
                rankingScoreTable.userWeightsSnapshot,
            ],
            read: async (db) =>
                await db
                    .select({ id: rankingScoreTable.id })
                    .from(rankingScoreTable)
                    .where(
                        and(
                            isNotNull(rankingScoreTable.userWeightsSnapshot),
                            ne(
                                rankingScoreTable.userWeightsSnapshot,
                                sql`'null'::jsonb`,
                            ),
                        ),
                    )
                    .limit(limit),
        },
        {
            name: "unfinished_comparison_closes",
            blocking: true,
            dependencies: [
                conversationTable.id,
                conversationTable.rankingConfigId,
                conversationTable.currentContentId,
                conversationTable.isClosed,
                conversationTable.closedFinalizedAt,
                rankingConversationConfigTable.id,
            ],
            read: async (db) =>
                await db
                    .select({ id: conversationTable.id })
                    .from(conversationTable)
                    .innerJoin(
                        rankingConversationConfigTable,
                        eq(
                            rankingConversationConfigTable.id,
                            conversationTable.rankingConfigId,
                        ),
                    )
                    .where(
                        and(
                            isNotNull(conversationTable.currentContentId),
                            eq(conversationTable.isClosed, true),
                            isNull(conversationTable.closedFinalizedAt),
                        ),
                    )
                    .limit(limit),
        },
        {
            name: "retained_snapshots_without_sealed_inputs",
            blocking: true,
            dependencies: [
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsSnapshotTable.deletedAt,
                ...captureColumns,
            ],
            read: async (db) =>
                await db
                    .select({ id: rankingConversationStatsSnapshotTable.id })
                    .from(rankingConversationStatsSnapshotTable)
                    .where(
                        and(
                            isNull(
                                rankingConversationStatsSnapshotTable.deletedAt,
                            ),
                            captureInstalled
                                ? notExists(
                                      db
                                          .select({
                                              id: rankingInputSnapshotTable.id,
                                          })
                                          .from(rankingInputSnapshotTable)
                                          .where(captureMatchesSnapshot),
                                  )
                                : undefined,
                        ),
                    )
                    .limit(limit),
        },
        {
            name: "current_scores_without_sealed_inputs",
            blocking: true,
            dependencies: [
                rankingConversationConfigTable.id,
                rankingConversationConfigTable.currentRankingScoreId,
                conversationTable.id,
                conversationTable.rankingConfigId,
                ...(captureInstalled
                    ? [
                          rankingConversationStatsSnapshotTable.id,
                          rankingConversationStatsSnapshotTable.rankingScoreId,
                          rankingConversationStatsSnapshotTable.deletedAt,
                          ...captureColumns,
                      ]
                    : []),
            ],
            read: async (db) =>
                await db
                    .select({ id: rankingConversationConfigTable.id })
                    .from(rankingConversationConfigTable)
                    .innerJoin(
                        conversationTable,
                        eq(
                            conversationTable.rankingConfigId,
                            rankingConversationConfigTable.id,
                        ),
                    )
                    .where(
                        and(
                            isNotNull(
                                rankingConversationConfigTable.currentRankingScoreId,
                            ),
                            captureInstalled
                                ? notExists(
                                      db
                                          .select({
                                              id: rankingInputSnapshotTable.id,
                                          })
                                          .from(rankingInputSnapshotTable)
                                          .innerJoin(
                                              rankingConversationStatsSnapshotTable,
                                              captureMatchesSnapshot,
                                          )
                                          .where(
                                              and(
                                                  eq(
                                                      rankingConversationStatsSnapshotTable.rankingScoreId,
                                                      rankingConversationConfigTable.currentRankingScoreId,
                                                  ),
                                                  isNull(
                                                      rankingConversationStatsSnapshotTable.deletedAt,
                                                  ),
                                                  eq(
                                                      rankingConversationStatsSnapshotTable.conversationId,
                                                      conversationTable.id,
                                                  ),
                                              ),
                                          ),
                                  )
                                : undefined,
                        ),
                    )
                    .limit(limit),
        },
        {
            name: "unsealed_input_captures",
            blocking: true,
            dependencies: [
                rankingInputSnapshotTable.id,
                rankingInputSnapshotTable.sealedAt,
            ],
            read: async (db) =>
                await db
                    .select({ id: rankingInputSnapshotTable.id })
                    .from(rankingInputSnapshotTable)
                    .where(isNull(rankingInputSnapshotTable.sealedAt))
                    .limit(limit),
        },
        {
            name: "unbound_sealed_input_captures",
            blocking: false,
            dependencies: [
                rankingInputSnapshotTable.id,
                rankingInputSnapshotTable.sealedAt,
                rankingInputSnapshotTable.statsSnapshotId,
            ],
            read: async (db) =>
                await db
                    .select({ id: rankingInputSnapshotTable.id })
                    .from(rankingInputSnapshotTable)
                    .where(
                        and(
                            isNotNull(rankingInputSnapshotTable.sealedAt),
                            isNull(rankingInputSnapshotTable.statsSnapshotId),
                        ),
                    )
                    .limit(limit),
        },
        {
            name: "linked_comparison_sources_on_purging_accounts",
            blocking: false,
            dependencies: [
                comparisonResponseTable.id,
                comparisonResponseTable.participantId,
                userTable.id,
                userTable.isDeleted,
                userTable.purgeStartedAt,
            ],
            read: async (db) =>
                await db
                    .select({ id: comparisonResponseTable.id })
                    .from(comparisonResponseTable)
                    .innerJoin(
                        userTable,
                        eq(userTable.id, comparisonResponseTable.participantId),
                    )
                    .where(
                        and(
                            eq(userTable.isDeleted, true),
                            isNotNull(userTable.purgeStartedAt),
                        ),
                    )
                    .limit(limit),
        },
    ];
    return checks;
}

const databaseError = z.object({
    code: z.string().optional(),
    cause: z.unknown().optional(),
});
function classifyFailure(error: unknown): Failure {
    let value = error;
    for (let depth = 0; depth < 4; depth += 1) {
        const parsed = databaseError.safeParse(value);
        if (!parsed.success) break;
        switch (parsed.data.code) {
            case "57014":
                return "statement_timeout";
            case "55P03":
                return "lock_timeout";
            case "42501":
                return "permission_denied";
            case "42P01":
            case "42703":
                return "schema_changed";
        }
        value = parsed.data.cause;
    }
    return "query_failed";
}

export function createAuditReader({
    db,
    options,
}: {
    db: PostgresJsDatabase;
    options: AuditOptions;
}) {
    const started = performance.now();
    const read = async <T>(
        run: (tx: PostgresTransaction) => Promise<T>,
    ): Promise<T> => {
        const remaining = Math.floor(
            options.maxDurationMs - (performance.now() - started),
        );
        if (remaining <= 0) throw new Error("audit_budget_exhausted");
        return await db.transaction(
            async (tx) => {
                // Native PostgreSQL session controls, not reads/writes of application
                // data. Each short read-only transaction releases its locks/snapshot.
                await tx.execute(
                    sql`select pg_catalog.set_config('statement_timeout', ${String(Math.min(remaining, options.statementTimeoutMs))}, true), pg_catalog.set_config('lock_timeout', ${String(options.lockTimeoutMs)}, true), pg_catalog.set_config('search_path', 'pg_catalog, public', true)`,
                );
                return await run(tx);
            },
            { accessMode: "read only", isolationLevel: "read committed" },
        );
    };
    const failure = (error: unknown): Failure =>
        performance.now() - started >= options.maxDurationMs
            ? "budget_exhausted"
            : classifyFailure(error);
    return { read, failure };
}

export async function runRetentionAudit({
    db,
    options,
}: {
    db: PostgresJsDatabase;
    options: AuditOptions;
}) {
    const { read, failure } = createAuditReader({ db, options });
    let catalog: ReadonlyMap<string, AuditRelation>;
    let server: { replica: boolean; version: number };
    try {
        // Server metadata only; no application row or connection identity.
        server = await read(
            async (tx) =>
                z
                    .tuple([
                        z.object({
                            replica: z.boolean(),
                            version: z.number().int(),
                        }),
                    ])
                    .parse(
                        await tx.execute(
                            sql`select pg_catalog.pg_is_in_recovery() as replica, pg_catalog.current_setting('server_version_num')::integer as version`,
                        ),
                    )[0],
        );
        catalog = await readRetentionCatalog({
            read,
            names: [
                ...applicationTables.map((table) => getTableName(table)),
                ...legacyNames,
            ],
        });
    } catch (error) {
        return {
            status: "incomplete",
            catalog: { status: "unavailable", reason: failure(error) },
            checks: [],
        };
    }
    const results: {
        name: string;
        blocking: boolean;
        measurement: AuditMeasurement;
    }[] = [];
    for (const check of buildRetentionChecks({
        catalog,
        limit: options.rowLimit + 1,
    })) {
        const missing = missingColumns({
            catalog,
            columns: check.dependencies,
        });
        let measurement: AuditMeasurement;
        if (missing.length > 0)
            measurement = {
                status: "unavailable",
                reason: "schema_gap",
                missing,
            };
        else {
            try {
                const rows = await read(check.read);
                measurement = {
                    status: "counted",
                    count: rows.length,
                    exact: rows.length <= options.rowLimit,
                };
            } catch (error) {
                measurement = { status: "unavailable", reason: failure(error) };
            }
        }
        results.push({
            name: check.name,
            blocking: check.blocking,
            measurement,
        });
    }
    const requiredTriggers = [
        {
            table: rankingInputSnapshotTable,
            names: [
                "ranking_input_binding",
                "ranking_input_seal_required",
                "ranking_input_snapshot_retained",
            ],
        },
        {
            table: rankingInputAnswerTable,
            names: [
                "ranking_input_answer_build",
                "ranking_input_answer_immutable",
                "ranking_input_answer_retained",
            ],
        },
        {
            table: rankingInputItemTable,
            names: [
                "ranking_input_item_build",
                "ranking_input_item_immutable",
                "ranking_input_item_retained",
            ],
        },
        {
            table: rankingInputParticipantTable,
            names: [
                "ranking_input_participant_build",
                "ranking_input_participant_immutable",
                "ranking_input_participant_retained",
            ],
        },
        {
            table: comparisonResponseTable,
            names: ["comparison_source_binding"],
        },
        {
            table: conversationParticipantTable,
            names: ["comparison_account_unlink"],
        },
    ];
    const missingTriggers = requiredTriggers.flatMap(({ table, names }) =>
        names.filter(
            (name) =>
                !catalog
                    .get(getTableName(table))
                    ?.enabledTriggers.includes(name),
        ),
    );
    const requiredIndexes = [
        {
            table: rankingScoreTable,
            names: [
                "ranking_score_conversation_idx",
                "ranking_score_unclassified_context_idx",
            ],
        },
        {
            table: rankingInputSnapshotTable,
            names: [
                "ranking_input_snapshot_conversation_idx",
                "ranking_input_snapshot_prepared_idx",
            ],
        },
    ];
    const missingIndexes = requiredIndexes.flatMap(({ table, names }) =>
        names.filter(
            (name) =>
                !catalog
                    .get(getTableName(table))
                    ?.validIndexNames.includes(name),
        ),
    );
    const missingRelations = applicationTables
        .map((table) => getTableName(table))
        .filter((name) => !catalog.has(name));
    const unclassifiedLegacyRelations = legacyNames.filter((name) =>
        catalog.has(name),
    );
    const schemaGaps = applicationTables.flatMap((table) => {
        // Only capture/source structures are compared with the complete source
        // shape; unrelated service schema changes are not migration obligations here.
        if (
            ![
                "ranking_input_snapshot",
                "ranking_input_answer",
                "ranking_input_item",
                "ranking_input_participant",
                "comparison_response",
                "comparison_answer",
                "comparison_user_entity_score",
            ].includes(getTableName(table))
        )
            return [];
        return missingColumns({
            catalog,
            columns: getTableConfig(table).columns,
        });
    });
    const relationsReport = [
        ...applicationTables.map((table) => getTableName(table)),
        ...legacyNames,
    ].map((name) => {
        const relation = catalog.get(name);
        return relation === undefined
            ? { name, present: false }
            : {
                  name,
                  present: true,
                  estimatedRows: relation.estimatedRows,
                  totalBytes: relation.totalBytes,
                  invalidIndexes: relation.invalidIndexes,
                  unvalidatedConstraints: relation.unvalidatedConstraints,
              };
    });
    const observedBlocker = results.some(
        (result) =>
            result.blocking &&
            result.measurement.status === "counted" &&
            result.measurement.count > 0,
    );
    const incomplete =
        results.some((result) => result.measurement.status === "unavailable") ||
        schemaGaps.length > 0 ||
        missingTriggers.length > 0 ||
        missingIndexes.length > 0 ||
        missingRelations.length > 0 ||
        unclassifiedLegacyRelations.length > 0 ||
        [...catalog.values()].some(
            (relation) =>
                relation.invalidIndexes > 0 ||
                relation.unvalidatedConstraints > 0,
        );
    return {
        status: observedBlocker
            ? "blocked"
            : incomplete
              ? "incomplete"
              : "no_detected_data_blockers",
        server,
        catalog: {
            status: "read",
            relations: relationsReport,
            schemaGaps,
            missingTriggers,
            missingIndexes,
            missingRelations,
            unclassifiedLegacyRelations,
        },
        checks: results,
    };
}
