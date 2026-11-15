import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { OpinionPageCursor } from "../src/shared/types/dto.js";

import {
    analysisSnapshotTable,
    conversationContentTable,
    conversationTable,
    conversationViewSnapshotTable,
    opinionContentTable,
    opinionModerationTable,
    opinionTable,
    polisConversationConfigTable,
    userMutePreferenceTable,
    userTable,
    voteContentTable,
    voteTable,
} from "../src/shared-backend/schema.js";
import {
    countUnansweredOpinions,
    fetchOpinionTargetsBySlugIdList,
    fetchOpinionsByPostSlugId,
} from "../src/service/comment.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const readerId = "00000000-0000-4000-8000-000000000001";
const authorId = "00000000-0000-4000-8000-000000000002";
const otherAuthorId = "00000000-0000-4000-8000-000000000003";
const conversationSlugId = "page1234";

describe("opinion paging and unanswered progress", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let opinionIds: Record<string, number>;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        sqlClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
            max: 4,
        });
        db = drizzle({ client: sqlClient });
        await sqlClient.unsafe(readDbFixtureSql("opinion-paging.sql"));
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await sqlClient.unsafe(`
            TRUNCATE TABLE "analysis_snapshot", "vote_content", "vote", "user_mute_preference", "opinion_moderation",
                "opinion_content", "opinion", "conversation_view_snapshot",
                "conversation_content", "conversation", "polis_conversation_config", "user"
            RESTART IDENTITY;
        `);
        await db.insert(userTable).values([
            { id: readerId, username: "reader" },
            { id: authorId, username: "author" },
            { id: otherAuthorId, username: "other-author" },
        ]);
        const configs = await db
            .insert(polisConversationConfigTable)
            .values({})
            .returning({ id: polisConversationConfigTable.id });
        const config = configs.at(0);
        if (config === undefined) throw new Error("Missing Polis config");
        const conversations = await db
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: 1,
                polisConfigId: config.id,
            })
            .returning({ id: conversationTable.id });
        const conversation = conversations.at(0);
        if (conversation === undefined) throw new Error("Missing conversation");
        const contents = await db
            .insert(conversationContentTable)
            .values({
                conversationId: conversation.id,
                title: "Paging test",
            })
            .returning({ id: conversationContentTable.id });
        const conversationContent = contents.at(0);
        if (conversationContent === undefined)
            throw new Error("Missing conversation content");
        await db
            .update(conversationTable)
            .set({ currentContentId: conversationContent.id });

        opinionIds = {};
        for (const [index, slugId] of [
            "opinion1",
            "opinion2",
            "opinion3",
        ].entries()) {
            const rows = await db
                .insert(opinionTable)
                .values({
                    slugId,
                    authorId: index === 0 ? otherAuthorId : authorId,
                    conversationId: conversation.id,
                    createdAt: new Date(`2026-01-0${index + 1}T00:00:00Z`),
                })
                .returning({ id: opinionTable.id });
            const opinion = rows.at(0);
            if (opinion === undefined) throw new Error("Missing opinion");
            opinionIds[slugId] = opinion.id;
            const textRows = await db
                .insert(opinionContentTable)
                .values({
                    opinionId: opinion.id,
                    conversationContentId: conversationContent.id,
                    content: `Statement ${index + 1}`,
                    sourceLanguageCode: "en",
                })
                .returning({ id: opinionContentTable.id });
            const text = textRows.at(0);
            if (text === undefined) throw new Error("Missing opinion content");
            await db
                .update(opinionTable)
                .set({ currentContentId: text.id })
                .where(eq(opinionTable.id, opinion.id));
        }
        await db.insert(conversationViewSnapshotTable).values({
            conversationId: conversation.id,
            opinionGroupSpecId: 1,
            viewReason: "conversation_lifecycle_updated",
            isClosed: false,
            opinionCount: 3,
            voteCount: 0,
            participantCount: 0,
            totalOpinionCount: 3,
            totalVoteCount: 0,
            totalParticipantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            activatedAt: new Date(),
        });
    });

    it("paginates by creation time without losing items after the first page", async () => {
        const first = await fetchPage({ db, cursor: null, limit: 2 });
        expect([...first.items.keys()]).toEqual(["opinion3", "opinion2"]);
        const cursor = first.cursorsByOpinionSlugId.get("opinion2");
        if (cursor === undefined) throw new Error("Missing page cursor");
        const second = await fetchPage({ db, cursor, limit: 2 });
        expect([...second.items.keys()]).toEqual(["opinion1"]);
    });

    it("paginates only the viewer's statements without requiring a vote", async () => {
        const first = await fetchPage({
            db,
            cursor: null,
            limit: 1,
            filter: "my_statements",
            viewerId: authorId,
        });
        expect([...first.items.keys()]).toEqual(["opinion3"]);
        const cursor = first.cursorsByOpinionSlugId.get("opinion3");
        if (cursor === undefined) throw new Error("Missing page cursor");
        const second = await fetchPage({
            db,
            cursor,
            limit: 2,
            filter: "my_statements",
            viewerId: authorId,
        });
        expect([...second.items.keys()]).toEqual(["opinion2"]);
        const otherViewer = await fetchPage({
            db,
            cursor: null,
            limit: 3,
            filter: "my_statements",
        });
        expect([...otherViewer.items.keys()]).toEqual([]);
    });

    it("keeps moved statements visible in My statements but excludes hidden and deleted statements", async () => {
        await db.insert(opinionModerationTable).values([
            {
                opinionId: opinionIds.opinion2,
                moderationAction: "move",
                moderationReason: "spam",
            },
            {
                opinionId: opinionIds.opinion3,
                moderationAction: "hide",
                moderationReason: "spam",
            },
        ]);
        const page = await fetchPage({
            db,
            cursor: null,
            limit: 3,
            filter: "my_statements",
            viewerId: authorId,
        });
        expect([...page.items.keys()]).toEqual(["opinion2"]);
        await db
            .update(opinionTable)
            .set({ currentContentId: null })
            .where(eq(opinionTable.id, opinionIds.opinion2));
        const afterDeletion = await fetchPage({
            db,
            cursor: null,
            limit: 3,
            filter: "my_statements",
            viewerId: authorId,
        });
        expect([...afterDeletion.items.keys()]).toEqual([]);
    });

    it("requires authentication for My statements", async () => {
        await expect(
            fetchOpinionsByPostSlugId({
                db,
                postSlugId: conversationSlugId,
                filterTarget: "my_statements",
                limit: 3,
                excludedOpinionSlugIds: [],
                cursor: null,
                displayContentPreferences: {
                    displayLanguage: "en",
                    targetLanguage: "en",
                    spokenLanguages: ["en"],
                    translationAllowed: false,
                    viewerUserId: undefined,
                },
            }),
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("returns server-owned authorship and conversation facts without exposing author IDs", async () => {
        const targets = await fetchOpinionTargetsBySlugIdList({
            db,
            opinionSlugIdList: ["opinion1", "opinion2"],
            displayContentViewerPreferences: {
                viewerUserId: authorId,
                displayLanguage: "en",
                spokenLanguages: ["en"],
            },
        });
        expect(
            targets.map((target) => ({
                slugId: target.opinion.opinionSlugId,
                isOwn: target.isOwn,
                conversationSlugId: target.conversationSlugId,
            })),
        ).toEqual([
            { slugId: "opinion2", isOwn: true, conversationSlugId },
            { slugId: "opinion1", isOwn: false, conversationSlugId },
        ]);
        for (const target of targets) {
            expect(target).not.toHaveProperty("authorId");
            expect(target.opinion).not.toHaveProperty("authorId");
        }
        const anonymous = await fetchOpinionTargetsBySlugIdList({
            db,
            opinionSlugIdList: ["opinion2"],
            displayContentViewerPreferences: {
                viewerUserId: undefined,
                displayLanguage: "en",
                spokenLanguages: ["en"],
            },
        });
        expect(anonymous.at(0)?.isOwn).toBe(false);
    });

    it("does not return hidden or deleted statement targets even to their author", async () => {
        await db
            .insert(opinionModerationTable)
            .values({
                opinionId: opinionIds.opinion2,
                moderationAction: "hide",
                moderationReason: "spam",
            });
        await db
            .update(opinionTable)
            .set({ currentContentId: null })
            .where(eq(opinionTable.id, opinionIds.opinion3));
        const targets = await fetchOpinionTargetsBySlugIdList({
            db,
            opinionSlugIdList: ["opinion2", "opinion3", "missing"],
            displayContentViewerPreferences: {
                viewerUserId: authorId,
                displayLanguage: "en",
                spokenLanguages: ["en"],
            },
        });
        expect(targets).toEqual([]);
    });

    it("uses stable ID tie-breaking when My statements share a creation timestamp", async () => {
        await db
            .update(opinionTable)
            .set({ createdAt: new Date("2026-01-01T00:00:00Z") });
        const first = await fetchPage({
            db,
            cursor: null,
            limit: 1,
            filter: "my_statements",
            viewerId: authorId,
        });
        expect([...first.items.keys()]).toEqual(["opinion3"]);
        const cursor = first.cursorsByOpinionSlugId.get("opinion3");
        if (cursor === undefined) throw new Error("Missing page cursor");
        const second = await fetchPage({
            db,
            cursor,
            limit: 1,
            filter: "my_statements",
            viewerId: authorId,
        });
        expect([...second.items.keys()]).toEqual(["opinion2"]);
    });

    it("includes a statement created after a participant reached the end", async () => {
        const initial = await remaining({
            db,
            excludedOpinionSlugIds: ["opinion1", "opinion2", "opinion3"],
        });
        expect(initial).toBe(0);
        const conversationRows = await db
            .select({
                id: conversationTable.id,
                contentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId));
        const conversation = conversationRows.at(0);
        if (conversation === undefined || conversation.contentId === null) {
            throw new Error("Missing conversation content");
        }
        const newOpinions = await db
            .insert(opinionTable)
            .values({
                slugId: "opinion4",
                authorId,
                conversationId: conversation.id,
            })
            .returning({ id: opinionTable.id });
        const opinion = newOpinions.at(0);
        if (opinion === undefined) throw new Error("Missing new opinion");
        const contents = await db
            .insert(opinionContentTable)
            .values({
                opinionId: opinion.id,
                conversationContentId: conversation.contentId,
                content: "Newly submitted statement",
                sourceLanguageCode: "en",
            })
            .returning({ id: opinionContentTable.id });
        const content = contents.at(0);
        if (content === undefined)
            throw new Error("Missing new opinion content");
        await db
            .update(opinionTable)
            .set({ currentContentId: content.id })
            .where(eq(opinionTable.id, opinion.id));

        expect(
            await remaining({
                db,
                excludedOpinionSlugIds: ["opinion1", "opinion2", "opinion3"],
            }),
        ).toBe(1);
    });

    it("keeps a Discover cursor stable when its statement is voted on between pages", async () => {
        const cursor = {
            kind: "discover",
            opinionSlugId: "opinion3",
            opinionId: opinionIds.opinion3,
            createdAt: new Date("2026-01-03T00:00:00Z"),
            wasVoted: false,
            routingPriority: null,
            routingSnapshotId: null,
        } satisfies OpinionPageCursor;
        const voteRows = await db
            .insert(voteTable)
            .values({
                authorId: readerId,
                opinionId: opinionIds.opinion3,
            })
            .returning({ id: voteTable.id });
        const vote = voteRows.at(0);
        if (vote === undefined) throw new Error("Missing vote");
        const contentRows = await db
            .insert(voteContentTable)
            .values({
                voteId: vote.id,
                opinionContentId: 3,
                vote: "agree",
            })
            .returning({ id: voteContentTable.id });
        const content = contentRows.at(0);
        if (content === undefined) throw new Error("Missing vote content");
        await db
            .update(voteTable)
            .set({ currentContentId: content.id })
            .where(eq(voteTable.id, vote.id));

        const next = await fetchOpinionsByPostSlugId({
            db,
            postSlugId: conversationSlugId,
            personalizationUserId: readerId,
            filterTarget: "discover",
            limit: 3,
            excludedOpinionSlugIds: [],
            cursor,
            displayContentPreferences: {
                displayLanguage: "en",
                targetLanguage: "en",
                spokenLanguages: ["en"],
                translationAllowed: false,
                viewerUserId: readerId,
            },
        });
        expect([...next.items.keys()]).toEqual(["opinion2", "opinion1"]);
    });

    it("rejects a Discover cursor referencing an unrelated analysis snapshot", async () => {
        const otherConfig = await db
            .insert(polisConversationConfigTable)
            .values({})
            .returning({ id: polisConversationConfigTable.id });
        const config = otherConfig.at(0);
        if (config === undefined) throw new Error("Missing other Polis config");
        const otherConversations = await db
            .insert(conversationTable)
            .values({
                slugId: "other123",
                projectId: 1,
                polisConfigId: config.id,
            })
            .returning({ id: conversationTable.id });
        const otherConversation = otherConversations.at(0);
        if (otherConversation === undefined)
            throw new Error("Missing other conversation");
        const snapshots = await db
            .insert(analysisSnapshotTable)
            .values({
                conversationId: otherConversation.id,
                inputSnapshotId: 1,
                dataGeneration: 0,
                computedAt: new Date(),
            })
            .returning({ id: analysisSnapshotTable.id });
        const snapshot = snapshots.at(0);
        if (snapshot === undefined)
            throw new Error("Missing analysis snapshot");
        await expect(
            fetchOpinionsByPostSlugId({
                db,
                postSlugId: conversationSlugId,
                personalizationUserId: readerId,
                filterTarget: "discover",
                limit: 1,
                excludedOpinionSlugIds: [],
                cursor: {
                    kind: "discover",
                    opinionSlugId: "opinion3",
                    opinionId: opinionIds.opinion3,
                    createdAt: new Date("2026-01-03T00:00:00Z"),
                    wasVoted: false,
                    routingPriority: null,
                    routingSnapshotId: snapshot.id,
                },
                displayContentPreferences: {
                    displayLanguage: "en",
                    targetLanguage: "en",
                    spokenLanguages: ["en"],
                    translationAllowed: false,
                    viewerUserId: readerId,
                },
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("counts active votes, ignores cancelled votes, mutes, and accepted local exclusions", async () => {
        expect(await remaining({ db, excludedOpinionSlugIds: [] })).toBe(3);
        const activeVote = await db
            .insert(voteTable)
            .values({
                authorId: readerId,
                opinionId: opinionIds.opinion2,
            })
            .returning({ id: voteTable.id });
        const vote = activeVote.at(0);
        if (vote === undefined) throw new Error("Missing vote");
        const voteContent = await db
            .insert(voteContentTable)
            .values({
                voteId: vote.id,
                opinionContentId: 2,
                vote: "pass",
            })
            .returning({ id: voteContentTable.id });
        const content = voteContent.at(0);
        if (content === undefined) throw new Error("Missing vote content");
        await db
            .update(voteTable)
            .set({ currentContentId: content.id })
            .where(eq(voteTable.id, vote.id));
        await db.insert(voteTable).values({
            authorId: readerId,
            opinionId: opinionIds.opinion3,
            currentContentId: null,
        });
        expect(await remaining({ db, excludedOpinionSlugIds: [] })).toBe(2);
        expect(
            await countUnansweredOpinions({
                db,
                conversationSlugId,
                personalizationUserId: undefined,
                excludedOpinionSlugIds: [],
            }),
        ).toBe(3);
        await db.insert(userMutePreferenceTable).values({
            sourceUserId: readerId,
            targetUserId: otherAuthorId,
        });
        expect(await remaining({ db, excludedOpinionSlugIds: [] })).toBe(1);
        expect(
            await remaining({ db, excludedOpinionSlugIds: ["opinion3"] }),
        ).toBe(0);
        const next = await fetchOpinionsByPostSlugId({
            db,
            postSlugId: conversationSlugId,
            personalizationUserId: readerId,
            filterTarget: "unanswered_new",
            limit: 1,
            excludedOpinionSlugIds: [],
            cursor: null,
            displayContentPreferences: {
                displayLanguage: "en",
                targetLanguage: "en",
                spokenLanguages: ["en"],
                translationAllowed: false,
                viewerUserId: readerId,
            },
        });
        expect([...next.items.keys()]).toEqual(["opinion3"]);
        await db.insert(opinionModerationTable).values({
            opinionId: opinionIds.opinion3,
            moderationAction: "hide",
            moderationReason: "spam",
        });
        expect(await remaining({ db, excludedOpinionSlugIds: [] })).toBe(0);
    });
});

function remaining({
    db,
    excludedOpinionSlugIds,
}: {
    db: PostgresJsDatabase;
    excludedOpinionSlugIds: string[];
}) {
    return countUnansweredOpinions({
        db,
        conversationSlugId,
        personalizationUserId: readerId,
        excludedOpinionSlugIds,
    });
}

function fetchPage({
    db,
    cursor,
    limit,
    filter = "new",
    viewerId = readerId,
}: {
    db: PostgresJsDatabase;
    cursor: OpinionPageCursor | null;
    limit: number;
    filter?: "new" | "my_statements";
    viewerId?: string;
}) {
    return fetchOpinionsByPostSlugId({
        db,
        postSlugId: conversationSlugId,
        personalizationUserId: viewerId,
        filterTarget: filter,
        limit,
        excludedOpinionSlugIds: [],
        cursor,
        displayContentPreferences: {
            displayLanguage: "en",
            targetLanguage: "en",
            spokenLanguages: ["en"],
            translationAllowed: false,
            viewerUserId: viewerId,
        },
    });
}
