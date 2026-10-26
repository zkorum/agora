import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { finalizeCurrentPolisConversation } from "../src/service/conversationFinalization.js";
import { getAnalysisEligibleOpinionVotes } from "../src/service/opinionVoteEligibility.js";
import { calculateConversationCounters } from "../src/shared-backend/conversationCounters.js";
import { deleteUserAccount } from "../src/service/account.js";
import {
    admitVote,
    acknowledgeVoteSubmissions,
    fetchPendingVoteSubmissions,
    type VoteSubmission,
} from "../src/service/voteAdmission.js";
import * as schema from "../src/shared-backend/schema.js";
import { readDbFixtureSql } from "./dbFixture.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing fixture row");
    return row;
}

function createBarrier() {
    let resolve = () => {};
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("durable vote admission and closing publication", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let vote: VoteSubmission;
    let configId: number;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            username: "postgres",
            password: "postgres",
            database: "agora_test",
        });
        db = drizzle(client);
        await client.unsafe(readDbFixtureSql("conversation-finalization.sql"));
        await client.unsafe(
            readFileSync(
                new URL(
                    "../database/flyway/V0111.1__backfill_conversation_participants.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    beforeEach(async () => {
        await client.unsafe(
            'TRUNCATE conversation, "user", opinion, opinion_content, opinion_moderation, conversation_content, polis_conversation_config, conversation_participant, vote_submission, vote, vote_content, analysis_spec, opinion_group_spec, analysis_input_snapshot, analysis_snapshot, analysis_snapshot_result, conversation_view_snapshot, conversation_view_snapshot_checkpoint_reason, realtime_event_outbox RESTART IDENTITY CASCADE',
        );
        const userId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: "alice" });
        configId = first(
            await db
                .insert(schema.polisConversationConfigTable)
                .values({
                    votingPresentation: "list",
                    analysisDataGeneration: 1,
                })
                .returning(),
        ).id;
        const conversationId = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "closing1",
                    projectId: 1,
                    polisConfigId: configId,
                })
                .returning(),
        ).id;
        const conversationContentId = first(
            await db
                .insert(schema.conversationContentTable)
                .values({ conversationId, title: "Closing", bodyPlainText: "" })
                .returning(),
        ).id;
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: conversationContentId })
            .where(eq(schema.conversationTable.id, conversationId));
        const opinionId = first(
            await db
                .insert(schema.opinionTable)
                .values({
                    slugId: "source01",
                    authorId: userId,
                    conversationId,
                })
                .returning(),
        ).id;
        const opinionContentId = first(
            await db
                .insert(schema.opinionContentTable)
                .values({
                    opinionId,
                    conversationContentId,
                    content: "Statement",
                    contentPlainText: "Statement",
                })
                .returning(),
        ).id;
        await db
            .update(schema.opinionTable)
            .set({ currentContentId: opinionContentId })
            .where(eq(schema.opinionTable.id, opinionId));
        vote = {
            userId,
            conversationId,
            opinionId,
            opinionContentId,
            vote: "agree",
            timestamp: new Date("2026-10-26T12:00:00Z"),
        };
    });

    it("keeps acknowledged admissions durable and rejects new actions after closing", async () => {
        await admitVote({ db, vote });
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true, closingTargetRevision: 1 })
            .where(eq(schema.conversationTable.id, vote.conversationId));
        expect(await fetchPendingVoteSubmissions({ db, limit: 10 })).toEqual([
            vote,
        ]);
        await admitVote({ db, vote });
        await expect(
            admitVote({ db, vote: { ...vote, vote: "cancel" } }),
        ).rejects.toThrow("no longer accepts votes");
        expect(
            await db.transaction(
                async (tx) =>
                    await finalizeCurrentPolisConversation({
                        db: tx,
                        conversationId: vote.conversationId,
                    }),
            ),
        ).toBe(false);
        expect(
            await db
                .select()
                .from(schema.conversationViewSnapshotCheckpointReasonTable),
        ).toEqual([]);
    });

    it("does not consume a later same-timestamp cancellation when acknowledging an older action", async () => {
        await admitVote({ db, vote });
        const cancellation: VoteSubmission = { ...vote, vote: "cancel" };
        await admitVote({ db, vote: cancellation });
        await acknowledgeVoteSubmissions({ db, votes: [vote] });
        expect(await fetchPendingVoteSubmissions({ db, limit: 10 })).toEqual([
            cancellation,
        ]);
        await acknowledgeVoteSubmissions({ db, votes: [cancellation] });
        expect(await fetchPendingVoteSubmissions({ db, limit: 10 })).toEqual(
            [],
        );
    });

    it("ignores removed moderation records without duplicating live counts", async () => {
        const persistedVote = first(
            await db
                .insert(schema.voteTable)
                .values({
                    authorId: vote.userId,
                    opinionId: vote.opinionId,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.voteContentTable)
                .values({
                    voteId: persistedVote.id,
                    opinionContentId: vote.opinionContentId,
                    vote: "agree",
                })
                .returning(),
        );
        await db
            .update(schema.voteTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.voteTable.id, persistedVote.id));
        await db.insert(schema.opinionModerationTable).values([
            {
                opinionId: vote.opinionId,
                moderationAction: "hide",
                moderationReason: "spam",
                deletedAt: new Date(),
            },
            {
                opinionId: vote.opinionId,
                moderationAction: "move",
                moderationReason: "spam",
                deletedAt: new Date(),
            },
        ]);
        expect(
            await calculateConversationCounters({
                db,
                conversationId: vote.conversationId,
            }),
        ).toEqual({
            opinionCount: 1,
            totalOpinionCount: 1,
            voteCount: 1,
            totalVoteCount: 1,
            participantCount: 1,
            totalParticipantCount: 1,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
        });
    });

    it("does not restart account hiding or repeat its generation and redaction events", async () => {
        await deleteUserAccount({ db, userId: vote.userId });
        const state = {
            user: await db.select().from(schema.userTable),
            config: await db.select().from(schema.polisConversationConfigTable),
            events: await db.select().from(schema.realtimeEventOutboxTable),
        };
        expect(state.events).toMatchObject([{ eventType: "opinion_redacted" }]);
        const originalDeletionTime = new Date("2026-10-25T10:00:00Z");
        await db
            .update(schema.userTable)
            .set({ deletedAt: originalDeletionTime })
            .where(eq(schema.userTable.id, vote.userId));
        await deleteUserAccount({ db, userId: vote.userId });
        expect(
            await db
                .select({ deletedAt: schema.userTable.deletedAt })
                .from(schema.userTable),
        ).toEqual([{ deletedAt: originalDeletionTime }]);
        expect(
            await db.select().from(schema.polisConversationConfigTable),
        ).toEqual(state.config);
        expect(await db.select().from(schema.realtimeEventOutboxTable)).toEqual(
            state.events,
        );
    });

    it("allocates distinct conversation-local participant identities for old writers", async () => {
        const otherUserId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: otherUserId, username: "bob" });
        const rows = await db
            .insert(schema.voteTable)
            .values([
                { authorId: vote.userId, opinionId: vote.opinionId },
                { authorId: otherUserId, opinionId: vote.opinionId },
            ])
            .returning();
        expect(rows.every((row) => row.participantId !== null)).toBe(true);
        expect(new Set(rows.map((row) => row.participantId)).size).toBe(2);
        const participants = await db
            .select()
            .from(schema.conversationParticipantTable);
        expect(
            new Set(participants.map((participant) => participant.userId)),
        ).toEqual(new Set([vote.userId, otherUserId]));
    });

    it("removes deleted personal statement columns while retaining permitted voter rows", async () => {
        const bob = randomUUID();
        const carol = randomUUID();
        await db.insert(schema.userTable).values([
            { id: bob, username: "bob" },
            { id: carol, username: "carol" },
        ]);
        const contentId = first(
            await db.select().from(schema.conversationContentTable),
        ).id;
        const opinions = [
            { id: vote.opinionId, contentId: vote.opinionContentId },
        ];
        for (const { authorId, slugId } of [
            { authorId: bob, slugId: "source02" },
            { authorId: carol, slugId: "source03" },
        ]) {
            const opinionId = first(
                await db
                    .insert(schema.opinionTable)
                    .values({
                        conversationId: vote.conversationId,
                        authorId,
                        slugId,
                    })
                    .returning(),
            ).id;
            const sourceContentId = first(
                await db
                    .insert(schema.opinionContentTable)
                    .values({
                        opinionId,
                        conversationContentId: contentId,
                        content: slugId,
                        contentPlainText: slugId,
                    })
                    .returning(),
            ).id;
            await db
                .update(schema.opinionTable)
                .set({ currentContentId: sourceContentId })
                .where(eq(schema.opinionTable.id, opinionId));
            opinions.push({ id: opinionId, contentId: sourceContentId });
        }
        for (const authorId of [vote.userId, bob, carol])
            for (const opinion of opinions) {
                const voteId = first(
                    await db
                        .insert(schema.voteTable)
                        .values({ authorId, opinionId: opinion.id })
                        .returning(),
                ).id;
                const voteContentId = first(
                    await db
                        .insert(schema.voteContentTable)
                        .values({
                            voteId,
                            opinionContentId: opinion.contentId,
                            vote: "agree",
                        })
                        .returning(),
                ).id;
                await db
                    .update(schema.voteTable)
                    .set({ currentContentId: voteContentId })
                    .where(eq(schema.voteTable.id, voteId));
            }
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where(eq(schema.userTable.id, vote.userId));
        const eligible = await getAnalysisEligibleOpinionVotes({
            db,
            conversationId: vote.conversationId,
            opinionIds: opinions.map((opinion) => opinion.id),
        });
        const rows = await db.select().from(eligible);
        expect(
            new Set(
                rows.map((row) => `${row.authorId}:${String(row.opinionId)}`),
            ),
        ).toEqual(
            new Set(
                [vote.userId, bob, carol].flatMap((authorId) =>
                    opinions
                        .slice(1)
                        .map((opinion) => `${authorId}:${String(opinion.id)}`),
                ),
            ),
        );
        expect(
            await calculateConversationCounters({
                db,
                conversationId: vote.conversationId,
            }),
        ).toMatchObject({ opinionCount: 2, voteCount: 6, participantCount: 3 });
    });

    it.each(["account", "statement", "moderation", "conversation"])(
        "orders %s hiding against the AI publication fence",
        async (kind) => {
            const locked = createBarrier();
            const release = createBarrier();
            const publishing = db.transaction(async (tx) => {
                await tx
                    .select({
                        locked: sql`pg_advisory_xact_lock(1097617445, ${schema.conversationTable.id})`,
                    })
                    .from(schema.conversationTable)
                    .where(
                        eq(schema.conversationTable.id, vote.conversationId),
                    );
                locked.resolve();
                await release.promise;
                expect(
                    first(
                        await tx
                            .select()
                            .from(schema.userTable)
                            .where(eq(schema.userTable.id, vote.userId)),
                    ).isDeleted,
                ).toBe(false);
            });
            await locked.promise;
            const mutate = async (tx: PostgresJsDatabase): Promise<void> => {
                if (kind === "account")
                    await tx
                        .update(schema.userTable)
                        .set({ isDeleted: true })
                        .where(eq(schema.userTable.id, vote.userId));
                else if (kind === "statement")
                    await tx
                        .update(schema.opinionTable)
                        .set({ currentContentId: null })
                        .where(eq(schema.opinionTable.id, vote.opinionId));
                else if (kind === "moderation")
                    await tx.insert(schema.opinionModerationTable).values({
                        opinionId: vote.opinionId,
                        moderationAction: "hide",
                        moderationReason: "spam",
                    });
                else
                    await tx
                        .update(schema.conversationTable)
                        .set({ currentContentId: null })
                        .where(
                            eq(
                                schema.conversationTable.id,
                                vote.conversationId,
                            ),
                        );
            };
            try {
                const hiding = db.transaction(async (tx) => {
                    await tx
                        .select({
                            timeout: sql`set_config('lock_timeout', '150ms', true)`,
                        })
                        .from(schema.conversationTable)
                        .where(
                            eq(
                                schema.conversationTable.id,
                                vote.conversationId,
                            ),
                        );
                    await mutate(tx);
                });
                await expect(hiding).rejects.toMatchObject({
                    cause: { code: "55P03" },
                });
            } finally {
                release.resolve();
                await publishing;
            }
            await db.transaction(mutate);
        },
    );

    it("reuses complete empty output and atomically publishes a closing checkpoint", async () => {
        const analysisSpecId = first(
            await db
                .insert(schema.analysisSpecTable)
                .values({ analysisFamily: "opinion_groups" })
                .returning(),
        ).id;
        const specId = first(
            await db
                .insert(schema.opinionGroupSpecTable)
                .values({
                    analysisSpecId,
                    key: "test",
                    version: 1,
                    reducer: "pca",
                    clusterer: "kmeans",
                    selectionPolicy: "silhouette_size_balance",
                    minClusterableParticipants: 2,
                    minVotesPerParticipant: 1,
                    maxGroupCount: 6,
                })
                .returning(),
        ).id;
        const inputId = first(
            await db
                .insert(schema.analysisInputSnapshotTable)
                .values({
                    conversationId: vote.conversationId,
                    dataGeneration: 1,
                    inputHash: "a".repeat(64),
                    opinionCount: 0,
                    participantCount: 0,
                    voteCount: 0,
                    compression: "zstd",
                    payload: "",
                })
                .returning(),
        ).id;
        const snapshotId = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId: vote.conversationId,
                    inputSnapshotId: inputId,
                    dataGeneration: 1,
                    computedAt: new Date(),
                })
                .returning(),
        ).id;
        await db.insert(schema.analysisSnapshotResultTable).values({
            conversationId: vote.conversationId,
            analysisSnapshotId: snapshotId,
            opinionGroupSpecId: specId,
            outcome: "insufficient_data",
            outcomeReason: "empty_vote_matrix",
            variantsEnabled: false,
        });
        await db.insert(schema.conversationViewSnapshotTable).values({
            conversationId: vote.conversationId,
            analysisSnapshotId: snapshotId,
            opinionGroupSpecId: specId,
            viewReason: "analysis_completed",
            isClosed: false,
            activatedAt: new Date(),
            opinionCount: 1,
            totalOpinionCount: 1,
            voteCount: 0,
            totalVoteCount: 0,
            participantCount: 0,
            totalParticipantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
        });
        const finalized = await db.transaction(async (tx) => {
            await tx
                .update(schema.conversationTable)
                .set({ isClosed: true })
                .where(eq(schema.conversationTable.id, vote.conversationId));
            return await finalizeCurrentPolisConversation({
                db: tx,
                conversationId: vote.conversationId,
            });
        });
        expect(finalized).toBe(true);
        expect(
            (await db.select().from(schema.analysisSnapshotTable)).length,
        ).toBe(1);
        expect(
            first(await db.select().from(schema.conversationTable))
                .closedFinalizedAt,
        ).not.toBeNull();
        expect(
            first(
                await db
                    .select()
                    .from(schema.conversationViewSnapshotCheckpointReasonTable),
            ).reason,
        ).toBe("conversation_closed");
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: 2 })
            .where(eq(schema.polisConversationConfigTable.id, configId));
        expect(
            await db.transaction(
                async (tx) =>
                    await finalizeCurrentPolisConversation({
                        db: tx,
                        conversationId: vote.conversationId,
                    }),
            ),
        ).toBe(false);
    });
});
