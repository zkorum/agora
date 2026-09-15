import assert from "node:assert/strict";
import { test } from "node:test";
import {
    percentiles,
    queryDeltas,
    replicaCaughtUp,
    scoresMatch,
    summarizeEvents,
    verifyEventCounts,
} from "../tools/performance/report.ts";
import { rankingDiagnosticsRequest } from "../src/shared-backend/rankingDiagnosticsProtocol.ts";
import {
    parseJson,
    rankingResponseSchema,
    type PerformanceEvent,
    type QuerySnapshot,
    type Revision,
} from "../tools/performance/protocol.ts";

const row: Revision = {
    id: 1,
    slug_id: "a",
    scoring_input_revision: "4",
    processed_scoring_input_revision: "4",
    snapshot_id: 10,
    published_at: "2026-09-14T12:00:00Z",
    vote_count: 1,
    participant_count: 1,
};
const query: QuerySnapshot["queries"][number] = {
    user_id: "1",
    toplevel: true,
    queryid: "1",
    query: "select a from ranking_score",
    calls: 10,
    total_exec_time: 40,
    rows: 10,
    shared_blks_hit: 0,
    shared_blks_read: 0,
    temp_blks_written: 0,
    wal_bytes: 0,
    blk_read_time: 0,
    blk_write_time: 0,
};
function event(input: Partial<PerformanceEvent>): PerformanceEvent {
    return {
        schemaVersion: 1,
        timestamp: "2026-09-14T12:00:00Z",
        scenario: "solidago-ranking",
        phase: "participation",
        action: "user_started",
        userId: "user-1",
        conversationSlugId: "a",
        metadata: {},
        ...input,
    };
}

await test("query deltas respect role and nested-query identity and reject resets", () => {
    const before: QuerySnapshot = {
        reset: "same",
        dealloc: 0,
        queries: [query, { ...query, user_id: "2", calls: 20 }],
    };
    const after: QuerySnapshot = {
        ...before,
        queries: [
            { ...query, calls: 12, total_exec_time: 50 },
            { ...query, user_id: "2", calls: 21 },
        ],
    };
    assert.equal(
        queryDeltas({ before, after }).queries.find((q) => q.user_id === "1")
            ?.meanExecMs,
        5,
    );
    assert.equal(
        queryDeltas({ before, after }).queries.find((q) => q.user_id === "2")
            ?.calls,
        1,
    );
    assert.equal(
        queryDeltas({ before, after: { ...after, reset: "new" } }).comparable,
        false,
    );
    assert.equal(
        queryDeltas({
            before,
            after: { ...after, queries: [{ ...query, calls: 1 }] },
        }).comparable,
        false,
    );
    const truncated = {
        ...before,
        queries: Array.from({ length: 500 }, (_, index) => ({
            ...query,
            queryid: String(index + 2),
        })),
    };
    assert.equal(
        queryDeltas({ before: truncated, after }).queries.at(0)?.calls,
        null,
    );
});
await test("event summaries filter unrelated traffic and diagnose mixed-batch coupling", () => {
    const measured = summarizeEvents({
        slugs: ["a"],
        events: [
            event({}),
            event({ action: "user_failed" }),
            event({ conversationSlugId: "other" }),
            event({
                phase: "scoring-worker",
                action: "batch_completed",
                outcome: "skip",
                conversationSlugId: undefined,
                metadata: { conversations: "a,other" },
            }),
            event({
                phase: "scoring-worker",
                action: "batch_completed",
                outcome: "skip",
                conversationSlugId: undefined,
                metadata: { conversations: "other" },
            }),
            event({ phase: "scoring-worker", action: "revision_rejected" }),
            event({
                phase: "api",
                action: "request_completed",
                responseTimeMs: 10,
                metadata: { operation: "save", transaction: 8 },
            }),
        ],
    });
    assert.equal(measured.rejectedBatches, 1);
    assert.equal(measured.mixedBatches, 1);
    assert.equal(measured.conversations.other, undefined);
    assert.equal(measured.conversations.a.failed, 1);
    assert.equal(measured.durationsMs["api/save/transaction/a"].p99, 8);
    assert.equal(percentiles([]).p95, null);
});
await test("duplicate wakeups are not counted as invalidations and partial publication is visible", () => {
    const measured = summarizeEvents({
        slugs: ["a", "b"],
        events: [
            event({
                phase: "scoring-worker",
                action: "batch_completed",
                outcome: "skip",
                conversationSlugId: undefined,
                metadata: {
                    conversations: "a",
                    publishedConversations: 0,
                    invalidatedConversations: 0,
                },
            }),
            event({
                phase: "scoring-worker",
                action: "publication_completed",
                outcome: "skip",
                metadata: { status: "superseded" },
            }),
            event({
                phase: "scoring-worker",
                action: "batch_completed",
                outcome: "success",
                conversationSlugId: undefined,
                metadata: {
                    conversations: "a,b",
                    publishedConversations: 1,
                    invalidatedConversations: 1,
                },
            }),
            event({
                phase: "scoring-worker",
                action: "publication_completed",
                outcome: "skip",
                metadata: { status: "invalidated" },
            }),
            event({
                phase: "scoring-worker",
                action: "publication_completed",
                outcome: "success",
                conversationSlugId: "b",
            }),
        ],
    });
    assert.equal(measured.skippedBatches, 1);
    assert.equal(measured.rejectedBatches, 1);
    assert.equal(measured.publishedBatches, 1);
    assert.equal(measured.conversations.a.supersededPublications, 1);
    assert.equal(measured.conversations.a.invalidatedPublications, 1);
    assert.equal(measured.conversations.b.publishedSnapshots, 1);
});
await test("complete event capture requires actual comparison and terminal counts", () => {
    const summary = {
        metrics: {
            ranking_users_started: { count: 1 },
            ranking_users_completed: { count: 1 },
            ranking_comparisons_saved: { count: 1 },
        },
    };
    const events = [
        event({}),
        event({ action: "comparison_saved", count: 1 }),
        event({ action: "user_completed" }),
    ];
    assert.equal(
        verifyEventCounts({
            summary,
            measured: summarizeEvents({ events, slugs: ["a"] }),
        }),
        true,
    );
    assert.equal(
        verifyEventCounts({
            summary,
            measured: summarizeEvents({
                events: events.filter((e) => e.action !== "comparison_saved"),
                slugs: ["a"],
            }),
        }),
        false,
    );
    assert.equal(
        verifyEventCounts({
            summary,
            measured: summarizeEvents({
                events: [...events, event({ action: "user_failed" })],
                slugs: ["a"],
            }),
        }),
        false,
    );
});
await test("freshness requires a published snapshot and the same current revision on both servers", () => {
    assert.equal(replicaCaughtUp({ primary: [row], replica: [row] }), true);
    for (const read of [
        { ...row, snapshot_id: 9 },
        { ...row, scoring_input_revision: "5" },
    ]) {
        assert.equal(
            replicaCaughtUp({ primary: [row], replica: [read] }),
            false,
        );
    }
    assert.equal(
        replicaCaughtUp({
            primary: [{ ...row, snapshot_id: null }],
            replica: [{ ...row, snapshot_id: null }],
        }),
        false,
    );
    assert.equal(replicaCaughtUp({ primary: [row], replica: [] }), false);
    assert.equal(
        replicaCaughtUp({ primary: [row], replica: [row, row] }),
        false,
    );
});
await test("published scores reject duplicate and stale rows and malformed JSON is not leaked", () => {
    const score = { itemSlugId: "a", score: 0.5, participantCount: 4 };
    assert.equal(
        scoresMatch({
            expected: [score],
            observed: [{ ...score, score: 0.50000001 }],
        }),
        true,
    );
    assert.equal(
        scoresMatch({
            expected: [score],
            observed: [{ ...score, participantCount: 3 }],
        }),
        false,
    );
    assert.equal(
        scoresMatch({ expected: [score, score], observed: [score, score] }),
        false,
    );
    assert.throws(
        () =>
            parseJson({
                text: "PRIVATE_RESPONSE_BODY",
                schema: rankingResponseSchema,
                label: "ranking results",
            }),
        { message: "Invalid ranking results data" },
    );
    assert.throws(() =>
        rankingResponseSchema.parse({ rankings: [score, score] }),
    );
});
await test("SQL helpers reject injected identifiers at their boundary", () => {
    const request = { id: 1, operation: "revisions", role: "primary" };
    assert.throws(() =>
        rankingDiagnosticsRequest.parse({ ...request, slugs: ["x';DROP"] }),
    );
    assert.throws(() =>
        rankingDiagnosticsRequest.parse({ ...request, slugs: [] }),
    );
    assert.throws(() =>
        rankingDiagnosticsRequest.parse({
            id: 1,
            operation: "scores",
            role: "primary",
            snapshotId: -1,
        }),
    );
    assert.deepEqual(
        rankingDiagnosticsRequest.parse({ ...request, slugs: ["uMH1N-o"] }),
        { ...request, slugs: ["uMH1N-o"] },
    );
});
