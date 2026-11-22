import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { zstdCompressSync } from "node:zlib";
import { setTimeout as delay } from "node:timers/promises";
import { and, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { Decoder, GlideClient } from "@valkey/valkey-glide";
import { finalizeCurrentPolisConversation } from "../src/service/conversationFinalization.js";
import { getAnalysisEligibleOpinionVotes } from "../src/service/opinionVoteEligibility.js";
import {
    calculateConversationCounters,
    reconcileOpinionVoteCounters,
} from "../src/shared-backend/conversationCounters.js";
import { mergeGuestIntoVerifiedUser } from "../src/service/merge.js";
import { lockAccountConversations } from "../src/shared-backend/accountContributions.js";
import { deleteUserAccount } from "../src/service/account.js";
import { restoreAccountAfterVerification } from "../src/service/accountRecovery.js";
import {
    createVoteBuffer,
    type VoteBuffer,
} from "../src/service/voteBuffer.js";
import {
    getBufferedVoteKey,
    type VoteBufferInput,
} from "../src/service/voteBufferTypes.js";
import { VALKEY_QUEUE_KEYS } from "../src/shared-backend/valkeyQueues.js";
import { sealVoteBuffer } from "../src/service/voteBufferLifecycle.js";
import {
    buildClosingVoteDrainQuery,
    buildVoteSourceQuery,
} from "../src/service/voteQueries.js";
import { z } from "zod";
import * as schema from "../src/shared-backend/schema.js";
import { readDbFixtureSql } from "./dbFixture.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing fixture row");
    return row;
}

function createBarrier<T = void>() {
    let resolve: (value: T) => void = () => {};
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("vote ownership, live eligibility and closing publication", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let vote: VoteBufferInput;
    let cacheContainer: StartedTestContainer;
    let valkey: GlideClient;
    const buffers: VoteBuffer[] = [];
    function createBuffer(): VoteBuffer {
        const buffer = createVoteBuffer({
            db,
            valkeyRef: { current: valkey },
            flushIntervalMs: 60_000,
            valkeyBatchLimit: 100,
        });
        buffers.push(buffer);
        return buffer;
    }
    afterEach(async () => {
        for (const buffer of buffers.splice(0)) await buffer.shutdown();
    });
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
        db = drizzle({ client });
        cacheContainer = await new GenericContainer("valkey/valkey:8-alpine")
            .withExposedPorts(6379)
            .start();
        valkey = await GlideClient.createClient({
            addresses: [
                {
                    host: cacheContainer.getHost(),
                    port: cacheContainer.getMappedPort(6379),
                },
            ],
            defaultDecoder: Decoder.String,
            requestTimeout: 2_000,
        });
        await client.unsafe(readDbFixtureSql("conversation-finalization.sql"));
        // The lightweight fixture omits ALTER TABLE FKs. Exercise the new
        // canonical composite ownership constraint against real PostgreSQL too.
        await client.unsafe(
            "ALTER TABLE vote ADD CONSTRAINT vote_current_content_owner_fk FOREIGN KEY (current_content_id, id) REFERENCES vote_content (id, vote_id)",
        );
        await client.unsafe(
            'ALTER TABLE vote ADD CONSTRAINT vote_author_user_fk FOREIGN KEY (author_id) REFERENCES "user" (id)',
        );
        // Install the historical ownership triggers against the current schema.
        // Adapt its empty-fixture backfill to the current family and work keys.
        await client.unsafe(
            readFileSync(
                new URL(
                    "../database/flyway/V0111.1__backfill_conversation_participants.sql",
                    import.meta.url,
                ),
                "utf8",
            )
                .replaceAll("maxdiff_result", "comparison_response")
                .replaceAll(
                    "c.conversation_type = 'ranking'",
                    "c.prioritization_type = 'comparisons'",
                )
                .replace(
                    "ON CONFLICT (conversation_id, opinion_group_spec_id)",
                    "ON CONFLICT (conversation_id, opinion_group_spec_id, uses_closing_inputs)",
                ),
        );
        await db.transaction(async (tx) => {
            await tx.execute(
                sql.raw(
                    readFileSync(
                        new URL(
                            "../database/flyway/V0116.4__bind_polis_analysis_closes.sql",
                            import.meta.url,
                        ),
                        "utf8",
                    ),
                ),
            );
        });
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
        valkey?.close();
        await cacheContainer?.stop();
    });

    beforeEach(async () => {
        await valkey.flushall();
        await client.unsafe(
            'TRUNCATE conversation_analysis_close, polis_analysis_close, conversation, "user", opinion, opinion_content, opinion_moderation, conversation_content, polis_conversation_config, conversation_participant, vote, vote_content, analysis_spec, opinion_group_spec, analysis_input_baseline, analysis_input_snapshot, analysis_snapshot, analysis_snapshot_result, conversation_view_snapshot, conversation_view_snapshot_checkpoint_reason, realtime_event_outbox, realtime_event_outbox_topic, notification, followed_topic, user_spoken_languages, user_display_language, organization_membership, survey_response, comparison_response, phone, email, zk_passport, event_ticket, device RESTART IDENTITY CASCADE',
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
            contributionRevision: 0,
            conversationId,
            opinionId,
            opinionContentId,
            vote: "agree",
            timestamp: new Date("2026-10-26T12:00:00Z"),
        };
    });

    it("does not replay pre-deletion buffered votes after account recovery", async () => {
        const buffer = createBuffer();
        const email = "recover-buffer@example.org";
        await db
            .insert(schema.emailTable)
            .values({ userId: vote.userId, email, type: "primary" });
        await buffer.add({ vote });
        await deleteUserAccount({ db, userId: vote.userId });
        const restored = await db.transaction(
            async (tx) =>
                await restoreAccountAfterVerification({
                    db: tx,
                    userId: vote.userId,
                    didWrite: "did:key:zRecoveredBuffer",
                    userAgent: "test",
                    sessionLifetimeDays: 30,
                    proof: { method: "email", email },
                }),
        );
        expect(restored.success).toBe(true);
        expect(
            await buffer.hasBlockingVotes({
                db,
                opinionId: vote.opinionId,
                authorId: null,
                isSeed: false,
            }),
        ).toBe(false);
        await buffer.flush();
        expect(await db.select().from(schema.voteTable)).toEqual([]);
        await buffer.add({
            vote: { ...vote, contributionRevision: 1, vote: "disagree" },
        });
        await buffer.flush();
        expect(
            first(await db.select().from(schema.voteContentTable)).vote,
        ).toBe("disagree");
    });

    async function persistVote({
        userId,
        choice,
    }: {
        userId: string;
        choice: "agree" | "disagree" | "pass" | "cancel";
    }) {
        const root = first(
            await db
                .insert(schema.voteTable)
                .values({ authorId: userId, opinionId: vote.opinionId })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.voteContentTable)
                .values({
                    voteId: root.id,
                    opinionContentId: vote.opinionContentId,
                    vote: choice === "cancel" ? "agree" : choice,
                })
                .returning(),
        );
        return first(
            await db
                .update(schema.voteTable)
                .set({
                    currentContentId: choice === "cancel" ? null : content.id,
                })
                .where(eq(schema.voteTable.id, root.id))
                .returning(),
        );
    }

    async function createMergePair() {
        const guestUserId = randomUUID();
        const verifiedUserId = randomUUID();
        await db.insert(schema.userTable).values([
            { id: guestUserId, username: "guest" },
            { id: verifiedUserId, username: "verified" },
        ]);
        return { guestUserId, verifiedUserId };
    }

    async function waitForBlockedTransaction(
        blockerPid: number,
    ): Promise<void> {
        for (let attempt = 0; attempt < 250; attempt++) {
            const state = z.array(z.object({ waiting: z.boolean() })).parse(
                await client`
                SELECT EXISTS (
                    SELECT pid FROM pg_stat_activity
                    WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
                ) AS waiting
            `,
            );
            if (state.some((row) => row.waiting)) return;
            await delay(10);
        }
        throw new Error("Account mutation did not reach the conversation lock");
    }

    it("orders account hiding after conversation locks, avoiding an AI-fence deadlock with statement edits", async () => {
        const locked = createBarrier<number>();
        const editAllowed = createBarrier();
        const editing = db.transaction(async (tx) => {
            const scope = first(
                await tx
                    .select({
                        pid: sql<number>`pg_backend_pid()`.mapWith(Number),
                    })
                    .from(schema.conversationTable)
                    .where(eq(schema.conversationTable.id, vote.conversationId))
                    .for("no key update"),
            );
            locked.resolve(scope.pid);
            await editAllowed.promise;
            await tx
                .select({
                    timeout: sql`set_config('lock_timeout', '500ms', true)`,
                })
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.id, vote.conversationId));
            // Updating this source acquires the real AI advisory fence trigger.
            await tx
                .update(schema.opinionTable)
                .set({ authorId: vote.userId })
                .where(eq(schema.opinionTable.id, vote.opinionId));
        });
        const editorPid = await locked.promise;
        const deleting = deleteUserAccount({ db, userId: vote.userId });
        try {
            await waitForBlockedTransaction(editorPid);
            editAllowed.resolve();
            await Promise.all([editing, deleting]);
        } finally {
            editAllowed.resolve();
            await Promise.allSettled([editing, deleting]);
        }
        expect(first(await db.select().from(schema.userTable))).toMatchObject({
            isDeleted: true,
            deletionReason: "account_deletion",
        });
    }, 10_000);

    it("leaves late buffered participation in an unlocked conversation with the retired guest", async () => {
        const pair = await createMergePair();
        await persistVote({ userId: pair.guestUserId, choice: "agree" });
        const locked = createBarrier<number>();
        const release = createBarrier();
        const blocker = db.transaction(async (tx) => {
            const scope = first(
                await tx
                    .select({
                        pid: sql<number>`pg_backend_pid()`.mapWith(Number),
                    })
                    .from(schema.conversationTable)
                    .where(eq(schema.conversationTable.id, vote.conversationId))
                    .for("no key update"),
            );
            locked.resolve(scope.pid);
            await release.promise;
        });
        const blockerPid = await locked.promise;
        const merging = db.transaction(
            async (tx) =>
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    ...pair,
                    now: vote.timestamp,
                }),
        );
        try {
            await waitForBlockedTransaction(blockerPid);
            const config = first(
                await db
                    .insert(schema.polisConversationConfigTable)
                    .values({ votingPresentation: "list" })
                    .returning(),
            );
            const conversation = first(
                await db
                    .insert(schema.conversationTable)
                    .values({
                        slugId: "lateconv",
                        projectId: 1,
                        polisConfigId: config.id,
                    })
                    .returning(),
            );
            const content = first(
                await db
                    .insert(schema.conversationContentTable)
                    .values({
                        conversationId: conversation.id,
                        title: "Late participation",
                    })
                    .returning(),
            );
            await db
                .update(schema.conversationTable)
                .set({ currentContentId: content.id })
                .where(eq(schema.conversationTable.id, conversation.id));
            const opinion = first(
                await db
                    .insert(schema.opinionTable)
                    .values({
                        slugId: "lateop01",
                        authorId: vote.userId,
                        conversationId: conversation.id,
                    })
                    .returning(),
            );
            const source = first(
                await db
                    .insert(schema.opinionContentTable)
                    .values({
                        opinionId: opinion.id,
                        conversationContentId: content.id,
                        content: "Late statement",
                    })
                    .returning(),
            );
            await db
                .update(schema.opinionTable)
                .set({ currentContentId: source.id })
                .where(eq(schema.opinionTable.id, opinion.id));
            const root = first(
                await db
                    .insert(schema.voteTable)
                    .values({
                        authorId: pair.guestUserId,
                        opinionId: opinion.id,
                    })
                    .returning(),
            );
            const voteContent = first(
                await db
                    .insert(schema.voteContentTable)
                    .values({
                        voteId: root.id,
                        opinionContentId: source.id,
                        vote: "agree",
                    })
                    .returning(),
            );
            await db
                .update(schema.voteTable)
                .set({ currentContentId: voteContent.id })
                .where(eq(schema.voteTable.id, root.id));
            release.resolve();
            await Promise.all([blocker, merging]);
            expect(
                first(
                    await db
                        .select()
                        .from(schema.voteTable)
                        .where(eq(schema.voteTable.id, root.id)),
                ),
            ).toMatchObject({
                authorId: pair.guestUserId,
                currentContentId: voteContent.id,
            });
            expect(
                await calculateConversationCounters({
                    db,
                    conversationId: conversation.id,
                }),
            ).toMatchObject({ voteCount: 0, participantCount: 0 });
        } finally {
            release.resolve();
            await Promise.allSettled([blocker, merging]);
        }
    }, 10_000);

    it("bounds counter rebuild parameters beyond PostgreSQL's single-query limit", async () => {
        await persistVote({ userId: vote.userId, choice: "agree" });
        await db
            .update(schema.opinionTable)
            .set({ numAgrees: 100 })
            .where(eq(schema.opinionTable.id, vote.opinionId));
        await db.transaction(async (tx) => {
            await lockAccountConversations({ db: tx, userId: vote.userId });
            await reconcileOpinionVoteCounters({
                db: tx,
                opinionIds: Array.from(
                    { length: 70_000 },
                    (_, index) => index + 1,
                ),
            });
        });
        expect(
            first(await db.select().from(schema.opinionTable)),
        ).toMatchObject({ numAgrees: 1, numDisagrees: 0, numPasses: 0 });
    });

    it("allows vote foreign-key checks while merge waits for the conversation lock", async () => {
        const pair = await createMergePair();
        await persistVote({ userId: pair.guestUserId, choice: "agree" });
        const otherOpinion = first(
            await db
                .insert(schema.opinionTable)
                .values({
                    slugId: "fkcheck1",
                    authorId: vote.userId,
                    conversationId: vote.conversationId,
                })
                .returning(),
        );
        const locked = createBarrier<number>();
        const insertAllowed = createBarrier();
        const inserting = db.transaction(async (tx) => {
            const scope = first(
                await tx
                    .select({
                        pid: sql<number>`pg_backend_pid()`.mapWith(Number),
                    })
                    .from(schema.conversationTable)
                    .where(eq(schema.conversationTable.id, vote.conversationId))
                    .for("no key update"),
            );
            locked.resolve(scope.pid);
            await insertAllowed.promise;
            await tx
                .select({
                    timeout: sql`set_config('lock_timeout', '500ms', true)`,
                })
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.id, vote.conversationId));
            return first(
                await tx
                    .insert(schema.voteTable)
                    .values({
                        authorId: pair.guestUserId,
                        opinionId: otherOpinion.id,
                    })
                    .returning(),
            );
        });
        const blockerPid = await locked.promise;
        const merging = db.transaction(
            async (tx) =>
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    ...pair,
                    now: vote.timestamp,
                }),
        );
        try {
            await waitForBlockedTransaction(blockerPid);
            insertAllowed.resolve();
            const [inserted] = await Promise.all([inserting, merging]);
            expect(
                first(
                    await db
                        .select()
                        .from(schema.voteTable)
                        .where(eq(schema.voteTable.id, inserted.id)),
                ),
            ).toMatchObject({ authorId: pair.verifiedUserId });
        } finally {
            insertAllowed.resolve();
            await Promise.allSettled([inserting, merging]);
        }
    }, 10_000);

    it("rejects automatic guest merge for a source with a deleted phone credential", async () => {
        const pair = await createMergePair();
        await persistVote({ userId: pair.guestUserId, choice: "agree" });
        const roots = await db.select().from(schema.voteTable);
        await db.insert(schema.phoneTable).values({
            userId: pair.guestUserId,
            lastTwoDigits: 12,
            countryCallingCode: "1",
            phoneHash: randomUUID(),
            isDeleted: true,
        });
        await expect(
            db.transaction(
                async (tx) =>
                    await mergeGuestIntoVerifiedUser({
                        db: tx,
                        ...pair,
                        now: vote.timestamp,
                    }),
            ),
        ).rejects.toThrow("Cannot merge a source user with credentials");
        expect(await db.select().from(schema.voteTable)).toEqual(roots);
        expect(
            first(
                await db
                    .select()
                    .from(schema.userTable)
                    .where(eq(schema.userTable.id, pair.guestUserId)),
            ),
        ).toMatchObject({ isDeleted: false, deletionReason: null });
    });

    it.each([false, true])(
        "moves preference roots, preserves tombstones, and expires inherited sessions (display conflict=%s)",
        async (displayConflict) => {
            const pair = await createMergePair();
            await db.insert(schema.followedTopicTable).values([
                { userId: pair.guestUserId, topicId: 1 },
                { userId: pair.guestUserId, topicId: 2 },
                {
                    userId: pair.guestUserId,
                    topicId: 3,
                    deletedAt: vote.timestamp,
                },
                { userId: pair.verifiedUserId, topicId: 2 },
            ]);
            await db.insert(schema.userSpokenLanguagesTable).values([
                { userId: pair.guestUserId, languageCode: "en" },
                { userId: pair.guestUserId, languageCode: "fr" },
                {
                    userId: pair.guestUserId,
                    languageCode: "de",
                    isDeleted: true,
                    deletedAt: vote.timestamp,
                },
                {
                    userId: pair.verifiedUserId,
                    languageCode: "en",
                    isDeleted: true,
                    deletedAt: vote.timestamp,
                },
            ]);
            await db
                .insert(schema.userDisplayLanguageTable)
                .values({ userId: pair.guestUserId, languageCode: "fr" });
            if (displayConflict)
                await db.insert(schema.userDisplayLanguageTable).values({
                    userId: pair.verifiedUserId,
                    languageCode: "en",
                });
            const didWrite = "did:test:merge:preferences";
            await db.insert(schema.deviceTable).values({
                userId: pair.guestUserId,
                didWrite,
                userAgent: "test",
                sessionExpiry: new Date(vote.timestamp.getTime() + 60_000),
            });
            await db.transaction(
                async (tx) =>
                    await mergeGuestIntoVerifiedUser({
                        db: tx,
                        ...pair,
                        now: vote.timestamp,
                    }),
            );
            expect(
                await db
                    .select({ topicId: schema.followedTopicTable.topicId })
                    .from(schema.followedTopicTable)
                    .where(
                        eq(
                            schema.followedTopicTable.userId,
                            pair.verifiedUserId,
                        ),
                    )
                    .orderBy(schema.followedTopicTable.topicId),
            ).toEqual([{ topicId: 1 }, { topicId: 2 }]);
            expect(
                await db
                    .select({
                        code: schema.userSpokenLanguagesTable.languageCode,
                        deleted: schema.userSpokenLanguagesTable.isDeleted,
                    })
                    .from(schema.userSpokenLanguagesTable)
                    .where(
                        eq(
                            schema.userSpokenLanguagesTable.userId,
                            pair.verifiedUserId,
                        ),
                    )
                    .orderBy(schema.userSpokenLanguagesTable.languageCode),
            ).toEqual([
                { code: "en", deleted: true },
                { code: "fr", deleted: false },
            ]);
            expect(
                first(
                    await db
                        .select()
                        .from(schema.userDisplayLanguageTable)
                        .where(
                            eq(
                                schema.userDisplayLanguageTable.userId,
                                pair.verifiedUserId,
                            ),
                        ),
                ),
            ).toMatchObject({ languageCode: displayConflict ? "en" : "fr" });
            expect(
                first(await db.select().from(schema.deviceTable)),
            ).toMatchObject({
                userId: pair.verifiedUserId,
                sessionExpiry: vote.timestamp,
            });
            expect(
                await db.select().from(schema.realtimeEventOutboxTable),
            ).toMatchObject([
                {
                    eventType: "auth_state_changed",
                    payload: {
                        userIds: [pair.guestUserId, pair.verifiedUserId],
                        reason: "identity_changed",
                    },
                },
            ]);
        },
    );

    it("moves a guest vote root with its history and rebinds only its working participant", async () => {
        const pair = await createMergePair();
        const guest = await persistVote({
            userId: pair.guestUserId,
            choice: "agree",
        });
        const changedContent = first(
            await db
                .insert(schema.voteContentTable)
                .values({
                    voteId: guest.id,
                    opinionContentId: vote.opinionContentId,
                    vote: "disagree",
                })
                .returning(),
        );
        await db
            .update(schema.voteTable)
            .set({ currentContentId: changedContent.id })
            .where(eq(schema.voteTable.id, guest.id));
        const history = await db.select().from(schema.voteContentTable);
        const originalParticipant = first(
            await db.select().from(schema.conversationParticipantTable),
        );
        await db.transaction(
            async (tx) =>
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    ...pair,
                    now: vote.timestamp,
                }),
        );
        const transferred = first(await db.select().from(schema.voteTable));
        expect(transferred).toMatchObject({
            id: guest.id,
            authorId: pair.verifiedUserId,
            currentContentId: changedContent.id,
        });
        expect(transferred.participantId).not.toBe(originalParticipant.id);
        expect(await db.select().from(schema.voteContentTable)).toEqual(
            history,
        );
        expect(
            first(
                await db
                    .select()
                    .from(schema.conversationParticipantTable)
                    .where(
                        eq(
                            schema.conversationParticipantTable.id,
                            originalParticipant.id,
                        ),
                    ),
            ),
        ).toEqual(originalParticipant);
        expect(
            first(
                await db
                    .select()
                    .from(schema.userTable)
                    .where(eq(schema.userTable.id, pair.guestUserId)),
            ),
        ).toMatchObject({
            isDeleted: true,
            deletionReason: "guest_merge",
            deletedAt: vote.timestamp,
        });
        expect(
            first(await db.select().from(schema.opinionTable)),
        ).toMatchObject({ numAgrees: 0, numDisagrees: 1, numPasses: 0 });
        const eligible = await getAnalysisEligibleOpinionVotes({
            db,
            conversationId: vote.conversationId,
            opinionIds: [vote.opinionId],
        });
        expect(await db.select().from(eligible)).toEqual([
            {
                opinionId: vote.opinionId,
                authorId: pair.verifiedUserId,
                vote: "disagree",
            },
        ]);
    });

    it.each(["disagree", "cancel"] satisfies Array<"disagree" | "cancel">)(
        "keeps the destination's %s and retires the conflicting guest without rewriting content",
        async (choice) => {
            const pair = await createMergePair();
            const guest = await persistVote({
                userId: pair.guestUserId,
                choice: "agree",
            });
            const destination = await persistVote({
                userId: pair.verifiedUserId,
                choice,
            });
            const history = await db.select().from(schema.voteContentTable);
            await db.transaction(
                async (tx) =>
                    await mergeGuestIntoVerifiedUser({
                        db: tx,
                        ...pair,
                        now: vote.timestamp,
                    }),
            );
            expect(
                first(
                    await db
                        .select()
                        .from(schema.voteTable)
                        .where(eq(schema.voteTable.id, guest.id)),
                ),
            ).toMatchObject({
                authorId: pair.guestUserId,
                currentContentId: null,
            });
            expect(
                first(
                    await db
                        .select()
                        .from(schema.voteTable)
                        .where(eq(schema.voteTable.id, destination.id)),
                ),
            ).toEqual(destination);
            expect(await db.select().from(schema.voteContentTable)).toEqual(
                history,
            );
            expect(
                first(await db.select().from(schema.opinionTable)),
            ).toMatchObject({
                numAgrees: 0,
                numDisagrees: choice === "disagree" ? 1 : 0,
                numPasses: 0,
            });
            expect(
                await calculateConversationCounters({
                    db,
                    conversationId: vote.conversationId,
                }),
            ).toMatchObject({
                voteCount: choice === "disagree" ? 1 : 0,
                participantCount: choice === "disagree" ? 1 : 0,
            });
        },
    );

    it("transfers a guest withdrawal without reviving it", async () => {
        const pair = await createMergePair();
        const root = await persistVote({
            userId: pair.guestUserId,
            choice: "cancel",
        });
        await db.transaction(
            async (tx) =>
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    ...pair,
                    now: vote.timestamp,
                }),
        );
        expect(first(await db.select().from(schema.voteTable))).toMatchObject({
            id: root.id,
            authorId: pair.verifiedUserId,
            currentContentId: null,
        });
        expect(await db.select().from(schema.voteContentTable)).toHaveLength(1);
        expect(
            await calculateConversationCounters({
                db,
                conversationId: vote.conversationId,
            }),
        ).toMatchObject({ voteCount: 0, participantCount: 0 });
    });

    it.each([false, true])(
        "keeps complete response/session roots with destination conflict=%s",
        async (conflict) => {
            const pair = await createMergePair();
            const response = first(
                await db
                    .insert(schema.surveyResponseTable)
                    .values({
                        participantId: pair.guestUserId,
                        conversationId: vote.conversationId,
                        withdrawnAt: vote.timestamp,
                    })
                    .returning(),
            );
            const ranking = first(
                await db
                    .insert(schema.comparisonResponseTable)
                    .values({
                        participantId: pair.guestUserId,
                        conversationId: vote.conversationId,
                        comparisons: [],
                    })
                    .returning(),
            );
            if (conflict) {
                await db.insert(schema.surveyResponseTable).values({
                    participantId: pair.verifiedUserId,
                    conversationId: vote.conversationId,
                });
                await db.insert(schema.comparisonResponseTable).values({
                    participantId: pair.verifiedUserId,
                    conversationId: vote.conversationId,
                    comparisons: [],
                });
            }
            await db.transaction(
                async (tx) =>
                    await mergeGuestIntoVerifiedUser({
                        db: tx,
                        ...pair,
                        now: vote.timestamp,
                    }),
            );
            const expectedOwner = conflict
                ? pair.guestUserId
                : pair.verifiedUserId;
            expect(
                first(
                    await db
                        .select()
                        .from(schema.surveyResponseTable)
                        .where(eq(schema.surveyResponseTable.id, response.id)),
                ),
            ).toMatchObject({
                participantId: expectedOwner,
                withdrawnAt: vote.timestamp,
            });
            expect(
                first(
                    await db
                        .select()
                        .from(schema.comparisonResponseTable)
                        .where(
                            eq(schema.comparisonResponseTable.id, ranking.id),
                        ),
                ),
            ).toMatchObject({ participantId: expectedOwner, comparisons: [] });
            expect(
                first(
                    await db.select().from(schema.polisConversationConfigTable),
                ).analysisDataGeneration,
            ).toBe(2);
        },
    );

    it("rolls back account retirement, root transfer, counters and analysis scheduling together", async () => {
        const pair = await createMergePair();
        await persistVote({ userId: pair.guestUserId, choice: "agree" });
        const before = {
            votes: await db.select().from(schema.voteTable),
            users: await db.select().from(schema.userTable),
            opinions: await db.select().from(schema.opinionTable),
            config: await db.select().from(schema.polisConversationConfigTable),
            participants: await db
                .select()
                .from(schema.conversationParticipantTable),
        };
        await expect(
            db.transaction(async (tx) => {
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    ...pair,
                    now: vote.timestamp,
                });
                throw new Error("rollback merge");
            }),
        ).rejects.toThrow("rollback merge");
        expect(await db.select().from(schema.voteTable)).toEqual(before.votes);
        expect(await db.select().from(schema.userTable)).toEqual(before.users);
        expect(await db.select().from(schema.opinionTable)).toEqual(
            before.opinions,
        );
        expect(
            await db.select().from(schema.polisConversationConfigTable),
        ).toEqual(before.config);
        expect(
            await db.select().from(schema.conversationParticipantTable),
        ).toEqual(before.participants);
    });

    it("rejects cross-owned current content in PostgreSQL", async () => {
        const pair = await createMergePair();
        const guest = await persistVote({
            userId: pair.guestUserId,
            choice: "agree",
        });
        const destination = await persistVote({
            userId: pair.verifiedUserId,
            choice: "disagree",
        });
        await expect(
            db
                .update(schema.voteTable)
                .set({ currentContentId: guest.currentContentId })
                .where(eq(schema.voteTable.id, destination.id)),
        ).rejects.toMatchObject({ cause: { code: "23503" } });
    });

    it("repairs legacy shared pointers without guessing merge provenance or changing original history", async () => {
        const pair = await createMergePair();
        const guest = await persistVote({
            userId: pair.guestUserId,
            choice: "agree",
        });
        const destination = await persistVote({
            userId: pair.verifiedUserId,
            choice: "cancel",
        });
        await client.unsafe(
            "ALTER TABLE vote DROP CONSTRAINT vote_current_content_owner_fk",
        );
        try {
            await db
                .update(schema.voteTable)
                .set({ currentContentId: guest.currentContentId })
                .where(eq(schema.voteTable.id, destination.id));
            const original = await db
                .select()
                .from(schema.voteContentTable)
                .where(eq(schema.voteContentTable.voteId, guest.id));
            const repair = readFileSync(
                new URL(
                    "../scripts/repair-guest-merge-vote-ownership.sql",
                    import.meta.url,
                ),
                "utf8",
            );
            await db.transaction(async (tx) => {
                await tx.execute(sql.raw(repair));
            });
            const repaired = first(
                await db
                    .select({
                        voteId: schema.voteContentTable.voteId,
                        choice: schema.voteContentTable.vote,
                    })
                    .from(schema.voteTable)
                    .innerJoin(
                        schema.voteContentTable,
                        eq(
                            schema.voteContentTable.id,
                            schema.voteTable.currentContentId,
                        ),
                    )
                    .where(eq(schema.voteTable.id, destination.id)),
            );
            expect(repaired).toEqual({
                voteId: destination.id,
                choice: "agree",
            });
            expect(
                await db
                    .select()
                    .from(schema.voteContentTable)
                    .where(eq(schema.voteContentTable.voteId, guest.id)),
            ).toEqual(original);
            expect(
                first(
                    await db
                        .select()
                        .from(schema.userTable)
                        .where(eq(schema.userTable.id, pair.guestUserId)),
                ),
            ).toMatchObject({ isDeleted: false, deletionReason: null });
            const contents = await db.select().from(schema.voteContentTable);
            await db.transaction(async (tx) => {
                await tx.execute(sql.raw(repair));
            });
            expect(await db.select().from(schema.voteContentTable)).toEqual(
                contents,
            );
        } finally {
            await client.unsafe(
                "ALTER TABLE vote ADD CONSTRAINT vote_current_content_owner_fk FOREIGN KEY (current_content_id, id) REFERENCES vote_content (id, vote_id)",
            );
        }
    });

    it("rejects legacy cross-statement content even when the vote root owns that content", async () => {
        const root = await persistVote({
            userId: vote.userId,
            choice: "agree",
        });
        const otherOpinion = first(
            await db
                .insert(schema.opinionTable)
                .values({
                    slugId: "other001",
                    authorId: vote.userId,
                    conversationId: vote.conversationId,
                })
                .returning(),
        );
        const conversationContent = first(
            await db.select().from(schema.conversationContentTable),
        );
        const otherContent = first(
            await db
                .insert(schema.opinionContentTable)
                .values({
                    opinionId: otherOpinion.id,
                    conversationContentId: conversationContent.id,
                    content: "Different statement",
                })
                .returning(),
        );
        const wrongVoteContent = first(
            await db
                .insert(schema.voteContentTable)
                .values({
                    voteId: root.id,
                    opinionContentId: otherContent.id,
                    vote: "disagree",
                })
                .returning(),
        );
        await db
            .update(schema.voteTable)
            .set({ currentContentId: wrongVoteContent.id })
            .where(eq(schema.voteTable.id, root.id));
        const contents = await db.select().from(schema.voteContentTable);
        const repair = readFileSync(
            new URL(
                "../scripts/repair-guest-merge-vote-ownership.sql",
                import.meta.url,
            ),
            "utf8",
        );
        await expect(
            db.transaction(async (tx) => {
                await tx.execute(sql.raw(repair));
            }),
        ).rejects.toMatchObject({ cause: { code: "P0001" } });
        expect(await db.select().from(schema.voteContentTable)).toEqual(
            contents,
        );
    });

    it("drops pending guest actions after merge without changing the transferred persisted choice", async () => {
        const pair = await createMergePair();
        const persisted = await persistVote({
            userId: pair.guestUserId,
            choice: "agree",
        });
        const buffer = createBuffer();
        await buffer.add({
            vote: { ...vote, userId: pair.guestUserId, vote: "disagree" },
        });
        await db.transaction(
            async (tx) =>
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    ...pair,
                    now: vote.timestamp,
                }),
        );
        await buffer.flush();
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
        expect(await db.select().from(schema.voteTable)).toMatchObject([
            {
                id: persisted.id,
                authorId: pair.verifiedUserId,
                currentContentId: persisted.currentContentId,
            },
        ]);
        expect(
            first(await db.select().from(schema.opinionTable)),
        ).toMatchObject({ numAgrees: 1, numDisagrees: 0 });
        // Further actions under the destination identity still use ordinary voting.
        await buffer.add({
            vote: { ...vote, userId: pair.verifiedUserId, vote: "pass" },
        });
        await buffer.flush();
        expect(
            first(await db.select().from(schema.opinionTable)),
        ).toMatchObject({ numAgrees: 0, numDisagrees: 0, numPasses: 1 });
    });

    it("refreshes vote-only account deletion once, drops pending actions, and preserves recovery sources", async () => {
        const pair = await createMergePair();
        await persistVote({ userId: pair.guestUserId, choice: "agree" });
        await db.transaction(
            async (tx) =>
                await reconcileOpinionVoteCounters({
                    db: tx,
                    opinionIds: [vote.opinionId],
                }),
        );
        const roots = await db.select().from(schema.voteTable);
        const contents = await db.select().from(schema.voteContentTable);
        const buffer = createBuffer();
        await buffer.add({
            vote: { ...vote, userId: pair.guestUserId, vote: "disagree" },
        });
        await deleteUserAccount({ db, userId: pair.guestUserId });
        await buffer.flush();
        expect(await db.select().from(schema.voteTable)).toEqual(roots);
        expect(await db.select().from(schema.voteContentTable)).toEqual(
            contents,
        );
        expect(
            first(await db.select().from(schema.opinionTable)),
        ).toMatchObject({ numAgrees: 0, numDisagrees: 0, numPasses: 0 });
        expect(
            first(await db.select().from(schema.polisConversationConfigTable))
                .analysisDataGeneration,
        ).toBe(2);
        expect(
            await calculateConversationCounters({
                db,
                conversationId: vote.conversationId,
            }),
        ).toMatchObject({
            voteCount: 0,
            totalVoteCount: 0,
            participantCount: 0,
        });
        await deleteUserAccount({ db, userId: pair.guestUserId });
        expect(
            first(await db.select().from(schema.polisConversationConfigTable))
                .analysisDataGeneration,
        ).toBe(2);
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
        expect(
            first(
                await db
                    .select()
                    .from(schema.userTable)
                    .where(
                        and(
                            eq(schema.userTable.id, pair.guestUserId),
                            eq(schema.userTable.isDeleted, true),
                        ),
                    ),
            ),
        ).toMatchObject({ deletionReason: "account_deletion" });
    });

    it("refreshes survey-only account deletion without erasing recovery responses", async () => {
        const pair = await createMergePair();
        const response = first(
            await db
                .insert(schema.surveyResponseTable)
                .values({
                    participantId: pair.guestUserId,
                    conversationId: vote.conversationId,
                    completedAt: vote.timestamp,
                })
                .returning(),
        );
        await deleteUserAccount({ db, userId: pair.guestUserId });
        expect(
            first(await db.select().from(schema.polisConversationConfigTable))
                .analysisDataGeneration,
        ).toBe(2);
        expect(await db.select().from(schema.surveyResponseTable)).toEqual([
            response,
        ]);
    });

    it.each(["open", "closing", "finalized"])(
        "backfills stale live counts and refreshes only eligible %s conversations",
        async (state) => {
            const pair = await createMergePair();
            await persistVote({ userId: pair.guestUserId, choice: "agree" });
            await persistVote({
                userId: pair.verifiedUserId,
                choice: "disagree",
            });
            await db.transaction(
                async (tx) =>
                    await reconcileOpinionVoteCounters({
                        db: tx,
                        opinionIds: [vote.opinionId],
                    }),
            );
            await db
                .update(schema.userTable)
                .set({ isDeleted: true, deletedAt: vote.timestamp })
                .where(eq(schema.userTable.id, pair.guestUserId));
            await db
                .update(schema.conversationTable)
                .set({
                    isClosed: state !== "open",
                    closingTargetRevision: state === "open" ? null : 1,
                    closedFinalizedAt:
                        state === "finalized" ? vote.timestamp : null,
                })
                .where(eq(schema.conversationTable.id, vote.conversationId));
            expect(
                first(await db.select().from(schema.opinionTable)),
            ).toMatchObject({ numAgrees: 1, numDisagrees: 1 });
            const backfill = readFileSync(
                new URL(
                    "../scripts/refresh-deleted-account-live-inputs.sql",
                    import.meta.url,
                ),
                "utf8",
            );
            await db.transaction(async (tx) => {
                await tx.execute(sql.raw(backfill));
            });
            expect(
                first(await db.select().from(schema.opinionTable)),
            ).toMatchObject({ numAgrees: 0, numDisagrees: 1 });
            expect(
                first(
                    await db.select().from(schema.polisConversationConfigTable),
                ).analysisDataGeneration,
            ).toBe(state === "finalized" ? 1 : 2);
            expect(
                first(await db.select().from(schema.conversationTable)),
            ).toMatchObject({
                closingTargetRevision:
                    state === "open" ? null : state === "closing" ? 2 : 1,
            });
            expect(
                first(
                    await db
                        .select()
                        .from(schema.userTable)
                        .where(eq(schema.userTable.id, pair.guestUserId)),
                ),
            ).toMatchObject({
                deletionReason: null,
                deletedAt: vote.timestamp,
            });
            expect(
                await db.select().from(schema.voteContentTable),
            ).toHaveLength(2);
        },
    );

    it.each(["account_deletion", "guest_merge"])(
        "preserves the frozen matrix, results and checkpoint counts during %s",
        async (operation) => {
            const pair = await createMergePair();
            await persistVote({ userId: pair.guestUserId, choice: "agree" });
            await persistVote({
                userId: pair.verifiedUserId,
                choice: "disagree",
            });
            const specFamily = first(
                await db
                    .insert(schema.analysisSpecTable)
                    .values({ analysisFamily: "opinion_groups" })
                    .returning(),
            );
            const spec = first(
                await db
                    .insert(schema.opinionGroupSpecTable)
                    .values({
                        analysisSpecId: specFamily.id,
                        key: "frozen",
                        version: 1,
                        reducer: "pca",
                        clusterer: "kmeans",
                        selectionPolicy: "silhouette_size_balance",
                        minClusterableParticipants: 2,
                        minVotesPerParticipant: 1,
                        maxGroupCount: 6,
                    })
                    .returning(),
            );
            const matrix = Buffer.from(
                JSON.stringify({
                    schema_version: 1,
                    conversation_id: vote.conversationId,
                    data_generation: 1,
                    opinion_count: 1,
                    participant_count: 2,
                    votes: [
                        { participant_index: 0, opinion_index: 0, vote: 1 },
                        { participant_index: 1, opinion_index: 0, vote: -1 },
                    ],
                }),
            );
            const input = first(
                await db
                    .insert(schema.analysisInputSnapshotTable)
                    .values({
                        conversationId: vote.conversationId,
                        dataGeneration: 1,
                        inputHash: createHash("sha256")
                            .update(matrix)
                            .digest("hex"),
                        opinionCount: 1,
                        participantCount: 2,
                        voteCount: 2,
                        compression: "zstd",
                        payload: zstdCompressSync(matrix).toString("base64url"),
                    })
                    .returning(),
            );
            const snapshot = first(
                await db
                    .insert(schema.analysisSnapshotTable)
                    .values({
                        conversationId: vote.conversationId,
                        inputSnapshotId: input.id,
                        dataGeneration: 1,
                        computedAt: vote.timestamp,
                    })
                    .returning(),
            );
            const result = first(
                await db
                    .insert(schema.analysisSnapshotResultTable)
                    .values({
                        conversationId: vote.conversationId,
                        analysisSnapshotId: snapshot.id,
                        opinionGroupSpecId: spec.id,
                        outcome: "success",
                    })
                    .returning(),
            );
            const frame = first(
                await db
                    .insert(schema.conversationViewSnapshotTable)
                    .values({
                        conversationId: vote.conversationId,
                        analysisSnapshotId: snapshot.id,
                        opinionGroupSpecId: spec.id,
                        viewReason: "analysis_completed",
                        isClosed: false,
                        activatedAt: vote.timestamp,
                        opinionCount: 1,
                        totalOpinionCount: 1,
                        voteCount: 2,
                        totalVoteCount: 2,
                        participantCount: 2,
                        totalParticipantCount: 2,
                        moderatedOpinionCount: 0,
                        hiddenOpinionCount: 0,
                    })
                    .returning(),
            );
            const checkpoint = first(
                await db
                    .insert(
                        schema.conversationViewSnapshotCheckpointReasonTable,
                    )
                    .values({
                        conversationViewSnapshotId: frame.id,
                        conversationId: vote.conversationId,
                        opinionGroupSpecId: spec.id,
                        reason: "first_displayable_analysis",
                    })
                    .returning(),
            );
            if (operation === "guest_merge")
                await db.transaction(
                    async (tx) =>
                        await mergeGuestIntoVerifiedUser({
                            db: tx,
                            ...pair,
                            now: vote.timestamp,
                        }),
                );
            else await deleteUserAccount({ db, userId: pair.guestUserId });
            expect(
                await calculateConversationCounters({
                    db,
                    conversationId: vote.conversationId,
                }),
            ).toMatchObject({ participantCount: 1, voteCount: 1 });
            expect(
                await db.select().from(schema.analysisInputSnapshotTable),
            ).toEqual([input]);
            expect(
                await db.select().from(schema.analysisSnapshotTable),
            ).toEqual([snapshot]);
            expect(
                await db.select().from(schema.analysisSnapshotResultTable),
            ).toEqual([result]);
            expect(
                await db.select().from(schema.conversationViewSnapshotTable),
            ).toEqual([frame]);
            expect(
                await db
                    .select()
                    .from(schema.conversationViewSnapshotCheckpointReasonTable),
            ).toEqual([checkpoint]);
        },
    );

    it("accepts into Valkey without writing a vote and drains the cache before closing analysis", async () => {
        const buffer = createBuffer();
        await buffer.add({ vote });
        expect(await db.select().from(schema.voteTable)).toEqual([]);
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(1);
        await db
            .update(schema.conversationTable)
            .set({
                isClosed: true,
                closingTargetRevision: 1,
                voteBufferDrained: false,
            })
            .where(eq(schema.conversationTable.id, vote.conversationId));
        expect(await buffer.add({ vote: { ...vote, vote: "cancel" } })).toBe(
            "conversation_closed",
        );
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
        await buffer.flush();
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
        expect(
            first(await db.select().from(schema.conversationTable))
                .voteBufferDrained,
        ).toBe(true);
        expect(await db.select().from(schema.voteTable)).toHaveLength(1);
    });

    it("does not start a PostgreSQL transaction on the ordinary enqueue path", async () => {
        const buffer = createBuffer();
        const scope = first(await db.select().from(schema.conversationTable));
        const transaction = vi.spyOn(db, "transaction");
        try {
            await buffer.add({
                vote: {
                    ...vote,
                    scope: { epoch: scope.voteBufferEpoch, minimumSequence: 0 },
                },
            });
            expect(transaction).not.toHaveBeenCalled();
            expect(await db.select().from(schema.voteTable)).toEqual([]);
        } finally {
            transaction.mockRestore();
        }
    });

    it("keeps the closing-drain lookup indexed with 100,000 unrelated conversations", async () => {
        await client.unsafe(`INSERT INTO polis_conversation_config (analysis_data_generation)
            SELECT 0 FROM generate_series(1, 100000)`);
        await client.unsafe(
            `INSERT INTO conversation (slug_id, project_id, polis_config_id)
            SELECT 'b' || lpad(id::text, 7, '0'), 1, id FROM polis_conversation_config WHERE id > $1`,
            [configId],
        );
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true, voteBufferDrained: false })
            .where(eq(schema.conversationTable.id, vote.conversationId));
        await client.unsafe("ANALYZE conversation");
        const query = buildClosingVoteDrainQuery(db).toSQL();
        const parameters = z
            .array(z.union([z.string(), z.number(), z.boolean()]))
            .parse(query.params);
        const rows = z
            .array(z.object({ "QUERY PLAN": z.string() }))
            .parse(
                await client.unsafe(
                    `EXPLAIN (ANALYZE, BUFFERS) ${query.sql}`,
                    parameters,
                ),
            );
        const plan = rows.map((row) => row["QUERY PLAN"]).join("\n");
        console.info(
            "Synthetic closing-drain lookup (100,000 unrelated conversations):\n",
            plan,
        );
        expect(plan).toContain("conversation_vote_buffer_drain_idx");
        expect(await buildClosingVoteDrainQuery(db)).toHaveLength(1);
    });

    it("keeps the vote-source lookup indexed with 100,000 stored votes", async () => {
        await client.unsafe(`INSERT INTO "user" (id, username)
            SELECT gen_random_uuid(), 'bench' || n FROM generate_series(1, 100000) n`);
        await client.unsafe(
            `INSERT INTO vote (author_id, opinion_id)
            SELECT id, $1 FROM "user" WHERE username LIKE 'bench%'`,
            [vote.opinionId],
        );
        await client.unsafe("ANALYZE vote");
        await client.unsafe('ANALYZE "user"');
        const query = buildVoteSourceQuery({
            db,
            opinionSlugId: "source01",
            participantId: vote.userId,
        }).toSQL();
        const parameters = z
            .array(z.union([z.string(), z.number(), z.boolean()]))
            .parse(query.params);
        const rows = z
            .array(
                z.object({
                    "QUERY PLAN": z.array(
                        z.object({
                            Plan: z.unknown(),
                            "Execution Time": z.number(),
                        }),
                    ),
                }),
            )
            .parse(
                await client.unsafe(
                    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`,
                    parameters,
                ),
            );
        const measured = first(first(rows)["QUERY PLAN"]);
        function voteScans(node: unknown): string[] {
            const parsed = z
                .object({
                    "Node Type": z.string(),
                    "Relation Name": z.string().optional(),
                    Plans: z.array(z.unknown()).optional(),
                })
                .parse(node);
            return [
                ...(parsed["Relation Name"] === "vote"
                    ? [parsed["Node Type"]]
                    : []),
                ...(parsed.Plans ?? []).flatMap(voteScans),
            ];
        }
        const scans = voteScans(measured.Plan);
        expect(scans.length).toBeGreaterThan(0);
        expect(
            scans.every((scan) =>
                ["Index Scan", "Index Only Scan", "Bitmap Heap Scan"].includes(
                    scan,
                ),
            ),
        ).toBe(true);
        console.info(
            "Synthetic vote-source lookup (100,000 votes):",
            measured["Execution Time"],
            "ms;",
            scans,
        );
    }, 60_000);

    it("reports a known unavailable buffer instead of acknowledging a locally saved vote", async () => {
        const buffer = createVoteBuffer({
            db,
            valkeyRef: { current: undefined },
            flushIntervalMs: 60_000,
            valkeyBatchLimit: 100,
        });
        buffers.push(buffer);
        await expect(buffer.add({ vote })).rejects.toMatchObject({
            statusCode: 503,
        });
        expect(await db.select().from(schema.voteTable)).toEqual([]);
    });

    it("does not apply an old buffered choice to edited statement content", async () => {
        const buffer = createBuffer();
        await buffer.add({ vote });
        const next = first(
            await db
                .insert(schema.opinionContentTable)
                .values({
                    opinionId: vote.opinionId,
                    conversationContentId: first(
                        await db.select().from(schema.conversationContentTable),
                    ).id,
                    content: "Edited",
                    contentPlainText: "Edited",
                })
                .returning(),
        );
        await db
            .update(schema.opinionTable)
            .set({ currentContentId: next.id })
            .where(eq(schema.opinionTable.id, vote.opinionId));
        await buffer.flush();
        expect(await db.select().from(schema.voteTable)).toEqual([]);
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
    });

    it("cleans malformed cache entries without starving valid votes", async () => {
        const buffer = createBuffer();
        await buffer.add({ vote });
        await valkey.hset(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA, {
            "malformed:0": "{",
            "legacy:0": "null",
        });
        await valkey.zadd(VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX, {
            "malformed:0": 0,
            "legacy:0": 0,
        });
        await buffer.flush();
        expect(await db.select().from(schema.voteTable)).toHaveLength(1);
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
        expect(await valkey.zcard(VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX)).toBe(0);
    });

    it("rejects stale epoch payloads after reopening and fences delayed close calls", async () => {
        const buffer = createBuffer();
        const previousEpoch = first(
            await db.select().from(schema.conversationTable),
        ).voteBufferEpoch;
        await buffer.add({ vote });
        const blockingParams = {
            db,
            opinionId: vote.opinionId,
            authorId: vote.userId,
            isSeed: true,
        };
        expect(await buffer.hasBlockingVotes(blockingParams)).toBe(true);
        const epoch = randomUUID();
        await db
            .update(schema.conversationTable)
            .set({ voteBufferEpoch: epoch })
            .where(eq(schema.conversationTable.id, vote.conversationId));
        expect(await buffer.hasBlockingVotes(blockingParams)).toBe(false);
        await sealVoteBuffer({
            valkey,
            epoch: previousEpoch,
        });
        // Both epochs can be in the queue: an old scope must neither replace
        // the reopened action nor cause its cleanup to consume that action.
        await buffer.add({ vote: { ...vote, vote: "disagree" } });
        await buffer.flush();
        expect(await db.select().from(schema.voteTable)).toHaveLength(1);
        expect(
            first(await db.select().from(schema.voteContentTable)).vote,
        ).toBe("disagree");
    });

    it("cannot replay an older committed vote over a same-timestamp cancellation", async () => {
        const buffer = createBuffer();
        await buffer.add({ vote });
        const key = getBufferedVoteKey({
            ...vote,
            voteBufferEpoch: first(
                await db.select().from(schema.conversationTable),
            ).voteBufferEpoch,
        });
        const oldPayload = String(
            await valkey.hget(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA, key),
        );
        await buffer.flush();
        await buffer.add({ vote: { ...vote, vote: "cancel" } });
        await buffer.flush();
        await valkey.hset(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA, {
            [key]: oldPayload,
        });
        await valkey.zadd(VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX, {
            [key]: vote.timestamp.getTime(),
        });
        await buffer.flush();
        expect(
            first(await db.select().from(schema.voteTable)).currentContentId,
        ).toBeNull();
        expect(
            first(await db.select().from(schema.opinionTable)).numAgrees,
        ).toBe(0);
        expect(await db.select().from(schema.voteContentTable)).toHaveLength(1);
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
        expect(state.events.map((event) => event.eventType).sort()).toEqual([
            "opinion_redacted",
            "sources_invalidated",
        ]);
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

    it("removes deleted live voter rows and personal statement columns", async () => {
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
                [bob, carol].flatMap((authorId) =>
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
        ).toMatchObject({
            opinionCount: 2,
            voteCount: 4,
            participantCount: 2,
            totalVoteCount: 4,
            totalParticipantCount: 2,
        });
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

    it.each([
        { withBaseline: true, withCompleteCatalogue: true, specCount: 1 },
        { withBaseline: false, withCompleteCatalogue: true, specCount: 1 },
        { withBaseline: true, withCompleteCatalogue: false, specCount: 1 },
        { withBaseline: true, withCompleteCatalogue: true, specCount: 2 },
    ])(
        "only reuses empty-vote output with certified complete catalogues ($withBaseline, $withCompleteCatalogue)",
        async ({ withBaseline, withCompleteCatalogue, specCount }) => {
            const analysisSpecId = first(
                await db
                    .insert(schema.analysisSpecTable)
                    .values({ analysisFamily: "opinion_groups" })
                    .returning(),
            ).id;
            const specs = await db
                .insert(schema.opinionGroupSpecTable)
                .values(
                    Array.from({ length: specCount }, (_, index) => ({
                        analysisSpecId,
                        key: `test-${String(index)}`,
                        version: 1,
                        reducer: "pca" as const,
                        clusterer: "kmeans" as const,
                        selectionPolicy: "silhouette_size_balance" as const,
                        minClusterableParticipants: 2,
                        minVotesPerParticipant: 1,
                        maxGroupCount: 6,
                    })),
                )
                .returning();
            const inputId = first(
                await db
                    .insert(schema.analysisInputSnapshotTable)
                    .values({
                        conversationId: vote.conversationId,
                        dataGeneration: 1,
                        inputHash: "a".repeat(64),
                        payloadVersion: withBaseline ? 2 : 1,
                        opinionCount: withCompleteCatalogue ? 1 : 0,
                        participantCount: 0,
                        voteCount: 0,
                        compression: "zstd",
                        payload: "",
                    })
                    .returning(),
            ).id;
            if (withBaseline)
                await db.insert(schema.analysisInputBaselineTable).values({
                    inputSnapshotId: inputId,
                    baselineInputSnapshotId: inputId,
                    conversationId: vote.conversationId,
                    participantIndices: [],
                    opinionIndices: withCompleteCatalogue ? [0] : [],
                    sourceVoteCount: 0,
                    sourceParticipantCount: 0,
                });
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
            await db.insert(schema.analysisSnapshotResultTable).values(
                specs.map((spec) => ({
                    conversationId: vote.conversationId,
                    analysisSnapshotId: snapshotId,
                    opinionGroupSpecId: spec.id,
                    outcome: "insufficient_data" as const,
                    outcomeReason: "empty_vote_matrix" as const,
                    variantsEnabled: false,
                })),
            );
            await db.insert(schema.conversationViewSnapshotTable).values(
                specs.map((spec) => ({
                    conversationId: vote.conversationId,
                    analysisSnapshotId: snapshotId,
                    opinionGroupSpecId: spec.id,
                    viewReason: "analysis_completed" as const,
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
                })),
            );
            const finalized = await db.transaction(async (tx) => {
                await tx
                    .update(schema.conversationTable)
                    .set({ isClosed: true })
                    .where(
                        eq(schema.conversationTable.id, vote.conversationId),
                    );
                return await finalizeCurrentPolisConversation({
                    db: tx,
                    conversationId: vote.conversationId,
                });
            });
            const reusable = withBaseline && withCompleteCatalogue;
            expect(finalized).toBe(reusable);
            if (!reusable) {
                expect(
                    await db
                        .select()
                        .from(schema.conversationAnalysisCloseTable),
                ).toEqual([]);
                expect(
                    await db.select().from(schema.polisAnalysisCloseTable),
                ).toEqual([]);
                expect(
                    first(
                        await db
                            .select()
                            .from(schema.polisConversationConfigTable),
                    ).analysisDataGeneration,
                ).toBe(2);
                await db.transaction(async (tx) => {
                    expect(
                        await finalizeCurrentPolisConversation({
                            db: tx,
                            conversationId: vote.conversationId,
                        }),
                    ).toBe(false);
                });
                expect(
                    first(
                        await db
                            .select()
                            .from(schema.polisConversationConfigTable),
                    ).analysisDataGeneration,
                ).toBe(2);
                expect(
                    first(await db.select().from(schema.conversationTable))
                        .closedFinalizedAt,
                ).toBeNull();
                expect(
                    await db
                        .select()
                        .from(
                            schema.conversationViewSnapshotCheckpointReasonTable,
                        ),
                ).toEqual([]);
                return;
            }
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
                        .from(
                            schema.conversationViewSnapshotCheckpointReasonTable,
                        ),
                ).reason,
            ).toBe("conversation_closed");
            const close = first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            );
            const refs = await db.select().from(schema.polisAnalysisCloseTable);
            const checkpoints = await db
                .select()
                .from(schema.conversationViewSnapshotCheckpointReasonTable);
            expect(close.selectedInputMode).toBe("closing");
            expect(close.sourceRevision).toBe(1);
            expect(close.closeEpoch).toBe(
                first(await db.select().from(schema.conversationTable))
                    .voteBufferEpoch,
            );
            expect(refs).toHaveLength(specCount);
            expect(checkpoints).toHaveLength(specCount);
            for (const checkpoint of checkpoints) {
                expect(refs).toContainEqual({
                    closeId: close.id,
                    conversationId: vote.conversationId,
                    opinionGroupSpecId: checkpoint.opinionGroupSpecId,
                    originalViewSnapshotId:
                        checkpoint.conversationViewSnapshotId,
                });
            }
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
            expect(
                await db.select().from(schema.conversationAnalysisCloseTable),
            ).toHaveLength(1);
            expect(
                await db.select().from(schema.polisAnalysisCloseTable),
            ).toHaveLength(specCount);
        },
    );
});
