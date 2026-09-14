import { z } from "zod";
import {
    revisionsSchema,
    type PerformanceEvent,
    type QuerySnapshot,
    type Revision,
    type Score,
    type Summary,
} from "./protocol.ts";

export function percentiles(values: readonly number[]) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    const at = (p: number): number | null =>
        sorted.at(Math.ceil(sorted.length * p) - 1) ?? null;
    return {
        count: sorted.length,
        p50: at(0.5),
        p95: at(0.95),
        p99: at(0.99),
        max: sorted.at(-1) ?? null,
    };
}

const queryFields = [
    "calls",
    "total_exec_time",
    "rows",
    "shared_blks_hit",
    "shared_blks_read",
    "temp_blks_written",
    "wal_bytes",
    "blk_read_time",
    "blk_write_time",
] as const;
export function queryDeltas({
    before,
    after,
}: {
    before: QuerySnapshot;
    after: QuerySnapshot;
}) {
    if (before.reset !== after.reset || before.dealloc !== after.dealloc) {
        return {
            comparable: false,
            reason: "Query statistics reset or evicted during the run",
            queries: [],
        };
    }
    const key = (row: QuerySnapshot["queries"][number]) =>
        `${row.user_id}/${String(row.toplevel)}/${row.queryid}`;
    const previous = new Map(before.queries.map((row) => [key(row), row]));
    const queries = after.queries
        .map((row) => {
            const old = previous.get(key(row));
            const identity = {
                queryid: row.queryid,
                user_id: row.user_id,
                toplevel: row.toplevel,
                query: row.query,
            };
            const baselineMissing = old === undefined;
            const counterReset =
                old !== undefined &&
                queryFields.some((field) => row[field] < old[field]);
            if (
                (baselineMissing && before.queries.length >= 500) ||
                counterReset
            ) {
                return {
                    ...identity,
                    calls: null,
                    total_exec_time: null,
                    meanExecMs: null,
                    baselineMissing,
                    counterReset,
                };
            }
            const calls = row.calls - (old?.calls ?? 0);
            const total = row.total_exec_time - (old?.total_exec_time ?? 0);
            return {
                ...identity,
                ...Object.fromEntries(
                    queryFields.map((field) => [
                        field,
                        row[field] - (old?.[field] ?? 0),
                    ]),
                ),
                calls,
                total_exec_time: total,
                meanExecMs: calls > 0 ? total / calls : null,
                baselineMissing,
                counterReset,
            };
        })
        .filter((row) => row.calls === null || row.calls > 0)
        .sort((a, b) => (b.total_exec_time ?? 0) - (a.total_exec_time ?? 0));
    return {
        comparable: !queries.some((row) => row.calls === null),
        limitedToTop500MatchingQueries: true,
        queries,
    };
}

interface ConversationMeasurements {
    started: number;
    completed: number;
    failed: number;
    comparisonsSaved: number;
    lastAcceptedWriteAt: string | null;
    publicationAttempts: number;
    publishedSnapshots: number;
    skippedPublications: number;
    firstPublication: string | null;
    lastPublication: string | null;
}
interface FreshnessMeasurement {
    maxRevisionLag: number;
    maxObservedNoProgressSeconds: number;
    previousProcessed: string | null;
    pendingSince: number | null;
}

export function summarizeEvents({
    events,
    slugs,
}: {
    events: readonly PerformanceEvent[];
    slugs: readonly string[];
}) {
    const scope = new Set(slugs);
    const durations = new Map<string, number[]>();
    const conversations = new Map<string, ConversationMeasurements>();
    const sessions = new Map<
        string,
        {
            started: Set<string>;
            terminal: Set<string>;
            comparisons: Set<string>;
        }
    >();
    const freshness = new Map<string, FreshnessMeasurement>();
    const rejectionCauses = new Map<string, number>();
    const issues: string[] = [];
    let rejectedBatches = 0;
    let publishedBatches = 0;
    let mixedBatches = 0;
    const recordDuration = ({
        key,
        value,
    }: {
        key: string;
        value: number;
    }): void => {
        const values = durations.get(key) ?? [];
        values.push(value);
        durations.set(key, values);
    };
    for (const event of events) {
        const metadata = event.metadata;
        const slug = event.conversationSlugId;
        if (slug && !scope.has(slug)) continue;
        if (event.phase === "monitor" && event.action === "resource_sample") {
            const parsed = revisionsSchema.safeParse(metadata.revisions);
            if (!parsed.success) {
                issues.push("invalid_revision_sample");
                continue;
            }
            for (const revision of parsed.data) {
                if (!scope.has(revision.slug_id)) continue;
                const row = freshness.get(revision.slug_id) ?? {
                    maxRevisionLag: 0,
                    maxObservedNoProgressSeconds: 0,
                    previousProcessed: null,
                    pendingSince: null,
                };
                const lag = Number(
                    BigInt(revision.scoring_input_revision) -
                        BigInt(revision.processed_scoring_input_revision),
                );
                row.maxRevisionLag = Math.max(row.maxRevisionLag, lag);
                if (lag <= 0) row.pendingSince = null;
                else {
                    if (
                        row.pendingSince === null ||
                        row.previousProcessed !==
                            revision.processed_scoring_input_revision
                    )
                        row.pendingSince = Date.parse(event.timestamp);
                    row.maxObservedNoProgressSeconds = Math.max(
                        row.maxObservedNoProgressSeconds,
                        (Date.parse(event.timestamp) - row.pendingSince) / 1000,
                    );
                }
                row.previousProcessed =
                    revision.processed_scoring_input_revision;
                freshness.set(revision.slug_id, row);
            }
        }
        if (
            event.phase === "scoring-worker" &&
            event.action === "batch_completed"
        ) {
            if (typeof metadata.conversations !== "string") {
                issues.push("invalid_batch_members");
                continue;
            }
            const members = metadata.conversations.split(",");
            if (!members.some((member) => scope.has(member))) continue;
            if (members.some((member) => !scope.has(member))) mixedBatches++;
            if (event.outcome === "success") publishedBatches++;
            else if (event.outcome === "skip") rejectedBatches++;
        }
        if (slug) {
            const row = conversations.get(slug) ?? {
                started: 0,
                completed: 0,
                failed: 0,
                comparisonsSaved: 0,
                lastAcceptedWriteAt: null,
                publicationAttempts: 0,
                publishedSnapshots: 0,
                skippedPublications: 0,
                firstPublication: null,
                lastPublication: null,
            };
            const session = sessions.get(slug) ?? {
                started: new Set<string>(),
                terminal: new Set<string>(),
                comparisons: new Set<string>(),
            };
            if (
                event.phase === "participation" &&
                [
                    "user_started",
                    "user_completed",
                    "user_failed",
                    "comparison_saved",
                ].includes(event.action)
            ) {
                if (!event.userId) {
                    issues.push("missing_participant_id");
                    continue;
                }
                if (event.action === "user_started") {
                    if (session.started.has(event.userId))
                        issues.push("duplicate_participant_start");
                    else {
                        session.started.add(event.userId);
                        row.started++;
                    }
                } else if (event.action === "comparison_saved") {
                    const count = z
                        .number()
                        .int()
                        .positive()
                        .safeParse(event.count);
                    if (!count.success)
                        issues.push("missing_comparison_sequence");
                    else {
                        const key = `${event.userId}:${String(count.data)}`;
                        if (session.comparisons.has(key))
                            issues.push("duplicate_comparison_event");
                        else {
                            session.comparisons.add(key);
                            row.comparisonsSaved++;
                            row.lastAcceptedWriteAt = event.timestamp;
                        }
                    }
                } else {
                    if (session.terminal.has(event.userId))
                        issues.push("duplicate_participant_terminal");
                    else {
                        session.terminal.add(event.userId);
                        if (event.action === "user_completed") row.completed++;
                        else row.failed++;
                    }
                }
            }
            if (
                event.phase === "scoring-worker" &&
                event.action === "publication_completed"
            ) {
                row.publicationAttempts++;
                if (event.outcome === "success") {
                    row.publishedSnapshots++;
                    row.firstPublication ??= event.timestamp;
                    row.lastPublication = event.timestamp;
                } else if (event.outcome === "skip") row.skippedPublications++;
            }
            conversations.set(slug, row);
            sessions.set(slug, session);
            if (
                event.phase === "scoring-worker" &&
                event.action === "revision_rejected"
            )
                rejectionCauses.set(slug, (rejectionCauses.get(slug) ?? 0) + 1);
        }
        if (
            event.responseTimeMs !== undefined &&
            event.responseTimeMs !== null
        ) {
            recordDuration({
                key: `${event.phase}/${event.action}/${typeof metadata.operation === "string" ? metadata.operation : ""}/${slug ?? "batch"}`,
                value: event.responseTimeMs,
            });
        }
        if (
            slug &&
            event.phase === "api" &&
            event.action === "request_completed"
        ) {
            const operation = metadata.operation;
            if (operation !== "load" && operation !== "save") {
                issues.push("invalid_api_operation");
                continue;
            }
            for (const phase of [
                "authentication",
                "participation",
                "transaction",
                "uncertainty",
                "routing",
                "load",
            ]) {
                const value = metadata[phase];
                if (value === undefined) continue;
                if (typeof value === "number" && value >= 0)
                    recordDuration({
                        key: `api/${operation}/${phase}/${slug}`,
                        value,
                    });
                else issues.push("invalid_api_phase_duration");
            }
        }
    }
    for (const session of sessions.values()) {
        if (
            [...session.started].some((id) => !session.terminal.has(id)) ||
            [...session.terminal].some((id) => !session.started.has(id))
        )
            issues.push("incomplete_participant_lifecycle");
    }
    return {
        conversations: Object.fromEntries(conversations),
        publishedBatches,
        rejectedBatches,
        mixedBatches,
        rejectionCauses: Object.fromEntries(rejectionCauses),
        issues: [...new Set(issues)],
        freshness: Object.fromEntries(
            [...freshness].map(([slug, row]) => [
                slug,
                {
                    maxRevisionLag: row.maxRevisionLag,
                    maxObservedNoProgressSeconds:
                        row.maxObservedNoProgressSeconds,
                },
            ]),
        ),
        durationsMs: Object.fromEntries(
            [...durations].map(([key, values]) => [key, percentiles(values)]),
        ),
    };
}

export function sameRevisions({
    expected,
    observed,
}: {
    expected: readonly Revision[];
    observed: readonly Revision[];
}): boolean {
    const bySlug = new Map(observed.map((row) => [row.slug_id, row]));
    return (
        expected.length > 0 &&
        bySlug.size === observed.length &&
        expected.length === observed.length &&
        expected.every((row) => {
            const read = bySlug.get(row.slug_id);
            return (
                read?.id === row.id &&
                read.scoring_input_revision === row.scoring_input_revision &&
                read.processed_scoring_input_revision ===
                    row.processed_scoring_input_revision &&
                read.snapshot_id === row.snapshot_id
            );
        })
    );
}
export function replicaCaughtUp({
    primary,
    replica,
}: {
    primary: readonly Revision[];
    replica: readonly Revision[];
}): boolean {
    return (
        primary.every(
            (row) =>
                row.snapshot_id !== null &&
                row.scoring_input_revision ===
                    row.processed_scoring_input_revision,
        ) && sameRevisions({ expected: primary, observed: replica })
    );
}
export function scoresMatch({
    expected,
    observed,
}: {
    expected: readonly Score[];
    observed: readonly Score[];
}): boolean {
    const byId = new Map(observed.map((row) => [row.itemSlugId, row]));
    return (
        byId.size === observed.length &&
        new Set(expected.map((row) => row.itemSlugId)).size ===
            expected.length &&
        expected.length === observed.length &&
        expected.every((row) => {
            const other = byId.get(row.itemSlugId);
            return (
                row.participantCount === other?.participantCount &&
                (row.score === null
                    ? other.score === null
                    : other.score !== null &&
                      Number.isFinite(other.score) &&
                      Number.isFinite(row.score) &&
                      Math.abs(row.score - other.score) < 1e-5)
            );
        })
    );
}
export function verifyEventCounts({
    summary,
    measured,
}: {
    summary: Summary;
    measured: ReturnType<typeof summarizeEvents>;
}): boolean {
    const rows = Object.values(measured.conversations);
    const metrics = new Map(Object.entries(summary.metrics));
    const count = (name: string): number => metrics.get(name)?.count ?? 0;
    return (
        count("ranking_users_started") > 0 &&
        measured.issues.length === 0 &&
        rows.reduce((n, row) => n + row.started, 0) ===
            count("ranking_users_started") &&
        rows.reduce((n, row) => n + row.completed, 0) ===
            count("ranking_users_completed") &&
        rows.reduce((n, row) => n + row.comparisonsSaved, 0) ===
            count("ranking_comparisons_saved")
    );
}
