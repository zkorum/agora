import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pushSchema } from "drizzle-kit/api-postgres";
import { and, count, eq, getTableName, is, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import { retireComparisonAccountInputs } from "../src/shared-backend/comparisonAccountLifecycle.js";
import { findAccountParticipationSource } from "../src/shared-backend/accountParticipationSources.js";
import { unlinkAccountRetainedContributions } from "../src/shared-backend/deletionIdentity.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined)
        throw new Error("Missing comparison retention fixture");
    return row;
}

describe("result-owned comparison evidence and account-source retirement", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "comparison_retention",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "comparison_retention",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (await pushSchema(schema, drizzlePg({ client: pool }))).apply();
        } finally {
            await pool.end();
        }
        await client.unsafe(
            await readFile(
                new URL(
                    "../scripts/prepare-comparison-retention-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    }, 120_000);
    beforeEach(async () => {
        const tables = Object.values(schema)
            .filter((value) => is(value, PgTable))
            .map((table) => `"${getTableName(table)}"`);
        if (client === undefined) throw new Error("Missing test database");
        // TRUNCATE resets only this fresh disposable schema, not application data.
        await client.unsafe(
            `TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function seed(method: "bws" | "pairwise") {
        const userId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: "voter" });
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "retention",
                    title: "Retention",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const config = first(
            await db
                .insert(schema.rankingConversationConfigTable)
                .values({ rankingMode: method })
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "retain01",
                    projectId: project.id,
                    rankingConfigId: config.id,
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({ conversationId: conversation.id, title: "Retention" })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const slugs =
            method === "bws"
                ? ["retain01", "retain02", "retain03", "retain04"]
                : ["retain01", "retain02"];
        const best = first(slugs);
        const worst = first(slugs.slice(-1));
        const history = [{ best, worst, set: slugs }];
        const response = first(
            await db
                .insert(schema.comparisonResponseTable)
                .values({
                    participantId: userId,
                    conversationId: conversation.id,
                    comparisons: history,
                    ranking: slugs,
                    isComplete: true,
                })
                .returning(),
        );
        await db.insert(schema.comparisonAnswerTable).values({
            comparisonResponseId: response.id,
            position: 0,
            bestSlugId: best,
            worstSlugId: worst,
            candidateSet: slugs,
        });
        await db.insert(schema.comparisonUserEntityScoreTable).values({
            comparisonResponseId: response.id,
            entitySlugId: best,
            score: 1,
            displayScore: 0.7,
            uncertaintyLeft: 0.1,
            uncertaintyRight: 0.1,
        });
        const participant = first(
            await db
                .insert(schema.conversationParticipantTable)
                .values({ userId, conversationId: conversation.id })
                .returning(),
        );
        const score = first(
            await db
                .insert(schema.rankingScoreTable)
                .values({
                    conversationId: conversation.id,
                    scores: [{ entityId: best, score: 1 }],
                    participantCounts: { [best]: 1 },
                    pipelineConfig: {},
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ currentRankingScoreId: score.id })
            .where(eq(schema.rankingConversationConfigTable.id, config.id));
        const snapshot = first(
            await db
                .insert(schema.rankingConversationStatsSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    rankingScoreId: score.id,
                    itemCount: slugs.length,
                    totalItemCount: slugs.length,
                    voteCount: 1,
                    totalVoteCount: 1,
                    participantCount: 1,
                    totalParticipantCount: 1,
                    scoringInputRevision: 0,
                    isClosed: true,
                })
                .returning(),
        );
        await db.insert(schema.rankingConversationStatsCheckpointTable).values({
            conversationId: conversation.id,
            statsSnapshotId: snapshot.id,
            reason: "conversation_closed",
        });
        const input = await db.transaction(async (tx) => {
            const draft = first(
                await tx
                    .insert(schema.rankingInputSnapshotTable)
                    .values({
                        conversationId: conversation.id,
                        comparisonMethod: method,
                        scoringInputRevision: 0,
                        algorithmVersion: 1,
                        solidagoVersion: "0.5.0",
                        pipelineConfig: {
                            preference_learning: "JointMaxDiffLearning",
                            choice_scale: 0.5,
                            trust: "equal",
                            trust_score: 1,
                        },
                        participantCount: 1,
                        itemCount: slugs.length,
                        answerCount: 1,
                    })
                    .returning(),
            );
            await tx
                .insert(schema.rankingInputParticipantTable)
                .values({ inputSnapshotId: draft.id, participantIndex: 0 });
            await tx.insert(schema.rankingInputItemTable).values(
                slugs.map((itemSlugId, position) => ({
                    inputSnapshotId: draft.id,
                    itemSlugId,
                    position,
                })),
            );
            await tx.insert(schema.rankingInputAnswerTable).values({
                inputSnapshotId: draft.id,
                participantIndex: 0,
                position: 0,
                bestSlugId: best,
                worstSlugId: worst,
                candidateSet: slugs,
                effectiveCandidateSet: slugs,
            });
            return first(
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({ sealedAt: new Date(), statsSnapshotId: snapshot.id })
                    .where(eq(schema.rankingInputSnapshotTable.id, draft.id))
                    .returning(),
            );
        });
        return {
            userId,
            configId: config.id,
            conversation,
            response,
            participant,
            score,
            snapshot,
            input,
            slugs,
        };
    }
    async function evidence() {
        return {
            roots: await db.select().from(schema.rankingInputSnapshotTable),
            participants: await db
                .select()
                .from(schema.rankingInputParticipantTable),
            items: await db.select().from(schema.rankingInputItemTable),
            answers: await db.select().from(schema.rankingInputAnswerTable),
            scores: await db.select().from(schema.rankingScoreTable),
            snapshots: await db
                .select()
                .from(schema.rankingConversationStatsSnapshotTable),
            checkpoints: await db
                .select()
                .from(schema.rankingConversationStatsCheckpointTable),
        };
    }

    it.each(["bws", "pairwise"] as const)(
        "preserves %s evidence/counts while removing account associations, never reattaching later registration",
        async (method) => {
            const f = await seed(method);
            await db
                .update(schema.conversationTable)
                .set({
                    isClosed: true,
                    closingTargetRevision: 0,
                    closedFinalizedAt: new Date(),
                })
                .where(eq(schema.conversationTable.id, f.conversation.id));
            const before = await evidence();
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({ db: tx, userId: f.userId }),
                ),
            ).resolves.toEqual({
                status: "blocked",
                reason: "account_not_purging",
            });
            // A recoverable deletion alone still cannot retire the resumable session.
            await db
                .update(schema.userTable)
                .set({ isDeleted: true })
                .where(eq(schema.userTable.id, f.userId));
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({ db: tx, userId: f.userId }),
                ),
            ).resolves.toEqual({
                status: "blocked",
                reason: "account_not_purging",
            });
            await db
                .update(schema.userTable)
                .set({ purgeStartedAt: new Date() })
                .where(eq(schema.userTable.id, f.userId));
            await expect(
                db.transaction((tx) =>
                    findAccountParticipationSource({
                        db: tx,
                        userId: f.userId,
                    }),
                ),
            ).resolves.toBe("comparison_response");
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({ db: tx, userId: f.userId }),
                ),
            ).resolves.toEqual({
                status: "progress",
                responses: 1,
                answers: 1,
                personalScores: 1,
            });
            await expect(
                db.transaction((tx) =>
                    findAccountParticipationSource({
                        db: tx,
                        userId: f.userId,
                    }),
                ),
            ).resolves.toBeUndefined();
            await expect(
                db.transaction((tx) =>
                    unlinkAccountRetainedContributions({
                        db: tx,
                        userId: f.userId,
                    }),
                ),
            ).resolves.toMatchObject({ status: "progress", participants: 1 });
            expect(await evidence()).toEqual(before);
            expect(
                first(await db.select().from(schema.comparisonResponseTable)),
            ).toMatchObject({
                participantId: null,
                comparisons: [],
                ranking: null,
                isComplete: false,
            });
            expect(
                first(
                    await db.select().from(schema.conversationParticipantTable),
                ).userId,
            ).toBeNull();
            const newUserId = randomUUID();
            await db
                .insert(schema.userTable)
                .values({ id: newUserId, username: "later-voter" });
            await expect(
                db
                    .update(schema.comparisonResponseTable)
                    .set({ participantId: newUserId, detachedAt: null })
                    .where(
                        eq(schema.comparisonResponseTable.id, f.response.id),
                    ),
            ).rejects.toMatchObject({
                cause: { constraint_name: "comparison_source_no_reattachment" },
            });
            const fresh = first(
                await db
                    .insert(schema.comparisonResponseTable)
                    .values({
                        participantId: newUserId,
                        conversationId: f.conversation.id,
                        comparisons: [],
                    })
                    .returning(),
            );
            expect(fresh.id).not.toBe(f.response.id);
            expect(
                (
                    await db
                        .select({ count: count() })
                        .from(schema.comparisonAnswerTable)
                        .where(
                            eq(
                                schema.comparisonAnswerTable
                                    .comparisonResponseId,
                                fresh.id,
                            ),
                        )
                ).at(0)?.count,
            ).toBe(0);
            expect(await evidence()).toEqual(before);
        },
    );

    it("bounds private child retirement and detaches only after all active children are retired", async () => {
        const f = await seed("bws");
        await db.insert(schema.comparisonAnswerTable).values(
            [1, 2].map((position) => ({
                comparisonResponseId: f.response.id,
                position,
                bestSlugId: first(f.slugs),
                worstSlugId: first(f.slugs.slice(-1)),
                candidateSet: f.slugs,
            })),
        );
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        for (const responses of [0, 0, 1]) {
            await expect(
                db.transaction((tx) =>
                    retireComparisonAccountInputs({
                        db: tx,
                        userId: f.userId,
                        limit: 1,
                    }),
                ),
            ).resolves.toMatchObject({
                status: "progress",
                responses,
                answers: 1,
            });
        }
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({
                    db: tx,
                    userId: f.userId,
                    limit: 1,
                }),
            ),
        ).resolves.toEqual({
            status: "progress",
            responses: 0,
            answers: 0,
            personalScores: 0,
        });
    });

    it("blocks legacy retained checkpoints rather than manufacturing input evidence", async () => {
        const f = await seed("pairwise");
        await db.insert(schema.rankingConversationStatsSnapshotTable).values({
            conversationId: f.conversation.id,
            itemCount: 2,
            totalItemCount: 2,
            voteCount: 1,
            totalVoteCount: 1,
            participantCount: 1,
            totalParticipantCount: 1,
            scoringInputRevision: 0,
            isClosed: true,
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "legacy_comparison_evidence_missing",
        });
        expect(
            first(await db.select().from(schema.comparisonResponseTable))
                .participantId,
        ).toBe(f.userId);
        expect(
            first(await db.select().from(schema.comparisonAnswerTable))
                .deletedAt,
        ).toBeNull();
        await db
            .update(schema.comparisonAnswerTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.comparisonAnswerTable.comparisonResponseId,
                    f.response.id,
                ),
            );
        await db
            .update(schema.comparisonUserEntityScoreTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.comparisonUserEntityScoreTable.comparisonResponseId,
                    f.response.id,
                ),
            );
        await expect(
            db
                .update(schema.comparisonResponseTable)
                .set({
                    participantId: null,
                    detachedAt: new Date(),
                    comparisons: [],
                    ranking: null,
                    isComplete: false,
                })
                .where(eq(schema.comparisonResponseTable.id, f.response.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "comparison_source_unlink_not_ready" },
        });
    });

    it("waits for an unfinished close before retiring private inputs", async () => {
        const f = await seed("pairwise");
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true, closingTargetRevision: 0 })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "unfinished_comparison_calculation",
        });
        expect(
            first(await db.select().from(schema.comparisonAnswerTable))
                .deletedAt,
        ).toBeNull();
        await db
            .update(schema.conversationTable)
            .set({ closedFinalizedAt: new Date() })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toMatchObject({ status: "progress", responses: 1 });
    });

    it("blocks a legacy current score even when other checkpoint inputs exist", async () => {
        const f = await seed("bws");
        const legacy = first(
            await db
                .insert(schema.rankingScoreTable)
                .values({
                    conversationId: f.conversation.id,
                    scores: [],
                    participantCounts: {},
                    pipelineConfig: {},
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db
            .update(schema.rankingConversationConfigTable)
            .set({ currentRankingScoreId: legacy.id })
            .where(eq(schema.rankingConversationConfigTable.id, f.configId));
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "legacy_comparison_evidence_missing",
        });
    });

    it("blocks legacy account-keyed trust blobs, including unrooted score copies", async () => {
        const f = await seed("pairwise");
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: { [f.userId]: 1 },
            computedAt: new Date(),
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toEqual({
            status: "blocked",
            reason: "legacy_comparison_account_context",
        });
        expect(
            first(await db.select().from(schema.comparisonResponseTable))
                .participantId,
        ).toBe(f.userId);
    });

    it("treats legacy JSON null as absent trust context rather than an account lookup", async () => {
        const f = await seed("bws");
        // A JS null is encoded as SQL NULL by Drizzle; exercise the distinct
        // historical JSON null representation explicitly at this fixture boundary.
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: sql`'null'::jsonb`,
            computedAt: new Date(),
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db.transaction((tx) =>
                retireComparisonAccountInputs({ db: tx, userId: f.userId }),
            ),
        ).resolves.toMatchObject({ status: "progress", responses: 1 });
    });

    it("prevents rewriting a retained input or detaching its published binding", async () => {
        const f = await seed("bws");
        await expect(
            db
                .update(schema.rankingInputSnapshotTable)
                .set({ statsSnapshotId: null })
                .where(eq(schema.rankingInputSnapshotTable.id, f.input.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db.insert(schema.rankingInputAnswerTable).values({
                inputSnapshotId: f.input.id,
                participantIndex: 0,
                position: 99,
                bestSlugId: first(f.slugs),
                worstSlugId: first(f.slugs.slice(-1)),
                candidateSet: f.slugs,
                effectiveCandidateSet: f.slugs,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db
                .insert(schema.rankingInputParticipantTable)
                .values({ inputSnapshotId: f.input.id, participantIndex: 42 }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db.insert(schema.rankingInputItemTable).values({
                inputSnapshotId: f.input.id,
                itemSlugId: "extra001",
                position: 42,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
        await expect(
            db
                .delete(schema.rankingInputAnswerTable)
                .where(
                    eq(
                        schema.rankingInputAnswerTable.inputSnapshotId,
                        f.input.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_retained" },
        });
        await expect(
            db
                .update(schema.rankingInputAnswerTable)
                .set({ position: 42 })
                .where(
                    eq(
                        schema.rankingInputAnswerTable.inputSnapshotId,
                        f.input.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_immutable" },
        });
    });

    it("blocks account-wide unlink for legacy context without any surviving response", async () => {
        const f = await seed("pairwise");
        const userId = randomUUID();
        await db.insert(schema.userTable).values({
            id: userId,
            username: "legacy-only",
            isDeleted: true,
            purgeStartedAt: new Date(),
        });
        await db
            .insert(schema.conversationParticipantTable)
            .values({ userId, conversationId: f.conversation.id });
        await db.insert(schema.rankingScoreTable).values({
            conversationId: f.conversation.id,
            scores: [],
            participantCounts: {},
            pipelineConfig: {},
            userWeightsSnapshot: { [userId]: 1 },
            computedAt: new Date(),
        });
        for (const operation of [
            retireComparisonAccountInputs,
            unlinkAccountRetainedContributions,
        ]) {
            await expect(
                db.transaction(
                    async (tx) => await operation({ db: tx, userId }),
                ),
            ).resolves.toMatchObject({
                status: "blocked",
                reason: "legacy_comparison_account_context",
            });
        }
        await expect(
            db
                .update(schema.conversationParticipantTable)
                .set({ userId: null })
                .where(eq(schema.conversationParticipantTable.userId, userId)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "legacy_comparison_account_context" },
        });
        const authorId = randomUUID();
        await db
            .insert(schema.userTable)
            .values({
                id: authorId,
                username: "legacy-author",
                isDeleted: true,
                purgeStartedAt: new Date(),
            });
        const item = first(
            await db
                .insert(schema.rankingItemTable)
                .values({
                    slugId: "legacy01",
                    conversationId: f.conversation.id,
                    authorId,
                })
                .returning(),
        );
        await expect(
            db.transaction(
                async (tx) =>
                    await unlinkAccountRetainedContributions({
                        db: tx,
                        userId: authorId,
                    }),
            ),
        ).resolves.toMatchObject({
            status: "blocked",
            reason: "legacy_comparison_account_context",
        });
        expect(
            first(
                await db
                    .select({ authorId: schema.rankingItemTable.authorId })
                    .from(schema.rankingItemTable)
                    .where(eq(schema.rankingItemTable.id, item.id)),
            ).authorId,
        ).toBe(authorId);
    });

    it("requires a complete sealed capture before committing", async () => {
        const f = await seed("bws");
        const root = {
            conversationId: f.conversation.id,
            comparisonMethod: "bws",
            scoringInputRevision: 0,
            algorithmVersion: 1,
            solidagoVersion: "0.5.0",
            pipelineConfig: {},
            participantCount: 1,
            itemCount: 1,
            answerCount: 1,
        } satisfies typeof schema.rankingInputSnapshotTable.$inferInsert;
        await expect(
            db.transaction(async (tx) => {
                await tx.insert(schema.rankingInputSnapshotTable).values(root);
            }),
        ).rejects.toMatchObject({
            constraint_name: "ranking_input_seal_required",
        });
        await expect(
            db.transaction(async (tx) => {
                const input = first(
                    await tx
                        .insert(schema.rankingInputSnapshotTable)
                        .values(root)
                        .returning(),
                );
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({ sealedAt: new Date() })
                    .where(eq(schema.rankingInputSnapshotTable.id, input.id));
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_incomplete" },
        });
        await expect(
            db.transaction(async (tx) => {
                const input = first(
                    await tx
                        .insert(schema.rankingInputSnapshotTable)
                        .values({
                            ...root,
                            participantCount: 0,
                            itemCount: 0,
                            answerCount: 0,
                        })
                        .returning(),
                );
                await tx
                    .update(schema.rankingInputSnapshotTable)
                    .set({
                        sealedAt: new Date(),
                        statsSnapshotId: f.snapshot.id,
                    })
                    .where(eq(schema.rankingInputSnapshotTable.id, input.id));
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_publication_mismatch" },
        });
    });

    it("rejects direct unlinking before source retirement and cross-conversation evidence references", async () => {
        const f = await seed("pairwise");
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            db
                .update(schema.comparisonResponseTable)
                .set({
                    participantId: null,
                    detachedAt: new Date(),
                    comparisons: [],
                    ranking: null,
                    isComplete: false,
                })
                .where(eq(schema.comparisonResponseTable.id, f.response.id)),
        ).rejects.toThrow();
        const otherProject = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "other",
                    title: "Other",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const otherConfig = first(
            await db
                .insert(schema.rankingConversationConfigTable)
                .values({ rankingMode: "pairwise" })
                .returning(),
        );
        const other = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "other001",
                    projectId: otherProject.id,
                    rankingConfigId: otherConfig.id,
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                })
                .returning(),
        );
        await expect(
            db
                .update(schema.rankingInputSnapshotTable)
                .set({ conversationId: other.id })
                .where(
                    eq(
                        schema.rankingInputSnapshotTable.statsSnapshotId,
                        f.snapshot.id,
                    ),
                ),
        ).rejects.toThrow();
        await expect(
            db.insert(schema.rankingInputSnapshotTable).values({
                ...f.input,
                id: randomUUID(),
                conversationId: other.id,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "ranking_input_build_before_seal" },
        });
        expect(
            await db
                .select()
                .from(schema.rankingInputAnswerTable)
                .where(
                    and(
                        eq(
                            schema.rankingInputAnswerTable.inputSnapshotId,
                            f.input.id,
                        ),
                        eq(schema.rankingInputAnswerTable.participantIndex, 0),
                    ),
                ),
        ).toHaveLength(1);
    });
});
