import { eq, sql } from "drizzle-orm";
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
import {
    fetchProjectAggregateCounts,
    fetchProjectPage,
    fetchProjectConversationPage,
} from "../src/service/projectPage.js";
import {
    conversationContentTable,
    conversationTable,
    conversationViewSnapshotTable,
    projectTable,
    projectContentTable,
    rankingConversationConfigTable,
    rankingConversationStatsSnapshotTable,
} from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { readDbFixtureSql } from "./dbFixture.js";

vi.mock("../src/app.js", () => ({
    config: {},
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("project published participation counts", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;

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
        db = drizzle(client);
        // Intentionally no vote, participant, or survey tables: project reads
        // must depend only on the same persisted counters as conversation pages.
        await db.execute(sql.raw(readDbFixtureSql("project-page-counts.sql")));
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE conversation, conversation_view_snapshot,
            ranking_conversation_config, ranking_conversation_stats_snapshot, project
            RESTART IDENTITY CASCADE`);
        const projects = await db
            .insert(projectTable)
            .values([
                {
                    slug: "test-project",
                    title: "Test project",
                    directoryVisibility: "listed",
                },
                {
                    slug: "other-project",
                    title: "Other project",
                    directoryVisibility: "listed",
                },
            ])
            .returning({ id: projectTable.id });
        for (const project of projects) {
            const contents = await db
                .insert(projectContentTable)
                .values({
                    projectId: project.id,
                    title: "Test project",
                    sourceLanguageCode: "en",
                })
                .returning({ id: projectContentTable.id });
            const content = contents.at(0);
            if (content === undefined)
                throw new Error("Missing project content fixture");
            await db
                .update(projectTable)
                .set({ currentContentId: content.id })
                .where(eq(projectTable.id, project.id));
        }
    });

    async function addConversation({
        slugId,
        projectId = 1,
        isImporting = false,
        isDeleted = false,
        isIndexed = true,
    }: {
        slugId: string;
        projectId?: number;
        isImporting?: boolean;
        isDeleted?: boolean;
        isIndexed?: boolean;
    }): Promise<number> {
        const rows = await db
            .insert(conversationTable)
            .values({
                slugId,
                projectId,
                polisConfigId: Number(slugId),
                isImporting,
                isIndexed,
            })
            .returning({ id: conversationTable.id });
        const row = rows.at(0);
        if (row === undefined) throw new Error("Missing conversation fixture");
        if (!isDeleted) {
            const contents = await db
                .insert(conversationContentTable)
                .values({
                    conversationId: row.id,
                    title: `Conversation ${slugId}`,
                    sourceLanguageCode: "en",
                })
                .returning({ id: conversationContentTable.id });
            const content = contents.at(0);
            if (content === undefined)
                throw new Error("Missing conversation content fixture");
            await db
                .update(conversationTable)
                .set({ currentContentId: content.id })
                .where(eq(conversationTable.id, row.id));
        }
        return row.id;
    }

    async function addSnapshot({
        conversationId,
        participantCount,
        voteCount,
        published = true,
        createdAt = new Date("2026-09-01T00:00:00Z"),
    }: {
        conversationId: number;
        participantCount: number;
        voteCount: number;
        published?: boolean;
        createdAt?: Date;
    }): Promise<number> {
        const rows = await db
            .insert(conversationViewSnapshotTable)
            .values({
                conversationId,
                opinionGroupSpecId: 1,
                viewReason: "analysis_completed",
                isClosed: false,
                participantCount,
                voteCount,
                opinionCount: 2,
                totalParticipantCount: participantCount + 10,
                totalVoteCount: voteCount + 100,
                totalOpinionCount: 2,
                moderatedOpinionCount: 0,
                hiddenOpinionCount: 0,
                createdAt,
                activatedAt: published ? createdAt : null,
            })
            .returning({ id: conversationViewSnapshotTable.id });
        const row = rows.at(0);
        if (row === undefined) throw new Error("Missing snapshot fixture");
        return row.id;
    }

    it("sums published counts and switches only when a pending snapshot activates", async () => {
        const first = await addConversation({ slugId: "1" });
        const second = await addConversation({ slugId: "2" });
        await addSnapshot({
            conversationId: first,
            participantCount: 2,
            voteCount: 8,
        });
        await addSnapshot({
            conversationId: second,
            participantCount: 3,
            voteCount: 12,
        });
        const pending = await addSnapshot({
            conversationId: first,
            participantCount: 4,
            voteCount: 20,
            published: false,
            createdAt: new Date("2026-09-02T00:00:00Z"),
        });

        await expect(
            fetchProjectAggregateCounts({ db, projectId: 1 }),
        ).resolves.toEqual({
            activityCount: 2,
            participationCount: 5,
            voteCount: 20,
        });

        await db
            .update(conversationViewSnapshotTable)
            .set({ activatedAt: new Date() })
            .where(eq(conversationViewSnapshotTable.id, pending));
        await expect(
            fetchProjectAggregateCounts({ db, projectId: 1 }),
        ).resolves.toEqual({
            activityCount: 2,
            participationCount: 7,
            voteCount: 32,
        });
    });

    it("excludes other projects, deleted conversations, and unfinished imports", async () => {
        for (const fixture of [
            { slugId: "1", projectId: 2 },
            { slugId: "2", isDeleted: true },
            { slugId: "3", isImporting: true },
        ]) {
            const conversationId = await addConversation(fixture);
            await addSnapshot({
                conversationId,
                participantCount: 100,
                voteCount: 1000,
            });
        }
        await expect(
            fetchProjectAggregateCounts({ db, projectId: 1 }),
        ).resolves.toEqual({
            activityCount: 0,
            participationCount: 0,
            voteCount: 0,
        });
    });

    it("includes invitation-only activities and treats missing published counts as zero", async () => {
        const conversationId = await addConversation({
            slugId: "1",
            isIndexed: false,
        });
        await addSnapshot({
            conversationId,
            participantCount: 7,
            voteCount: 20,
        });
        const unpublishedId = await addConversation({ slugId: "2" });
        await addSnapshot({
            conversationId: unpublishedId,
            participantCount: 100,
            voteCount: 200,
            published: false,
        });

        await expect(
            fetchProjectAggregateCounts({ db, projectId: 1 }),
        ).resolves.toEqual({
            activityCount: 2,
            participationCount: 7,
            voteCount: 20,
        });
    });

    it("loads both complete project payloads from snapshots alone for 57 conversations", async () => {
        const snapshots: (typeof conversationViewSnapshotTable.$inferInsert)[] =
            [];
        for (let index = 1; index <= 57; index += 1) {
            const conversationId = await addConversation({
                slugId: String(index),
            });
            for (let revision = 0; revision < 100; revision += 1) {
                const createdAt = new Date(Date.UTC(2026, 0, 1, 0, revision));
                snapshots.push({
                    conversationId,
                    opinionGroupSpecId: 1,
                    viewReason: "analysis_completed",
                    isClosed: false,
                    participantCount: revision + 1,
                    totalParticipantCount: revision + 1,
                    voteCount: (revision + 1) * 10,
                    totalVoteCount: (revision + 1) * 10,
                    opinionCount: 10,
                    totalOpinionCount: 10,
                    moderatedOpinionCount: 0,
                    hiddenOpinionCount: 0,
                    createdAt,
                    activatedAt: revision === 99 ? null : createdAt,
                });
            }
        }
        for (let index = 0; index < snapshots.length; index += 1000) {
            await db
                .insert(conversationViewSnapshotTable)
                .values(snapshots.slice(index, index + 1000));
        }
        const common = {
            db,
            baseImageServiceUrl: "https://images.example.com",
            currentDisplayLanguage: "en",
            requesterUserId: undefined,
        } as const;
        const pageStart = performance.now();
        const page = Dto.fetchProjectPageResponse.parse(
            await fetchProjectPage({
                ...common,
                request: Dto.fetchProjectPageRequest.parse({
                    projectSlug: "test-project",
                }),
            }),
        );
        const pageMs = performance.now() - pageStart;
        const conversationStart = performance.now();
        const conversation = Dto.fetchProjectConversationPageResponse.parse(
            await fetchProjectConversationPage({
                ...common,
                request: {
                    projectSlug: "test-project",
                    conversationSlugId: "1",
                },
            }),
        );
        const conversationMs = performance.now() - conversationStart;

        expect(page.project).not.toHaveProperty("participantCount");
        expect(page.project.participationCount).toBe(57 * 99);
        expect(page.project.voteCount).toBe(57 * 990);
        expect(page.activities).toHaveLength(12);
        expect(
            page.activities.every(
                (activity) => activity.stats.participantCount === 99,
            ),
        ).toBe(true);
        expect(conversation.project).toEqual(page.project);
        console.info(
            "Project payload timings (57 conversations, 5,700 snapshots)",
            {
                pageMs: Math.round(pageMs),
                conversationMs: Math.round(conversationMs),
            },
        );
    }, 15_000);

    it("uses published ranking counters rather than the old Polis-style snapshot", async () => {
        const configs = await db
            .insert(rankingConversationConfigTable)
            .values({
                rankingMode: "bws",
                itemCount: 2,
                totalItemCount: 2,
                participantCount: 3,
                totalParticipantCount: 10,
                voteCount: 12,
                totalVoteCount: 40,
                scoringInputRevision: 2,
                processedScoringInputRevision: 1,
            })
            .returning({ id: rankingConversationConfigTable.id });
        const config = configs.at(0);
        if (config === undefined) throw new Error("Missing ranking fixture");
        const conversationId = await addConversation({ slugId: "1" });
        await db
            .update(conversationTable)
            .set({
                conversationType: "ranking",
                polisConfigId: null,
                rankingConfigId: config.id,
            })
            .where(eq(conversationTable.id, conversationId));
        await addSnapshot({
            conversationId,
            participantCount: 1,
            voteCount: 2,
        });
        await db.insert(rankingConversationStatsSnapshotTable).values({
            conversationId,
            isClosed: false,
            scoringInputRevision: 1,
            itemCount: 2,
            totalItemCount: 2,
            participantCount: 3,
            totalParticipantCount: 10,
            voteCount: 12,
            totalVoteCount: 40,
        });

        await expect(
            fetchProjectAggregateCounts({ db, projectId: 1 }),
        ).resolves.toEqual({
            activityCount: 1,
            participationCount: 3,
            voteCount: 12,
        });
    });
});
