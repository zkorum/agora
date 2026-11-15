import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, getTableName, is, isNull } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import { unlinkAccountRetainedContributions } from "../src/shared-backend/deletionIdentity.js";
import { getAccountLifecycle } from "../src/shared-backend/accountLifecycle.js";
import { retirePurgingAccountDeviceKeys } from "../src/shared-backend/deviceRetirement.js";
import { unlinkAccountSharedProvenance } from "../src/shared-backend/deletionProvenance.js";
import {
    createConversationEmailUpdateActionService,
    hashConversationEmailUpdateActionToken,
} from "../src/service/conversationEmailUpdateAction.js";
import { commentsGenerator } from "../src/service/conversationExport/generators/comments.js";
import { createExportParticipantMap } from "../src/service/conversationExport/generators/participantMap.js";
import { fetchAnalysisFrameOpinionListByFrameKey } from "../src/service/comment.js";
import {
    queueSourceInvalidationEvent,
    fetchRealtimeTopicEventsAfterId,
} from "../src/service/realtimeEventOutbox.js";
import {
    initializeRealtimeDispatch,
    fetchDeliveredEventUpperBound,
} from "../src/service/realtimeEventDispatch.js";
import { getComparisonResults } from "../src/service/comparison.js";
import { fetchRankingItems } from "../src/service/rankingItem.js";

const MATRIX =
    "KLUv/SDVhQMAogUTF5CnHQuBKA1MxYna2Iarao8jwiCt/1gCS7COuLEOrUA7bGlWATS074lkYQmKbAC+07DynzTfBtdm42d7ByQ/i41DK0za+ROdTe1qKg0AgBCsKq1qRU4YgORI0OeVwBUCykm+5mmjjG42ABXmEw==";
function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing deletion contract fixture");
    return row;
}

describe("purge-safe identity and source contracts", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            user: "postgres",
            password: "postgres",
        };
        client = postgres(connection);
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            const exported = await pushSchema(schema, drizzlePg({ client: pool }));
            await exported.apply();
        } finally {
            await pool.end();
        }
        await client.unsafe(
            readFileSync(
                new URL(
                    "../scripts/prepare-participant-unlink-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        await client.unsafe(
            readFileSync(
                new URL(
                    "../scripts/prepare-device-retirement-contract.sql",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        await client.unsafe(`
            CREATE TRIGGER vote_bind_conversation_participant BEFORE INSERT OR UPDATE OF author_id, opinion_id, participant_id ON vote FOR EACH ROW EXECUTE FUNCTION bind_conversation_participant();
            CREATE TRIGGER opinion_group_user_bind_conversation_participant BEFORE INSERT OR UPDATE OF user_id, candidate_id, participant_id ON opinion_group_user FOR EACH ROW EXECUTE FUNCTION bind_conversation_participant();
        `);
        await client.unsafe(
            readFileSync(
                new URL(
                    "../scripts/prepare-ranking-account-source-contract.sql",
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
        await client.unsafe(
            `TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function seed() {
        const users = await db
            .insert(schema.userTable)
            .values([
                { id: randomUUID(), username: "first" },
                { id: randomUUID(), username: "second" },
            ])
            .returning();
        const owner = first(users);
        const other = first(users.filter((row) => row.id !== owner.id));
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "purge-contract",
                    title: "Project",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const config = first(
            await db
                .insert(schema.polisConversationConfigTable)
                .values({})
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "purge001",
                    projectId: project.id,
                    polisConfigId: config.id,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Conversation",
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
                    slugId: "source01",
                    authorId: owner.id,
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
                    content: "Private original",
                    isEdited: true,
                    editedByUserId: owner.id,
                })
                .returning(),
        );
        await db
            .update(schema.opinionTable)
            .set({ currentContentId: source.id })
            .where(eq(schema.opinionTable.id, opinion.id));
        const analysisSpec = first(
            await db
                .insert(schema.analysisSpecTable)
                .values({ analysisFamily: "opinion_groups" })
                .returning(),
        );
        const spec = first(
            await db
                .insert(schema.opinionGroupSpecTable)
                .values({
                    analysisSpecId: analysisSpec.id,
                    key: "test",
                    version: 1,
                    reducer: "pca",
                    clusterer: "kmeans",
                    selectionPolicy: "silhouette_size_balance",
                    minClusterableParticipants: 2,
                    minVotesPerParticipant: 1,
                    maxGroupCount: 2,
                })
                .returning(),
        );
        const variant = first(
            await db
                .insert(schema.opinionGroupVariantTable)
                .values({ opinionGroupSpecId: spec.id, groupCount: 2 })
                .returning(),
        );
        const input = first(
            await db
                .insert(schema.analysisInputSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    dataGeneration: 1,
                    inputHash: "a".repeat(64),
                    opinionCount: 1,
                    participantCount: 2,
                    voteCount: 2,
                    compression: "zstd",
                    payload: MATRIX,
                })
                .returning(),
        );
        const snapshot = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    conversationContentId: content.id,
                    inputSnapshotId: input.id,
                    dataGeneration: 1,
                    computedAt: new Date(),
                })
                .returning(),
        );
        const result = first(
            await db
                .insert(schema.analysisSnapshotResultTable)
                .values({
                    conversationId: conversation.id,
                    analysisSnapshotId: snapshot.id,
                    opinionGroupSpecId: spec.id,
                    outcome: "success",
                })
                .returning(),
        );
        const scope = first(
            await db
                .insert(schema.opinionGroupLineageScopeTable)
                .values({
                    conversationId: conversation.id,
                    opinionGroupVariantId: variant.id,
                })
                .returning(),
        );
        const candidate = first(
            await db
                .insert(schema.opinionGroupCandidateTable)
                .values({
                    snapshotResultId: result.id,
                    opinionGroupVariantId: variant.id,
                    scopeId: scope.id,
                    outcome: "success",
                })
                .returning(),
        );
        await db
            .insert(schema.opinionGroupCandidateAssessmentTable)
            .values({ candidateId: candidate.id, selectionScore: 0.9 });
        const group = first(
            await db
                .insert(schema.opinionGroupTable)
                .values({
                    candidateId: candidate.id,
                    scopeId: scope.id,
                    key: "0",
                    externalId: 0,
                    numUsers: 2,
                })
                .returning(),
        );
        await db.insert(schema.opinionGroupUserTable).values(
            users.map((user) => ({
                candidateId: candidate.id,
                groupId: group.id,
                userId: user.id,
            })),
        );
        const frozenOpinion = first(
            await db
                .insert(schema.analysisSnapshotOpinionTable)
                .values({
                    analysisSnapshotId: snapshot.id,
                    opinionId: opinion.id,
                    opinionContentId: source.id,
                    localOpinionIndex: 0,
                    numAgrees: 1,
                    numDisagrees: 1,
                })
                .returning(),
        );
        await db
            .insert(schema.opinionGroupCandidateOpinionMetricsTable)
            .values({
                candidateId: candidate.id,
                analysisSnapshotOpinionId: frozenOpinion.id,
                agreementRank: 1,
                groupAwareConsensusAgree: 0.8,
            });
        await db.insert(schema.opinionGroupOpinionStatsTable).values({
            groupId: group.id,
            analysisSnapshotOpinionId: frozenOpinion.id,
            numAgrees: 1,
            numDisagrees: 1,
        });
        const view = first(
            await db
                .insert(schema.conversationViewSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    conversationContentId: content.id,
                    analysisSnapshotId: snapshot.id,
                    opinionGroupSpecId: spec.id,
                    viewReason: "analysis_completed",
                    isClosed: false,
                    opinionCount: 1,
                    voteCount: 2,
                    participantCount: 2,
                    totalOpinionCount: 1,
                    totalVoteCount: 2,
                    totalParticipantCount: 2,
                    moderatedOpinionCount: 0,
                    hiddenOpinionCount: 0,
                    activatedAt: new Date(),
                })
                .returning(),
        );
        await db
            .insert(schema.conversationViewSnapshotCheckpointReasonTable)
            .values({
                conversationId: conversation.id,
                conversationViewSnapshotId: view.id,
                opinionGroupSpecId: spec.id,
                reason: "conversation_closed",
            });
        return {
            owner,
            other,
            project,
            conversation,
            content,
            opinion,
            source,
            candidate,
            group,
            input,
            snapshot,
            view,
            spec,
        };
    }

    it("cannot give a legacy deletion an implicit recovery window", async () => {
        const fixture = await seed();
        const deleted = first(
            await db
                .update(schema.userTable)
                .set({
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletionReason: "account_deletion",
                })
                .where(eq(schema.userTable.id, fixture.owner.id))
                .returning(),
        );
        expect(getAccountLifecycle(deleted).state).toBe(
            "irreversible_deletion",
        );
        await expect(
            db
                .update(schema.userTable)
                .set({ recoverableUntil: new Date() })
                .where(eq(schema.userTable.id, deleted.id)),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
    });

    it("redacts ranking checkpoints without changing numbers and permits private content erasure", async () => {
        const { owner, project, spec } = await seed();
        const config = first(
            await db
                .insert(schema.rankingConversationConfigTable)
                .values({ rankingMode: "bws" })
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: "rnkpurge",
                    projectId: project.id,
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                    rankingConfigId: config.id,
                })
                .returning(),
        );
        const conversationContent = first(
            await db
                .insert(schema.conversationContentTable)
                .values({ conversationId: conversation.id, title: "Ranking" })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: conversationContent.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const item = first(
            await db
                .insert(schema.rankingItemTable)
                .values({
                    slugId: "rankitem",
                    conversationId: conversation.id,
                    authorId: owner.id,
                    isSeed: false,
                    position: 0,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.rankingItemContentTable)
                .values({
                    rankingItemId: item.id,
                    conversationContentId: conversationContent.id,
                    title: "Private ranking statement",
                    body: "Private body",
                    bodyPlainText: "Private body",
                })
                .returning(),
        );
        await db
            .update(schema.rankingItemTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.rankingItemTable.id, item.id));
        const snapshot = first(
            await db
                .insert(schema.rankingConversationStatsSnapshotTable)
                .values({
                    conversationId: conversation.id,
                    itemCount: 1,
                    totalItemCount: 1,
                    voteCount: 7,
                    totalVoteCount: 7,
                    participantCount: 3,
                    totalParticipantCount: 3,
                    scoringInputRevision: 0,
                    isClosed: true,
                })
                .returning(),
        );
        const result = first(
            await db
                .insert(schema.rankingConversationStatsItemTable)
                .values({
                    statsSnapshotId: snapshot.id,
                    conversationId: conversation.id,
                    rankingItemId: item.id,
                    rankingItemContentId: content.id,
                    lifecycleStatus: "active",
                    score: 0.75,
                    rank: 1,
                    participantCount: 3,
                    externalUrl: "https://example.com/private",
                })
                .returning(),
        );
        const request = {
            db,
            conversationSlugId: conversation.slugId,
            displayPreferences: {
                displayLanguage: "en",
                targetLanguage: "en",
                spokenLanguages: [],
                translationAllowed: false,
            },
            rankingStatsSnapshotId: snapshot.id,
        } satisfies Parameters<typeof getComparisonResults>[0];
        await db.insert(schema.conversationViewSnapshotTable).values({
            conversationId: conversation.id,
            conversationContentId: conversationContent.id,
            opinionGroupSpecId: spec.id,
            viewReason: "conversation_content_updated",
            isClosed: false,
            opinionCount: 1,
            totalOpinionCount: 1,
            voteCount: 0,
            totalVoteCount: 0,
            participantCount: 0,
            totalParticipantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            activatedAt: new Date(),
        });
        expect(
            first((await getComparisonResults(request)).rankings).isDeleted,
        ).toBe(false);
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true, closingTargetRevision: 0 })
            .where(eq(schema.conversationTable.id, conversation.id));
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where(eq(schema.userTable.id, owner.id));
        const redacted = first((await getComparisonResults(request)).rankings);
        expect(
            first(
                await db.select().from(schema.rankingConversationConfigTable),
            ),
        ).toMatchObject({
            scoringInputRevision: config.scoringInputRevision + 1,
            scoringInvalidationRevision: config.scoringInputRevision + 1,
        });
        expect(
            first(
                await db
                    .select()
                    .from(schema.conversationTable)
                    .where(eq(schema.conversationTable.id, conversation.id)),
            ).closingTargetRevision,
        ).toBe(1);
        expect(redacted).toEqual({
            isDeleted: true,
            itemSlugId: item.slugId,
            displayContent: null,
            externalUrl: null,
            avgRank: 1,
            score: 0.75,
            participantCount: 3,
            lifecycleStatus: "active",
        });
        expect((await fetchRankingItems(request)).items).toEqual([]);
        await expect(
            db
                .update(schema.rankingConversationStatsItemTable)
                .set({ rankingItemContentId: null })
                .where(
                    eq(schema.rankingConversationStatsItemTable.id, result.id),
                ),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        await db
            .update(schema.rankingConversationStatsItemTable)
            .set({ rankingItemContentId: null, externalUrl: null })
            .where(eq(schema.rankingConversationStatsItemTable.id, result.id));
        await db
            .update(schema.rankingItemTable)
            .set({
                currentContentId: null,
                accountHiddenAt: new Date(),
                authorId: null,
            })
            .where(eq(schema.rankingItemTable.id, item.id));
        await db
            .delete(schema.rankingItemContentTable)
            .where(eq(schema.rankingItemContentTable.id, content.id));
        expect(first((await getComparisonResults(request)).rankings)).toEqual(
            redacted,
        );
        expect(
            first(
                await db
                    .select()
                    .from(schema.rankingConversationStatsSnapshotTable),
            ),
        ).toEqual(snapshot);
        expect(
            first(
                await db
                    .select()
                    .from(schema.rankingConversationStatsItemTable),
            ),
        ).toMatchObject({
            score: result.score,
            rank: result.rank,
            participantCount: result.participantCount,
        });
        const retainedSeed = first(
            await db
                .insert(schema.rankingItemTable)
                .values({
                    slugId: "rankseed",
                    conversationId: conversation.id,
                    authorId: null,
                    isSeed: true,
                    position: 1,
                })
                .returning(),
        );
        const seedContent = first(
            await db
                .insert(schema.rankingItemContentTable)
                .values({
                    rankingItemId: retainedSeed.id,
                    conversationContentId: conversationContent.id,
                    title: "Project-owned seed",
                })
                .returning(),
        );
        await db
            .update(schema.rankingItemTable)
            .set({ currentContentId: seedContent.id })
            .where(eq(schema.rankingItemTable.id, retainedSeed.id));
        expect((await fetchRankingItems(request)).items).toHaveLength(1);
    });

    it("does not unlink an active account or skip private vote dependencies", async () => {
        const fixture = await seed();
        expect(
            await db.transaction(
                async (tx) =>
                    await unlinkAccountRetainedContributions({
                        db: tx,
                        userId: fixture.owner.id,
                    }),
            ),
        ).toEqual({ status: "blocked", reason: "account_not_purging" });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, fixture.owner.id));
        await db.insert(schema.voteTable).values({
            authorId: fixture.owner.id,
            opinionId: fixture.opinion.id,
        });
        expect(
            await db.transaction(
                async (tx) =>
                    await unlinkAccountRetainedContributions({
                        db: tx,
                        userId: fixture.owner.id,
                    }),
            ),
        ).toEqual({
            status: "blocked",
            reason: "private_participation_remaining",
        });
        expect(
            first(await db.select().from(schema.opinionTable)).authorId,
        ).toBe(fixture.owner.id);
    });

    it("retains distinct numerical participants, matrices, metrics and checkpoints after account removal", async () => {
        const fixture = await seed();
        const before = await db
            .select()
            .from(schema.opinionGroupUserTable)
            .orderBy(schema.opinionGroupUserTable.id);
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, fixture.owner.id));
        expect(
            await db.transaction(
                async (tx) =>
                    await unlinkAccountRetainedContributions({
                        db: tx,
                        userId: fixture.owner.id,
                    }),
            ),
        ).toMatchObject({
            status: "progress",
            participants: 1,
            memberships: 1,
        });
        await db
            .update(schema.opinionTable)
            .set({ currentContentId: null })
            .where(eq(schema.opinionTable.id, fixture.opinion.id));
        await db
            .delete(schema.opinionContentTable)
            .where(eq(schema.opinionContentTable.id, fixture.source.id));
        await db
            .delete(schema.userTable)
            .where(eq(schema.userTable.id, fixture.owner.id));
        const after = await db
            .select()
            .from(schema.opinionGroupUserTable)
            .orderBy(schema.opinionGroupUserTable.id);
        expect(after.map((row) => row.participantId)).toEqual(
            before.map((row) => row.participantId),
        );
        expect(new Set(after.map((row) => row.participantId)).size).toBe(2);
        expect(after.filter((row) => row.userId === null)).toHaveLength(1);
        expect(
            first(await db.select().from(schema.analysisInputSnapshotTable)),
        ).toEqual(fixture.input);
        expect(
            first(await db.select().from(schema.analysisSnapshotTable)),
        ).toEqual(fixture.snapshot);
        expect(
            first(await db.select().from(schema.conversationViewSnapshotTable)),
        ).toEqual(fixture.view);
        const list = await fetchAnalysisFrameOpinionListByFrameKey({
            db,
            conversationSlugId: fixture.conversation.slugId,
            frameKey: {
                mode: "checkpoint",
                conversationViewSnapshotId: fixture.view.id,
                analysisSnapshotId: fixture.snapshot.id,
                candidateId: fixture.candidate.id,
            },
            kind: "agreements",
            freshnessOptions: null,
            resolveDisplayContentPreferences: async () => ({
                displayLanguage: "en",
                targetLanguage: "en",
                spokenLanguages: ["en"],
                translationAllowed: false,
            }),
        });
        expect(list.items).toHaveLength(1);
        expect(list.items[0].content).toEqual({
            status: "redacted",
            reason: "statement_deleted",
        });
        expect(JSON.stringify(list)).not.toContain("Private original");
        expect(list.items[0].numAgrees).toBe(1);
        expect(list.items[0].numDisagrees).toBe(1);
    });

    it("keeps project-owned seed text usable without its administering author", async () => {
        const fixture = await seed();
        await db
            .update(schema.opinionTable)
            .set({ isSeed: true })
            .where(eq(schema.opinionTable.id, fixture.opinion.id));
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, fixture.owner.id));
        await db.transaction(
            async (tx) =>
                await unlinkAccountRetainedContributions({
                    db: tx,
                    userId: fixture.owner.id,
                }),
        );
        await db
            .delete(schema.userTable)
            .where(eq(schema.userTable.id, fixture.owner.id));
        const result = await commentsGenerator.generate({
            db,
            conversationId: fixture.conversation.id,
            conversationSlugId: fixture.conversation.slugId,
            participantMap: createExportParticipantMap(),
            exportAccessLevel: "public",
        });
        expect(result.recordCount).toBe(1);
        expect(result.csvBuffer.toString()).toContain("Private original");
        expect(result.csvBuffer.toString()).not.toContain(fixture.owner.id);
        expect(
            first(await db.select().from(schema.opinionContentTable)).isEdited,
        ).toBe(true);
    });

    it("rejects cross-account participant pointers and reattachment after detachment", async () => {
        const fixture = await seed();
        const other = first(
            await db
                .select()
                .from(schema.conversationParticipantTable)
                .where(
                    eq(
                        schema.conversationParticipantTable.userId,
                        fixture.other.id,
                    ),
                ),
        );
        await expect(
            db.insert(schema.voteTable).values({
                authorId: fixture.owner.id,
                opinionId: fixture.opinion.id,
                participantId: other.id,
            }),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, fixture.owner.id));
        await db.transaction(
            async (tx) =>
                await unlinkAccountRetainedContributions({
                    db: tx,
                    userId: fixture.owner.id,
                }),
        );
        const ownerMembership = first(
            await db
                .select()
                .from(schema.opinionGroupUserTable)
                .where(isNull(schema.opinionGroupUserTable.userId)),
        );
        if (ownerMembership.participantId === null)
            throw new Error("Missing original participant");
        await expect(
            db
                .update(schema.conversationParticipantTable)
                .set({ userId: fixture.other.id })
                .where(
                    eq(
                        schema.conversationParticipantTable.id,
                        ownerMembership.participantId,
                    ),
                ),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        await expect(
            db
                .update(schema.opinionGroupUserTable)
                .set({ userId: fixture.other.id })
                .where(eq(schema.opinionGroupUserTable.id, ownerMembership.id)),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
    });

    it("preserves retired signing keys without retaining an account association", async () => {
        const fixture = await seed();
        await db.insert(schema.deviceTable).values({
            didWrite: "did:key:retired-contract",
            userId: fixture.owner.id,
            userAgent: "test",
            sessionExpiry: new Date(0),
        });
        expect(
            await db.transaction(
                async (tx) =>
                    await retirePurgingAccountDeviceKeys({
                        db: tx,
                        userId: fixture.owner.id,
                    }),
            ),
        ).toBe(0);
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, fixture.owner.id));
        expect(
            await db.transaction(
                async (tx) =>
                    await retirePurgingAccountDeviceKeys({
                        db: tx,
                        userId: fixture.owner.id,
                    }),
            ),
        ).toBe(1);
        await db
            .delete(schema.deviceTable)
            .where(eq(schema.deviceTable.userId, fixture.owner.id));
        await expect(
            db.insert(schema.deviceTable).values({
                didWrite: "did:key:retired-contract",
                userId: fixture.other.id,
                userAgent: "test",
                sessionExpiry: new Date(),
            }),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        expect(
            first(await db.select().from(schema.retiredDeviceKeyTable)),
        ).toEqual({
            didWrite: "did:key:retired-contract",
            retiredAt: expect.any(Date),
        });
    });

    it("keeps another recipient's action link valid after sender credentials/account removal", async () => {
        const fixture = await seed();
        const now = new Date(Math.floor(Date.now() / 1000) * 1000);
        const senderEmail = first(
            await db
                .insert(schema.emailTable)
                .values({
                    userId: fixture.owner.id,
                    email: "sender@example.org",
                    type: "primary",
                })
                .returning(),
        );
        const recipientEmail = first(
            await db
                .insert(schema.emailTable)
                .values({
                    userId: fixture.other.id,
                    email: "recipient@example.org",
                    type: "primary",
                })
                .returning(),
        );
        const organization = first(
            await db
                .insert(schema.organizationTable)
                .values({
                    slug: "org",
                    displayName: "Organization",
                    defaultLanguageCode: "en",
                    directoryVisibility: "listed",
                    isFullImagePath: false,
                })
                .returning(),
        );
        const entitlement = first(
            await db
                .insert(schema.premiumFeatureEntitlementTable)
                .values({
                    organizationId: organization.id,
                    feature: "conversation_email_update",
                    startsAt: now,
                })
                .returning(),
        );
        const update = first(
            await db
                .insert(schema.conversationEmailUpdateTable)
                .values({
                    projectId: fixture.project.id,
                    scopeKind: "listed_project",
                    createdByUserId: fixture.owner.id,
                    authorizingOrganizationId: organization.id,
                    authorizingPremiumFeatureId: entitlement.id,
                    projectTitleSnapshot: "Project",
                    replyToNameSnapshot: "Project",
                    replyToEmailSnapshot: "project@example.org",
                    subject: "Update",
                    bodyHtml: "<p>Update</p>",
                    bodyPlainText: "Update",
                    createdAt: now,
                    reviewExpiresAt: new Date(now.getTime() + 86_400_000),
                    templateVersion: "1",
                    participantPreferenceScopeSnapshot: "project",
                    brandingSnapshot: { name: "Agora", palette: "blue" },
                    reviewTestEmailCredentialId: senderEmail.id,
                    reviewTestEmailSnapshot: senderEmail.email,
                })
                .returning(),
        );
        const test = first(
            await db
                .insert(schema.conversationEmailUpdateTestAttemptTable)
                .values({
                    updateId: update.id,
                    requestedByUserId: fixture.owner.id,
                    destinationEmailCredentialId: senderEmail.id,
                    destinationEmailSnapshot: senderEmail.email,
                    status: "provider_accepted",
                    providerMessageId: "accepted-test",
                    authorizedAt: now,
                    finishedAt: now,
                })
                .returning(),
        );
        const delivery = first(
            await db
                .insert(schema.conversationEmailUpdateDeliveryTable)
                .values({
                    updateId: update.id,
                    projectId: fixture.project.id,
                    acceptedTestAttemptId: test.id,
                    acceptedByUserId: fixture.owner.id,
                    status: "completed",
                    participantPreferenceScope: "project",
                    audienceCutoffAt: now,
                    displayedParticipantEstimate: 1,
                    acceptanceParticipantEstimate: 1,
                    materializedParticipantCount: 1,
                    requiredOwnerCopyCount: 1,
                    acceptedAt: now,
                    materializedAt: now,
                    completedAt: now,
                })
                .returning(),
        );
        const recipient = first(
            await db
                .insert(schema.conversationEmailUpdateRecipientTable)
                .values({
                    deliveryId: delivery.id,
                    userId: fixture.other.id,
                    kind: "participant",
                    status: "provider_accepted",
                    materializedEmailCredentialId: recipientEmail.id,
                    materializedEmailSnapshot: recipientEmail.email,
                    displayLanguage: "en",
                    attemptCount: 1,
                    providerAcceptedAt: now,
                })
                .returning(),
        );
        const attempt = first(
            await db
                .insert(schema.conversationEmailUpdateDeliveryAttemptTable)
                .values({
                    recipientId: recipient.id,
                    attemptNumber: 1,
                    leaseToken: randomUUID(),
                    emailCredentialId: recipientEmail.id,
                    emailSnapshot: recipientEmail.email,
                    outcome: "provider_accepted",
                    providerMessageId: "accepted-recipient",
                    authorizedAt: now,
                    finishedAt: now,
                })
                .returning(),
        );
        const token = "0123456789abcdef0123456789abcdef01234567890";
        await db.insert(schema.conversationEmailUpdateActionTokenTable).values({
            tokenHash: hashConversationEmailUpdateActionToken(token),
            attemptPublicId: attempt.publicId,
            action: "unsubscribe_project",
            expiresAt: new Date(now.getTime() + 86_400_000),
        });
        const actions = createConversationEmailUpdateActionService({ db });
        const before = await actions.resolve({ token });
        expect(before.success).toBe(true);
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: now })
            .where(eq(schema.userTable.id, fixture.owner.id));
        expect(
            await db.transaction(
                async (tx) =>
                    await unlinkAccountSharedProvenance({
                        db: tx,
                        userId: fixture.owner.id,
                    }),
            ),
        ).toMatchObject({ status: "progress", updated: 3 });
        await db.transaction(
            async (tx) =>
                await unlinkAccountRetainedContributions({
                    db: tx,
                    userId: fixture.owner.id,
                }),
        );
        await db
            .delete(schema.emailTable)
            .where(eq(schema.emailTable.id, senderEmail.id));
        await db
            .delete(schema.userTable)
            .where(eq(schema.userTable.id, fixture.owner.id));
        expect(await actions.resolve({ token })).toEqual(before);
        expect(
            first(
                await db
                    .select()
                    .from(schema.conversationEmailUpdateTestAttemptTable),
            ),
        ).toMatchObject({
            requestedByUserId: null,
            destinationEmailCredentialId: null,
            destinationEmailSnapshot: null,
            senderPurgedAt: now,
        });
        expect(await actions.unsubscribe({ token })).toEqual({ success: true });
        expect(
            first(
                await db
                    .select()
                    .from(
                        schema.conversationEmailUpdateUserProjectPreferenceTable,
                    ),
            ),
        ).toMatchObject({
            userId: fixture.other.id,
            projectId: fixture.project.id,
            enabled: false,
        });
    });

    it("does not detach a participant until every bounded historical membership batch is unlinked", async () => {
        const fixture = await seed();
        const old = first(
            await db
                .select()
                .from(schema.opinionGroupUserTable)
                .where(
                    eq(schema.opinionGroupUserTable.userId, fixture.owner.id),
                ),
        );
        if (old.participantId === null)
            throw new Error("Missing original participant");
        const input = first(
            await db
                .insert(schema.analysisInputSnapshotTable)
                .values({
                    conversationId: fixture.conversation.id,
                    dataGeneration: 2,
                    inputHash: "b".repeat(64),
                    opinionCount: 1,
                    participantCount: 2,
                    voteCount: 2,
                    compression: "zstd",
                    payload: MATRIX,
                })
                .returning(),
        );
        const snapshot = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId: fixture.conversation.id,
                    inputSnapshotId: input.id,
                    dataGeneration: 2,
                    computedAt: new Date(),
                })
                .returning(),
        );
        const result = first(
            await db
                .insert(schema.analysisSnapshotResultTable)
                .values({
                    conversationId: fixture.conversation.id,
                    analysisSnapshotId: snapshot.id,
                    opinionGroupSpecId: fixture.spec.id,
                    outcome: "success",
                })
                .returning(),
        );
        const candidate = first(
            await db
                .insert(schema.opinionGroupCandidateTable)
                .values({
                    snapshotResultId: result.id,
                    opinionGroupVariantId:
                        fixture.candidate.opinionGroupVariantId,
                    scopeId: fixture.group.scopeId,
                    outcome: "success",
                })
                .returning(),
        );
        const group = first(
            await db
                .insert(schema.opinionGroupTable)
                .values({
                    candidateId: candidate.id,
                    scopeId: fixture.group.scopeId,
                    key: "0",
                    externalId: 0,
                    numUsers: 1,
                })
                .returning(),
        );
        await db.insert(schema.opinionGroupUserTable).values({
            candidateId: candidate.id,
            groupId: group.id,
            userId: fixture.owner.id,
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, fixture.owner.id));
        const batch = async () =>
            await db.transaction(
                async (tx) =>
                    await unlinkAccountRetainedContributions({
                        db: tx,
                        userId: fixture.owner.id,
                        limit: 1,
                    }),
            );
        expect(await batch()).toMatchObject({
            status: "progress",
            participants: 0,
            memberships: 1,
        });
        expect(
            first(
                await db
                    .select()
                    .from(schema.conversationParticipantTable)
                    .where(
                        eq(
                            schema.conversationParticipantTable.id,
                            old.participantId,
                        ),
                    ),
            ).userId,
        ).toBe(fixture.owner.id);
        expect(await batch()).toMatchObject({
            status: "progress",
            participants: 1,
            memberships: 1,
        });
        expect(await batch()).toEqual({
            status: "progress",
            participants: 0,
            memberships: 0,
            sources: 0,
        });
        expect(
            first(
                await db
                    .select()
                    .from(schema.analysisInputSnapshotTable)
                    .where(
                        eq(
                            schema.analysisInputSnapshotTable.id,
                            fixture.input.id,
                        ),
                    ),
            ),
        ).toEqual(fixture.input);
    });

    it("replays content-free descendant invalidation even without a topic subscription", async () => {
        await queueSourceInvalidationEvent(db);
        await initializeRealtimeDispatch(db);
        const upperBound = await fetchDeliveredEventUpperBound(db);
        expect(
            await fetchRealtimeTopicEventsAfterId({
                db,
                topics: [],
                lastEventId: 0,
                upperBound,
                limit: 100,
            }),
        ).toEqual([
            {
                id: 1,
                event: "resync_required",
                data: { cursor: "delivery:1", reason: "sources_changed" },
            },
        ]);
    });
});
