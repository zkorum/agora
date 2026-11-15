import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { fetchFeedPage, fetchFeedHead } from "../src/service/feed.js";
import {
    conversationContentTable,
    conversationModerationTable,
    conversationTable,
    conversationViewSnapshotTable,
    organizationTable,
    polisConversationConfigTable,
    projectOrganizationOwnershipTable,
    projectTable,
    rankingConversationConfigTable,
    userMutePreferenceTable,
    userTable,
} from "../src/shared-backend/schema.js";
import {
    Dto,
    FEED_PAGE_SIZE,
    type FetchFeedRequest,
    type FetchFeedResponse,
} from "../src/shared/types/dto.js";
import { readDbFixtureSql } from "./dbFixture.js";

vi.mock("../src/app.js", () => ({
    config: {},
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const viewerId = "00000000-0000-4000-8000-000000000001";
const authorId = "00000000-0000-4000-8000-000000000002";
const createdAt = new Date("2026-01-01T00:00:00Z");

describe("server-owned feed pagination", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    const queries: string[] = [];

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
        });
        db = drizzle({
            client,
            logger: {
                logQuery: (query) => {
                    queries.push(query);
                },
            },
        });
        await client.unsafe(readDbFixtureSql("feed-pagination.sql"));
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await client.unsafe(`TRUNCATE "conversation", "conversation_content", "conversation_view_snapshot", "conversation_moderation",
            "polis_conversation_config", "ranking_conversation_config", "ranking_conversation_stats_snapshot",
            "project", "project_organization_ownership", "organization", "user", "user_mute_preference" RESTART IDENTITY CASCADE`);
        await db.insert(userTable).values([
            { id: viewerId, username: "viewer" },
            { id: authorId, username: "author" },
        ]);
        await addProject({ slug: "public" });
        for (let index = 0; index < 45; index++)
            await addConversation({
                slugId: `feed${String(index).padStart(4, "0")}`,
            });
        queries.length = 0;
    });

    async function addProject({
        slug,
        personalUserId,
    }: {
        slug: string;
        personalUserId?: string;
    }): Promise<number> {
        const [organization] = await db
            .insert(organizationTable)
            .values({
                slug,
                displayName: slug,
                autoProvisionedForUserId: personalUserId,
                isFullImagePath: false,
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
            })
            .returning({ id: organizationTable.id });
        const [project] = await db
            .insert(projectTable)
            .values({ slug, title: slug, directoryVisibility: "listed" })
            .returning({ id: projectTable.id });
        if (organization === undefined || project === undefined)
            throw new Error("Missing fixture owner");
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId: project.id, organizationId: organization.id });
        return project.id;
    }

    async function addConversation({
        slugId,
        projectId = 1,
        votes = 0,
        type = "polis",
        snapshot = true,
        createdAt: rowCreatedAt = createdAt,
    }: {
        slugId: string;
        projectId?: number;
        votes?: number;
        type?: "polis" | "prioritizing";
        snapshot?: boolean;
        createdAt?: Date;
    }): Promise<number> {
        const [config] =
            type === "polis"
                ? await db
                      .insert(polisConversationConfigTable)
                      .values({})
                      .returning({ id: polisConversationConfigTable.id })
                : await db
                      .insert(rankingConversationConfigTable)
                      .values({
                          rankingMode: "bws",
                          voteCount: votes,
                          totalVoteCount: votes,
                      })
                      .returning({ id: rankingConversationConfigTable.id });
        if (config === undefined) throw new Error("Missing fixture config");
        const [conversation] = await db
            .insert(conversationTable)
            .values({
                slugId,
                projectId,
                conversationType: type,
                polisConfigId: type === "polis" ? config.id : null,
                rankingConfigId: type === "prioritizing" ? config.id : null,
                prioritizationType:
                    type === "prioritizing" ? "comparisons" : undefined,
                createdAt: rowCreatedAt,
                lastReactedAt: rowCreatedAt,
            })
            .returning({ id: conversationTable.id });
        if (conversation === undefined)
            throw new Error("Missing fixture conversation");
        const [content] = await db
            .insert(conversationContentTable)
            .values({
                conversationId: conversation.id,
                title: slugId,
                body: "<p>Preview</p>",
                sourceLanguageCode: "en",
            })
            .returning({ id: conversationContentTable.id });
        if (content === undefined) throw new Error("Missing fixture content");
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversation.id));
        if (snapshot)
            await addSnapshot({ conversationId: conversation.id, votes });
        return conversation.id;
    }

    async function addSnapshot({
        conversationId,
        votes,
        activated = true,
    }: {
        conversationId: number;
        votes: number;
        activated?: boolean;
    }): Promise<void> {
        await db.insert(conversationViewSnapshotTable).values({
            conversationId,
            opinionGroupSpecId: 1,
            viewReason: "analysis_completed",
            isClosed: false,
            opinionCount: 0,
            voteCount: votes,
            participantCount: 0,
            totalOpinionCount: 0,
            totalVoteCount: votes,
            totalParticipantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            createdAt,
            activatedAt: activated ? createdAt : null,
        });
    }

    async function page({
        request,
        viewer,
    }: {
        request: FetchFeedRequest;
        viewer?: string;
    }): Promise<FetchFeedResponse> {
        return Dto.fetchFeedResponse.parse(
            await fetchFeedPage({
                db,
                request,
                viewerId: viewer,
                baseImageServiceUrl: "https://example.com/images/",
                currentDisplayLanguage: "en",
                spokenLanguages: ["en"],
            }),
        );
    }

    function slugs(response: FetchFeedResponse): string[] {
        return response.feedItemList.map(
            (item) => item.conversationData.metadata.conversationSlugId,
        );
    }

    function nextRequest(response: FetchFeedResponse): FetchFeedRequest {
        if (response.nextCursor === null)
            throw new Error("Expected another page");
        return response.sortAlgorithm === "new"
            ? { sortAlgorithm: "new", cursor: response.nextCursor }
            : { sortAlgorithm: "following", cursor: response.nextCursor };
    }

    it("round-trips fractional Popular scores and timestamps without dropping or duplicating rows", async () => {
        const rankedAt = new Date("2026-01-02T00:00:00Z");
        const expected = Array.from({ length: 45 }, (_, index) => ({
            slugId: `feed${String(index).padStart(4, "0")}`,
            id: index + 1,
            createdAt,
            votes: 0,
        }));
        for (let index = 0; index < 25; index++) {
            const item = {
                slugId: `float${String(index).padStart(3, "0")}`,
                createdAt: new Date(rankedAt.getTime() - (index + 1) * 43_123),
                votes: index % 5,
            };
            expected.push({ ...item, id: await addConversation(item) });
        }
        function referenceScore(item: (typeof expected)[number]): number {
            const age =
                (rankedAt.getTime() - item.createdAt.getTime()) / 86_400_000;
            return Math.log(
                Math.exp(-0.4 * age) +
                    Math.exp(-0.3 * age) +
                    2 +
                    Math.exp(0.5 * item.votes),
            );
        }
        expected.sort(
            (a, b) =>
                referenceScore(b) - referenceScore(a) ||
                b.createdAt.getTime() - a.createdAt.getTime() ||
                b.id - a.id,
        );
        let request: FetchFeedRequest = {
            sortAlgorithm: "following",
            cursor: {
                rankedAt,
                score: 2_147_483_647,
                createdAt: rankedAt,
                conversationId: 2_147_483_647,
            },
        };
        const actual: string[] = [];
        for (let index = 0; index < 4; index++) {
            const response = await page({ request });
            actual.push(...slugs(response));
            if (response.nextCursor === null) break;
            request = Dto.fetchFeedRequest.parse(
                JSON.parse(JSON.stringify(nextRequest(response))),
            );
        }
        expect(actual).toEqual(expected.map((item) => item.slugId));
    });

    it.each(["new", "following"] as const)(
        "pages the complete %s feed deterministically across equal timestamps and scores",
        async (sortAlgorithm) => {
            const request: FetchFeedRequest =
                sortAlgorithm === "new"
                    ? { sortAlgorithm, cursor: null }
                    : { sortAlgorithm, cursor: null };
            const first = await page({ request });
            expect(first.feedItemList).toHaveLength(FEED_PAGE_SIZE);
            const second = await page({ request: nextRequest(first) });
            expect(second.feedItemList).toHaveLength(FEED_PAGE_SIZE);
            const third = await page({ request: nextRequest(second) });
            expect(third.feedItemList).toHaveLength(5);
            expect(third.nextCursor).toBeNull();
            expect([
                ...slugs(first),
                ...slugs(second),
                ...slugs(third),
            ]).toEqual(
                Array.from(
                    { length: 45 },
                    (_, index) => `feed${String(44 - index).padStart(4, "0")}`,
                ),
            );
            if (
                first.sortAlgorithm === "following" &&
                second.sortAlgorithm === "following"
            )
                expect(second.nextCursor?.rankedAt).toEqual(
                    first.nextCursor?.rankedAt,
                );
        },
    );

    it("orders large conversations by finite scores and ignores unpublished snapshots", async () => {
        const high = await addConversation({
            slugId: "high0001",
            votes: 10_000,
        });
        await addConversation({ slugId: "high0002", votes: 9_000 });
        await addSnapshot({
            conversationId: high,
            votes: 2_000_000_000,
            activated: false,
        });
        const first = await page({
            request: { sortAlgorithm: "following", cursor: null },
        });
        expect(slugs(first).slice(0, 2)).toEqual(["high0001", "high0002"]);
        expect(first.feedItemList[0]?.conversationData.metadata.voteCount).toBe(
            10_000,
        );
        if (first.sortAlgorithm === "following")
            expect(Number.isFinite(first.nextCursor?.score)).toBe(true);
    });

    it("preserves the original recency weighting for future-dated imported records", async () => {
        const rankedAt = new Date("2026-01-02T00:00:00Z");
        await addConversation({
            slugId: "future01",
            createdAt: new Date("2026-01-04T00:00:00Z"),
        });
        await addConversation({
            slugId: "present1",
            createdAt: rankedAt,
            votes: 1,
        });
        const response = await page({
            request: {
                sortAlgorithm: "following",
                cursor: {
                    rankedAt,
                    score: 2_147_483_647,
                    conversationId: 2_147_483_647,
                    createdAt: rankedAt,
                },
            },
        });
        expect(slugs(response).slice(0, 2)).toEqual(["future01", "present1"]);
    });

    it.each(["new", "following"] as const)(
        "applies visibility and mutes before limiting %s pages and head checks",
        async (sortAlgorithm) => {
            const request: FetchFeedRequest =
                sortAlgorithm === "new"
                    ? { sortAlgorithm, cursor: null }
                    : { sortAlgorithm, cursor: null };
            const mutedProject = await addProject({
                slug: "muted",
                personalUserId: authorId,
            });
            const deletedProject = await addProject({ slug: "deleted" });
            await db
                .update(projectTable)
                .set({ deletedAt: new Date() })
                .where(eq(projectTable.id, deletedProject));
            await addConversation({
                slugId: "muted001",
                projectId: mutedProject,
            });
            await addConversation({
                slugId: "project1",
                projectId: deletedProject,
            });
            await addConversation({ slugId: "nosnap01", snapshot: false });
            const hidden = await addConversation({ slugId: "hidden01" });
            const importing = await addConversation({ slugId: "import01" });
            const deleted = await addConversation({ slugId: "deleted1" });
            const locked = await addConversation({ slugId: "locked01" });
            await db
                .update(conversationTable)
                .set({ isIndexed: false })
                .where(eq(conversationTable.id, hidden));
            await db
                .update(conversationTable)
                .set({ isImporting: true })
                .where(eq(conversationTable.id, importing));
            await db
                .update(conversationTable)
                .set({ currentContentId: null })
                .where(eq(conversationTable.id, deleted));
            await db.insert(conversationModerationTable).values({
                conversationId: locked,
                authorId: viewerId,
                moderationAction: "lock",
                moderationReason: "spam",
            });
            await db
                .insert(userMutePreferenceTable)
                .values({ sourceUserId: viewerId, targetUserId: authorId });
            const first = await page({
                request,
                viewer: viewerId,
            });
            expect(first.feedItemList).toHaveLength(FEED_PAGE_SIZE);
            expect(slugs(first)).toEqual(
                Array.from(
                    { length: 20 },
                    (_, index) => `feed${String(44 - index).padStart(4, "0")}`,
                ),
            );
            const head = await fetchFeedHead({
                db,
                viewerId,
                sortAlgorithm,
            });
            expect(head.topConversationSlugIdList).toEqual(
                slugs(first).slice(0, 10),
            );
            const anonymous = await page({
                request,
            });
            expect(slugs(anonymous)).toContain("muted001");
        },
    );

    it.each(["new", "following"] as const)(
        "rechecks deleted authors, organizations and ownership in %s",
        async (sortAlgorithm) => {
            const projectId = await addProject({
                slug: "personal",
                personalUserId: authorId,
            });
            await addConversation({ slugId: "owner001", projectId });
            const request: FetchFeedRequest =
                sortAlgorithm === "new"
                    ? { sortAlgorithm, cursor: null }
                    : { sortAlgorithm, cursor: null };
            expect(slugs(await page({ request }))).toContain("owner001");
            await db
                .update(userTable)
                .set({ isDeleted: true })
                .where(eq(userTable.id, authorId));
            expect(slugs(await page({ request }))).not.toContain("owner001");
            await db
                .update(userTable)
                .set({ isDeleted: false })
                .where(eq(userTable.id, authorId));
            await db
                .update(organizationTable)
                .set({ deletedAt: new Date() })
                .where(
                    eq(organizationTable.autoProvisionedForUserId, authorId),
                );
            expect(slugs(await page({ request }))).not.toContain("owner001");
            await db
                .update(organizationTable)
                .set({ deletedAt: null })
                .where(
                    eq(organizationTable.autoProvisionedForUserId, authorId),
                );
            await db
                .update(projectOrganizationOwnershipTable)
                .set({ deletedAt: new Date() })
                .where(
                    eq(projectOrganizationOwnershipTable.projectId, projectId),
                );
            expect(slugs(await page({ request }))).not.toContain("owner001");
            const head = await fetchFeedHead({
                db,
                viewerId: undefined,
                sortAlgorithm,
            });
            expect(head.topConversationSlugIdList).not.toContain("owner001");
        },
    );

    it("rechecks visibility on subsequent pages and accepts deletion of the cursor row", async () => {
        const first = await page({
            request: { sortAlgorithm: "new", cursor: null },
        });
        if (first.nextCursor === null) throw new Error("Missing cursor");
        await db
            .update(conversationTable)
            .set({ currentContentId: null })
            .where(eq(conversationTable.id, first.nextCursor.conversationId));
        await db
            .update(conversationTable)
            .set({ isIndexed: false })
            .where(eq(conversationTable.slugId, "feed0024"));
        const second = await page({ request: nextRequest(first) });
        expect(second.feedItemList).toHaveLength(20);
        expect(slugs(second)).not.toContain("feed0024");
        expect(slugs(second)).not.toContain("feed0025");
    });

    it("uses processed ranking counters instead of stale snapshot counters", async () => {
        const ranking = await addConversation({
            slugId: "ranking1",
            votes: 10_000,
            type: "prioritizing",
        });
        await db
            .update(rankingConversationConfigTable)
            .set({ processedScoringInputRevision: 0, voteCount: 0 })
            .where(eq(rankingConversationConfigTable.id, 1));
        const first = await page({
            request: { sortAlgorithm: "following", cursor: null },
        });
        expect(slugs(first)[0]).toBe("ranking1");
        expect(first.feedItemList[0]?.conversationData.metadata.voteCount).toBe(
            0,
        );
        // Its score ties zero-vote Polis conversations, so the ID tie-breaker wins.
        await db
            .update(conversationTable)
            .set({ isIndexed: false })
            .where(eq(conversationTable.id, ranking));
        const head = await fetchFeedHead({
            db,
            viewerId: undefined,
            sortAlgorithm: "following",
        });
        expect(head.topConversationSlugIdList[0]).toBe("feed0044");
    });

    it("checks the head with one bounded metadata-only query", async () => {
        const head = await fetchFeedHead({
            db,
            viewerId: undefined,
            sortAlgorithm: "following",
        });
        expect(head.topConversationSlugIdList).toHaveLength(10);
        expect(queries).toHaveLength(1);
        expect(queries[0]).not.toContain('"body"');
        expect(queries[0]).not.toContain('"title"');
        expect(queries[0]).not.toContain('"content_translation_work"');
    });

    it("rejects client-controlled limits, viewer IDs, and mismatched cursors", () => {
        expect(
            Dto.fetchFeedRequest.safeParse({
                sortAlgorithm: "new",
                cursor: null,
                limit: 1000,
            }).success,
        ).toBe(false);
        expect(
            Dto.fetchFeedRequest.safeParse({
                sortAlgorithm: "new",
                cursor: null,
                viewerId,
            }).success,
        ).toBe(false);
        expect(
            Dto.fetchFeedRequest.safeParse({
                sortAlgorithm: "following",
                cursor: { conversationId: 1, createdAt },
            }).success,
        ).toBe(false);
        expect(
            Dto.fetchFeedRequest.safeParse({
                sortAlgorithm: "following",
                cursor: {
                    conversationId: 1,
                    createdAt,
                    rankedAt: createdAt,
                    score: Infinity,
                },
            }).success,
        ).toBe(false);
    });

    it("rejects invalid cursor values before they can reach PostgreSQL", () => {
        const cursor = { conversationId: 1, createdAt };
        const invalidRequests = [
            { sortAlgorithm: "new", cursor: { ...cursor, conversationId: -1 } },
            {
                sortAlgorithm: "new",
                cursor: { ...cursor, conversationId: 2_147_483_648 },
            },
            {
                sortAlgorithm: "new",
                cursor: { ...cursor, createdAt: -8_640_000_000_000_000 },
            },
            {
                sortAlgorithm: "new",
                cursor: { ...cursor, createdAt: "2026-01-01'; SELECT 1 --" },
            },
            {
                sortAlgorithm: "new",
                cursor: { ...cursor, rankedAt: createdAt, score: 1 },
            },
            {
                sortAlgorithm: "following",
                cursor: { ...cursor, rankedAt: createdAt, score: NaN },
            },
            {
                sortAlgorithm: "following",
                cursor: { ...cursor, rankedAt: createdAt, score: -1 },
            },
            {
                sortAlgorithm: "following",
                cursor: {
                    ...cursor,
                    rankedAt: createdAt,
                    score: 2_147_483_648,
                },
            },
            {
                sortAlgorithm: "following",
                cursor: { ...cursor, rankedAt: true, score: 1 },
            },
        ];
        for (const request of invalidRequests)
            expect(Dto.fetchFeedRequest.safeParse(request).success).toBe(false);
        expect(queries).toHaveLength(0);
    });
});
