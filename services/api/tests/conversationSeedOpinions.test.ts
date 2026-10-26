import { randomUUID } from "node:crypto";
import { v3 } from "@google-cloud/translate";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
    conversationContentTable,
    conversationModerationTable,
    conversationTable,
    opinionContentTable,
    opinionTable,
    opinionGroupSpecTable,
    opinionModerationTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    projectOrganizationOwnershipTable,
    projectTable,
    rankingConversationConfigTable,
    rankingItemTable,
    rankingItemContentTable,
    maxdiffResultTable,
    maxdiffComparisonTable,
    userTable,
    voteContentTable,
    voteTable,
    premiumFeatureEntitlementTable,
} from "../src/shared-backend/schema.js";
import {
    getConversationForEdit,
    updateConversation,
} from "../src/service/postEdit.js";
import { postNewOpinion } from "../src/service/comment.js";
import * as translations from "../src/service/contentTranslation.js";
import * as contentLanguages from "../src/service/contentLanguageMetadata.js";
import {
    Dto,
    type UpdateConversationRequest,
} from "../src/shared/types/dto.js";
import { validateSeedOpinionAdditions } from "../src/shared/utils/seedOpinions.js";
import { readDbFixtureSql } from "./dbFixture.js";
import type { GoogleCloudCredentials } from "../src/shared-backend/googleCloudAuth.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const OWNER = "00000000-0000-4000-8000-000000000001";
const STRANGER = "00000000-0000-4000-8000-000000000002";

function firstRow<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing test fixture row");
    return row;
}

describe("seed-statement validation", () => {
    it("detects duplicates across formatting, case, and whitespace", () => {
        expect(
            validateSeedOpinionAdditions({
                opinions: [
                    "<p>Already <strong>HERE</strong></p>",
                    "New statement",
                    "<p>new   statement</p>",
                ],
                existingOpinions: ["<p>Already here</p>"],
            }),
        ).toEqual([0, 1, 2].map((index) => ({ index, reason: "duplicate" })));
    });
    it("rejects empty content after sanitization and accepts valid additions", () => {
        expect(
            validateSeedOpinionAdditions({
                opinions: ["<script>hidden</script>"],
                existingOpinions: [],
            }),
        ).toMatchObject([{ index: 0, reason: "plain_text_empty" }]);
        expect(
            validateSeedOpinionAdditions({
                opinions: ["<p>A new <strong>statement</strong></p>"],
                existingOpinions: ["An existing statement"],
            }),
        ).toEqual([]);
    });
    it("requires indexed errors for invalid seed statements", () => {
        expect(
            Dto.updateConversationResponse.parse({
                success: false,
                reason: "invalid_seed_opinion",
                seedOpinionFailure: { index: 0, reason: "duplicate" },
            }),
        ).toMatchObject({ reason: "invalid_seed_opinion" });
        expect(
            Dto.updateConversationResponse.safeParse({
                success: false,
                reason: "invalid_seed_opinion",
            }).success,
        ).toBe(false);
    });
});

describe("conversation seed statements", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let projectId: number;
    let organizationId: number;
    let hasLanguageAccess = false;
    let lockProbeTail = Promise.resolve();
    const googleCloudCredentials: GoogleCloudCredentials = {
        client: new v3.TranslationServiceClient({
            projectId: "language-test",
            universeDomain: "googleapis.com",
            credentials: {
                client_email: "language@example.test",
                private_key: "test-only",
            },
        }),
        config: { projectId: "language-test", location: "global" },
    };

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
            max: 8,
        });
        db = drizzle(client);
        await db.execute(
            sql.raw(readDbFixtureSql("conversation-seed-opinions.sql")),
        );
        await db.insert(userTable).values([
            { id: OWNER, username: "seed-editor" },
            { id: STRANGER, username: "stranger" },
        ]);
        await db.insert(opinionGroupSpecTable).values({
            analysisSpecId: 1,
            key: "test",
            version: 1,
            reducer: "pca",
            clusterer: "kmeans",
            selectionPolicy: "silhouette_size_balance",
            minClusterableParticipants: 7,
            minVotesPerParticipant: 3,
            maxGroupCount: 6,
        });
        const organization = firstRow(
            await db
                .insert(organizationTable)
                .values({
                    slug: "seed-organization",
                    displayName: "Seed organization",
                    defaultLanguageCode: "en",
                    isFullImagePath: false,
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const membership = firstRow(
            await db
                .insert(organizationMembershipTable)
                .values({ organizationId: organization.id, userId: OWNER })
                .returning(),
        );
        organizationId = organization.id;
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values({
                organizationMembershipId: membership.id,
                capability: "conversation_edit",
                grantedByUserId: OWNER,
            });
        const project = firstRow(
            await db
                .insert(projectTable)
                .values({
                    slug: "seed-project",
                    title: "Seed project",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        projectId = project.id;
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId, organizationId: organization.id });
    }, 120_000);

    afterAll(async () => {
        await googleCloudCredentials.client.close();
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    async function createConversation({
        ranking = false,
        sourceManaged = false,
        closed = false,
        absentBody = false,
    }: {
        ranking?: boolean;
        sourceManaged?: boolean;
        closed?: boolean;
        absentBody?: boolean;
    } = {}) {
        const config = ranking
            ? firstRow(
                  await db
                      .insert(rankingConversationConfigTable)
                      .values({
                          rankingMode: "bws",
                          externalSourceConfig: sourceManaged
                              ? {
                                    sourceType: "github_issue",
                                    repository: "test/repository",
                                    label: "priority",
                                }
                              : null,
                      })
                      .returning(),
              )
            : firstRow(
                  await db
                      .insert(polisConversationConfigTable)
                      .values({})
                      .returning(),
              );
        const conversation = firstRow(
            await db
                .insert(conversationTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    projectId,
                    conversationType: ranking ? "ranking" : "polis",
                    polisConfigId: ranking ? undefined : config.id,
                    rankingConfigId: ranking ? config.id : undefined,
                    isClosed: closed,
                })
                .returning(),
        );
        const content = firstRow(
            await db
                .insert(conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Original title",
                    body: absentBody ? undefined : "<p>Original body</p>",
                    bodyPlainText: absentBody ? "" : "Original body",
                })
                .returning(),
        );
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversation.id));
        const request = Dto.updateConversationRequest.parse({
            conversationSlugId: conversation.slugId,
            conversationTitle: content.title,
            conversationBody: content.body ?? undefined,
            isIndexed: conversation.isIndexed,
            participationMode: conversation.participationMode,
            multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            },
            conversationTypeConfig: ranking
                ? { conversationType: "ranking", rankingMode: "bws" }
                : { conversationType: "polis", votingPresentation: "list" },
        });
        return { conversation, content, config, request };
    }

    function save(request: UpdateConversationRequest) {
        return updateConversation({
            db,
            userId: OWNER,
            data: request,
            displayContentViewerPreferences: {
                viewerUserId: OWNER,
                displayLanguage: "en",
                spokenLanguages: [],
            },
        });
    }

    async function seedFixture({
        ranking = false,
    }: { ranking?: boolean } = {}) {
        const fixture = await createConversation({ ranking });
        const result = await save({
            ...fixture.request,
            newSeedOpinionList: ["First seed", "Second seed"],
        });
        if (!result.success) throw new Error("Failed to create seed fixture");
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        if (!editable.success) throw new Error("Missing editable seed fixture");
        return {
            ...fixture,
            first: firstRow(editable.seedOpinions),
            second: firstRow(editable.seedOpinions.slice(1)),
        };
    }

    async function grantLanguageAccess(): Promise<void> {
        if (hasLanguageAccess) return;
        await db.insert(premiumFeatureEntitlementTable).values({
            organizationId,
            feature: "dynamic_translation",
            startsAt: new Date(Date.now() - 60_000),
        });
        hasLanguageAccess = true;
    }

    async function assertSaveRowsAreUnlocked({
        conversationId,
        seedSlugId,
        ranking,
    }: {
        conversationId: number;
        seedSlugId: string;
        ranking: boolean;
    }): Promise<void> {
        const previous = lockProbeTail;
        let release = () => {};
        lockProbeTail = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            await db.transaction(async (tx) => {
                await tx
                    .select({ id: projectTable.id })
                    .from(projectTable)
                    .where(eq(projectTable.id, projectId))
                    .for("no key update", { noWait: true });
                await tx
                    .select({ id: conversationTable.id })
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversationId))
                    .for("no key update", { noWait: true });
                if (ranking)
                    await tx
                        .select({ id: rankingItemTable.id })
                        .from(rankingItemTable)
                        .where(eq(rankingItemTable.slugId, seedSlugId))
                        .for("update", { noWait: true });
                else
                    await tx
                        .select({ id: opinionTable.id })
                        .from(opinionTable)
                        .where(eq(opinionTable.slugId, seedSlugId))
                        .for("update", { noWait: true });
            });
        } finally {
            release();
        }
    }

    it.each([false, true])(
        "prepares external detection before locking the save rows (ranking=%s)",
        async (ranking) => {
            const fixture = await seedFixture({ ranking });
            await grantLanguageAccess();
            const detector = vi
                .spyOn(contentLanguages, "resolveContentLanguageMetadata")
                .mockImplementation(async (input) => {
                    expect(input.googleCloudCredentials).toBe(
                        googleCloudCredentials,
                    );
                    await assertSaveRowsAreUnlocked({
                        conversationId: fixture.conversation.id,
                        seedSlugId: fixture.first.slugId,
                        ranking,
                    });
                    return {
                        sourceLanguageCode: "en",
                        sourceRawLanguageCode: "en",
                        sourceLanguageProvider: "google_translate",
                        sourceLanguageConfidence: 1,
                    };
                });
            const eagerWork = vi
                .spyOn(
                    translations,
                    "createEagerContentTranslationWorkForKnownConversation",
                )
                .mockResolvedValue([]);
            try {
                expect(
                    (
                        await updateConversation({
                            db,
                            userId: OWNER,
                            googleCloudCredentials,
                            data: {
                                ...fixture.request,
                                conversationTitle:
                                    "Changed with external detection",
                                multilingualSetting: {
                                    dynamicTranslationEnabled: true,
                                    additionalLanguageCodes: ["fr"],
                                },
                                newSeedOpinionList: ["New prepared seed"],
                                seedOpinionChanges: [
                                    {
                                        action: "edit",
                                        slugId: fixture.first.slugId,
                                        sourceVersion:
                                            fixture.first.sourceVersion,
                                        content: "Prepared existing edit",
                                    },
                                    {
                                        action: "delete",
                                        slugId: fixture.second.slugId,
                                        sourceVersion:
                                            fixture.second.sourceVersion,
                                    },
                                ],
                            },
                        })
                    ).success,
                ).toBe(true);
                expect(detector).toHaveBeenCalledTimes(3);
            } finally {
                detector.mockRestore();
                eagerWork.mockRestore();
            }
        },
    );

    it("prepares existing-content refreshes outside locks and reuses prepared metadata for additions", async () => {
        const fixture = await seedFixture();
        await grantLanguageAccess();
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async (input) => {
                expect(input.googleCloudCredentials).toBe(
                    googleCloudCredentials,
                );
                await assertSaveRowsAreUnlocked({
                    conversationId: fixture.conversation.id,
                    seedSlugId: fixture.first.slugId,
                    ranking: false,
                });
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "google_translate",
                    sourceLanguageConfidence: 1,
                };
            });
        const eagerWork = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockResolvedValue([]);
        try {
            expect(
                (
                    await updateConversation({
                        db,
                        userId: OWNER,
                        googleCloudCredentials,
                        data: {
                            ...fixture.request,
                            multilingualSetting: {
                                dynamicTranslationEnabled: true,
                                additionalLanguageCodes: ["fr"],
                            },
                            newSeedOpinionList: ["New prepared seed"],
                        },
                    })
                ).success,
            ).toBe(true);
            expect(detector).toHaveBeenCalledTimes(4);
            const content = firstRow(
                await db
                    .select()
                    .from(conversationContentTable)
                    .where(eq(conversationContentTable.id, fixture.content.id)),
            );
            expect(content.sourceLanguageProvider).toBe("google_translate");
        } finally {
            detector.mockRestore();
            eagerWork.mockRestore();
        }
    });

    it("rejects a statement revision changed during external detection before committing the save", async () => {
        const fixture = await seedFixture();
        await grantLanguageAccess();
        let changed = false;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                if (!changed) {
                    changed = true;
                    const opinion = firstRow(
                        await db
                            .select()
                            .from(opinionTable)
                            .where(
                                eq(opinionTable.slugId, fixture.first.slugId),
                            ),
                    );
                    await db.transaction(async (tx) => {
                        const revision = firstRow(
                            await tx
                                .insert(opinionContentTable)
                                .values({
                                    opinionId: opinion.id,
                                    conversationContentId: fixture.content.id,
                                    content: "Concurrent edit",
                                    contentPlainText: "Concurrent edit",
                                    isEdited: true,
                                    editedByUserId: OWNER,
                                })
                                .returning(),
                        );
                        await tx
                            .update(opinionTable)
                            .set({ currentContentId: revision.id })
                            .where(eq(opinionTable.id, opinion.id));
                    });
                }
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "google_translate",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            expect(
                await updateConversation({
                    db,
                    userId: OWNER,
                    googleCloudCredentials,
                    data: {
                        ...fixture.request,
                        conversationTitle: "Must not apply",
                        multilingualSetting: {
                            dynamicTranslationEnabled: true,
                            additionalLanguageCodes: ["fr"],
                        },
                        seedOpinionChanges: [
                            {
                                action: "edit",
                                slugId: fixture.first.slugId,
                                sourceVersion: fixture.first.sourceVersion,
                                content: "Prepared edit",
                            },
                        ],
                    },
                }),
            ).toMatchObject({
                success: false,
                reason: "seed_opinion_change_rejected",
                changeFailure: "version_conflict",
            });
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationTable)
                        .where(
                            eq(conversationTable.id, fixture.conversation.id),
                        ),
                ).currentContentId,
            ).toBe(fixture.content.id);
        } finally {
            detector.mockRestore();
        }
    });

    it("rolls back when a concurrent new statement introduces an unprepared provider input", async () => {
        const fixture = await seedFixture();
        await grantLanguageAccess();
        let inserted = false;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                if (!inserted) {
                    inserted = true;
                    await db.transaction(async (tx) => {
                        const opinion = firstRow(
                            await tx
                                .insert(opinionTable)
                                .values({
                                    slugId: "latepaid",
                                    authorId: OWNER,
                                    conversationId: fixture.conversation.id,
                                    isSeed: true,
                                })
                                .returning(),
                        );
                        const content = firstRow(
                            await tx
                                .insert(opinionContentTable)
                                .values({
                                    opinionId: opinion.id,
                                    conversationContentId: fixture.content.id,
                                    content: "Late unprepared statement",
                                    contentPlainText:
                                        "Late unprepared statement",
                                })
                                .returning(),
                        );
                        await tx
                            .update(opinionTable)
                            .set({ currentContentId: content.id })
                            .where(eq(opinionTable.id, opinion.id));
                    });
                }
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "google_translate",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            await expect(
                updateConversation({
                    db,
                    userId: OWNER,
                    googleCloudCredentials,
                    data: {
                        ...fixture.request,
                        multilingualSetting: {
                            dynamicTranslationEnabled: true,
                            additionalLanguageCodes: ["fr"],
                        },
                    },
                }),
            ).rejects.toMatchObject({ statusCode: 409 });
            expect(detector).toHaveBeenCalledTimes(3);
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationTable)
                        .where(
                            eq(conversationTable.id, fixture.conversation.id),
                        ),
                ).dynamicTranslationEnabled,
            ).toBe(false);
            expect(
                firstRow(
                    await db
                        .select()
                        .from(conversationContentTable)
                        .where(
                            eq(conversationContentTable.id, fixture.content.id),
                        ),
                ).sourceLanguageProvider,
            ).toBeNull();
        } finally {
            detector.mockRestore();
        }
    });

    it.each([false, true])(
        "atomically edits and soft-deletes existing seeds, preserving history (ranking=%s)",
        async (ranking) => {
            const fixture = await seedFixture({ ranking });
            const saved = await save({
                ...fixture.request,
                conversationTitle: "Updated together",
                seedOpinionChanges: [
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Edited first seed",
                    },
                    {
                        action: "delete",
                        slugId: fixture.second.slugId,
                        sourceVersion: fixture.second.sourceVersion,
                    },
                ],
                newSeedOpinionList: ["Second seed"],
            });
            expect(saved.success).toBe(true);
            if (!ranking)
                expect(
                    saved.success && saved.updatedOpinions?.at(0),
                ).toMatchObject({
                    opinion: "Edited first seed",
                    isEdited: true,
                });
            const edited = await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            });
            expect(
                edited.success &&
                    edited.seedOpinions.map((opinion) => opinion.content),
            ).toEqual(["Edited first seed", "Second seed"]);
            if (ranking) {
                const removed = firstRow(
                    await db
                        .select()
                        .from(rankingItemTable)
                        .where(
                            eq(rankingItemTable.slugId, fixture.second.slugId),
                        ),
                );
                expect(removed.currentContentId).toBeNull();
                expect(
                    await db
                        .select()
                        .from(rankingItemContentTable)
                        .where(
                            eq(
                                rankingItemContentTable.rankingItemId,
                                removed.id,
                            ),
                        ),
                ).toHaveLength(1);
                const config = firstRow(
                    await db
                        .select()
                        .from(rankingConversationConfigTable)
                        .where(
                            eq(
                                rankingConversationConfigTable.id,
                                fixture.config.id,
                            ),
                        ),
                );
                expect(config.itemCount).toBe(2);
                expect(config.totalItemCount).toBe(2);
            } else {
                const removed = firstRow(
                    await db
                        .select()
                        .from(opinionTable)
                        .where(eq(opinionTable.slugId, fixture.second.slugId)),
                );
                expect(removed.currentContentId).toBeNull();
                expect(
                    await db
                        .select()
                        .from(opinionContentTable)
                        .where(eq(opinionContentTable.opinionId, removed.id)),
                ).toHaveLength(1);
                const changed = firstRow(
                    await db
                        .select()
                        .from(opinionTable)
                        .where(eq(opinionTable.slugId, fixture.first.slugId)),
                );
                const versions = await db
                    .select()
                    .from(opinionContentTable)
                    .where(eq(opinionContentTable.opinionId, changed.id));
                expect(versions).toHaveLength(2);
                expect(
                    versions.find(
                        (version) => version.id === changed.currentContentId,
                    ),
                ).toMatchObject({ isEdited: true, editedByUserId: OWNER });
            }
        },
    );

    it("rejects stale, cross-conversation, and duplicate edits before applying details or deletions", async () => {
        const fixture = await seedFixture();
        for (const { sourceVersion, content, reason } of [
            {
                sourceVersion: randomUUID(),
                content: "Changed",
                reason: "seed_opinion_change_rejected",
            },
            {
                sourceVersion: fixture.first.sourceVersion,
                content: fixture.second.content,
                reason: "invalid_seed_opinion",
            },
        ]) {
            expect(
                await save({
                    ...fixture.request,
                    conversationTitle: "Must not apply",
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion,
                            content,
                        },
                    ],
                }),
            ).toMatchObject({ success: false, reason });
        }
        const other = await createConversation();
        expect(
            await save({
                ...other.request,
                seedOpinionChanges: [
                    {
                        action: "delete",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "not_found",
        });
        const unchanged = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(unchanged.success && unchanged.conversationTitle).toBe(
            "Original title",
        );
        expect(unchanged.success && unchanged.seedOpinions).toHaveLength(2);
    });

    it("reports voted seeds as uneditable and rejects changes atomically while allowing soft-deletion", async () => {
        const fixture = await seedFixture();
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, fixture.first.slugId)),
        );
        if (opinion.currentContentId === null)
            throw new Error("Missing seed content");
        const vote = firstRow(
            await db
                .insert(voteTable)
                .values({ authorId: STRANGER, opinionId: opinion.id })
                .returning(),
        );
        const content = firstRow(
            await db
                .insert(voteContentTable)
                .values({
                    voteId: vote.id,
                    opinionContentId: opinion.currentContentId,
                    vote: "agree",
                })
                .returning(),
        );
        await db
            .update(voteTable)
            .set({ currentContentId: content.id })
            .where(eq(voteTable.id, vote.id));
        const edit = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            edit.success &&
                edit.seedOpinions.find(
                    (seed) => seed.slugId === fixture.first.slugId,
                )?.editing.allowed,
        ).toBe(false);
        expect(
            await save({
                ...fixture.request,
                conversationTitle: "Must not apply",
                seedOpinionChanges: [
                    {
                        action: "delete",
                        slugId: fixture.second.slugId,
                        sourceVersion: fixture.second.sourceVersion,
                    },
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Rewritten voted seed",
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "has_votes",
            seedOpinionSlugId: fixture.first.slugId,
        });
        expect(
            firstRow(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.slugId, fixture.second.slugId)),
            ).currentContentId,
        ).not.toBeNull();
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "delete",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(voteTable)
                    .where(eq(voteTable.id, vote.id)),
            ).currentContentId,
        ).toBe(content.id);
    });

    it("rolls back existing edits and deletions when later work fails", async () => {
        const fixture = await seedFixture();
        const failure = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockRejectedValueOnce(new Error("translation unavailable"));
        try {
            await expect(
                save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content: "Draft edit",
                        },
                        {
                            action: "delete",
                            slugId: fixture.second.slugId,
                            sourceVersion: fixture.second.sourceVersion,
                        },
                    ],
                }),
            ).rejects.toThrow("translation unavailable");
        } finally {
            failure.mockRestore();
        }
        const unchanged = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            unchanged.success &&
                unchanged.seedOpinions.map((seed) => seed.content),
        ).toEqual(["First seed", "Second seed"]);
    });

    it("rejects an old revision even when the statement text has returned to its original value", async () => {
        const fixture = await seedFixture();
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content: "Temporary edit",
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        const changed = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        if (!changed.success) throw new Error("Missing changed fixture");
        const temporary = firstRow(changed.seedOpinions);
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: temporary.slugId,
                            sourceVersion: temporary.sourceVersion,
                            content: fixture.first.content,
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        expect(
            await save({
                ...fixture.request,
                seedOpinionChanges: [
                    {
                        action: "delete",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "version_conflict",
        });
    });

    it("reports hidden statements as restricted and rejects their edits", async () => {
        const fixture = await seedFixture();
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, fixture.first.slugId)),
        );
        await db.insert(opinionModerationTable).values({
            opinionId: opinion.id,
            authorId: OWNER,
            moderationAction: "hide",
            moderationReason: "spam",
        });
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            editable.success &&
                editable.seedOpinions.find(
                    (seed) => seed.slugId === fixture.first.slugId,
                )?.editing,
        ).toEqual({ allowed: false, reason: "not_allowed" });
        expect(
            await save({
                ...fixture.request,
                seedOpinionChanges: [
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Hidden edit",
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "not_allowed",
        });
    });

    it("does not add a database round trip per statement when loading edit permissions", async () => {
        const fixture = await seedFixture();
        const queryLogger = vi.fn();
        const measuredDb = drizzle(client, {
            logger: { logQuery: queryLogger },
        });
        await getConversationForEdit({
            db: measuredDb,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        const twoStatementQueries = queryLogger.mock.calls.length;
        expect(
            (
                await save({
                    ...fixture.request,
                    newSeedOpinionList: ["Third", "Fourth", "Fifth", "Sixth"],
                })
            ).success,
        ).toBe(true);
        queryLogger.mockClear();
        await getConversationForEdit({
            db: measuredDb,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(queryLogger.mock.calls).toHaveLength(twoStatementQueries);
    });

    it("requires explicit edit permissions and bounds change batches at the API boundary", () => {
        expect(
            Dto.editableConversationSeedOpinion.safeParse({
                slugId: "seedtest",
                content: "Text",
                sourceVersion: randomUUID(),
            }).success,
        ).toBe(false);
        expect(
            Dto.updateConversationRequest.shape.seedOpinionChanges.safeParse(
                Array.from({ length: 51 }, () => ({
                    action: "delete",
                    slugId: "seedtest",
                    sourceVersion: randomUUID(),
                })),
            ).success,
        ).toBe(false);
    });

    it("sanitizes edits through the normal statement rich-text boundary", async () => {
        const fixture = await seedFixture();
        expect(
            (
                await save({
                    ...fixture.request,
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content:
                                '<p>Safe text<script>alert(1)</script><img src="x" onerror="alert(1)"></p>',
                        },
                    ],
                })
            ).success,
        ).toBe(true);
        const edited = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(edited.success && firstRow(edited.seedOpinions).content).toBe(
            "<p>Safe text</p>",
        );
    });

    it("bounds language-provider concurrency for existing statement edits", async () => {
        const fixture = await seedFixture();
        expect(
            (
                await save({
                    ...fixture.request,
                    newSeedOpinionList: [
                        "Third",
                        "Fourth",
                        "Fifth",
                        "Sixth",
                        "Seventh",
                    ],
                })
            ).success,
        ).toBe(true);
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        if (!editable.success) throw new Error("Missing editable fixture");
        let active = 0;
        let maximumActive = 0;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                active += 1;
                maximumActive = Math.max(maximumActive, active);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active -= 1;
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "lingua",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            expect(
                (
                    await save({
                        ...fixture.request,
                        seedOpinionChanges: editable.seedOpinions.map(
                            (opinion) => ({
                                action: "edit",
                                slugId: opinion.slugId,
                                sourceVersion: opinion.sourceVersion,
                                content: `${opinion.content} edited`,
                            }),
                        ),
                    })
                ).success,
            ).toBe(true);
            expect(detector).toHaveBeenCalledTimes(7);
            expect(maximumActive).toBeGreaterThan(1);
            expect(maximumActive).toBeLessThanOrEqual(5);
        } finally {
            detector.mockRestore();
        }
    });

    it("rolls back the entire save when a buffered vote arrives after staging an edit", async () => {
        const fixture = await seedFixture();
        const hasBlockingVotes = vi
            .fn()
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        expect(
            await updateConversation({
                db,
                userId: OWNER,
                voteBuffer: {
                    hasBlockingVotes,
                    add: vi.fn(),
                    flush: vi.fn(),
                    shutdown: vi.fn(),
                },
                data: {
                    ...fixture.request,
                    conversationTitle: "Must not apply",
                    seedOpinionChanges: [
                        {
                            action: "edit",
                            slugId: fixture.first.slugId,
                            sourceVersion: fixture.first.sourceVersion,
                            content: "Changed while voting",
                        },
                        {
                            action: "delete",
                            slugId: fixture.second.slugId,
                            sourceVersion: fixture.second.sourceVersion,
                        },
                    ],
                },
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "has_votes",
        });
        const unchanged = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(unchanged.success && unchanged.conversationTitle).toBe(
            "Original title",
        );
        expect(
            unchanged.success &&
                unchanged.seedOpinions.map((seed) => seed.content),
        ).toEqual(["First seed", "Second seed"]);
    });

    it("blocks ranked edits for valid votes but allows them after the voter deletes their account", async () => {
        const fixture = await seedFixture({ ranking: true });
        const result = firstRow(
            await db
                .insert(maxdiffResultTable)
                .values({
                    participantId: STRANGER,
                    conversationId: fixture.conversation.id,
                    comparisons: [],
                })
                .returning(),
        );
        await db.insert(maxdiffComparisonTable).values({
            maxdiffResultId: result.id,
            position: 0,
            bestSlugId: fixture.first.slugId,
            worstSlugId: fixture.second.slugId,
            candidateSet: [fixture.first.slugId, fixture.second.slugId],
        });
        const edit = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: fixture.conversation.slugId,
        });
        expect(
            edit.success &&
                edit.seedOpinions.every((seed) => !seed.editing.allowed),
        ).toBe(true);
        expect(
            await save({
                ...fixture.request,
                seedOpinionChanges: [
                    {
                        action: "edit",
                        slugId: fixture.first.slugId,
                        sourceVersion: fixture.first.sourceVersion,
                        content: "Rewritten ranked seed",
                    },
                ],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinion_change_rejected",
            changeFailure: "has_votes",
        });
        await db
            .update(userTable)
            .set({ isDeleted: true })
            .where(eq(userTable.id, STRANGER));
        try {
            const afterDeletion = await getConversationForEdit({
                db,
                userId: OWNER,
                conversationSlugId: fixture.conversation.slugId,
            });
            expect(
                afterDeletion.success &&
                    afterDeletion.seedOpinions.every(
                        (seed) => seed.editing.allowed,
                    ),
            ).toBe(true);
            expect(
                (
                    await save({
                        ...fixture.request,
                        seedOpinionChanges: [
                            {
                                action: "edit",
                                slugId: fixture.first.slugId,
                                sourceVersion: fixture.first.sourceVersion,
                                content: "Rewritten ranked seed",
                            },
                        ],
                    })
                ).success,
            ).toBe(true);
        } finally {
            await db
                .update(userTable)
                .set({ isDeleted: false })
                .where(eq(userTable.id, STRANGER));
        }
    });

    it("keeps the content version unchanged when adding seeds to a conversation without a body", async () => {
        const { request, conversation, content } = await createConversation({
            absentBody: true,
        });
        expect(
            (await save({ ...request, newSeedOpinionList: ["A new seed"] }))
                .success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversation.id)),
            ).currentContentId,
        ).toBe(content.id);
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(conversationContentTable)
                    .where(
                        eq(
                            conversationContentTable.conversationId,
                            conversation.id,
                        ),
                    ),
            ).count,
        ).toBe(1);
    });

    it("resolves each seed language once with bounded provider concurrency", async () => {
        const { request } = await createConversation();
        let active = 0;
        let maximumActive = 0;
        const detector = vi
            .spyOn(contentLanguages, "resolveContentLanguageMetadata")
            .mockImplementation(async () => {
                active += 1;
                maximumActive = Math.max(active, maximumActive);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active -= 1;
                return {
                    sourceLanguageCode: "en",
                    sourceRawLanguageCode: "en",
                    sourceLanguageProvider: "lingua",
                    sourceLanguageConfidence: 1,
                };
            });
        try {
            expect(
                (
                    await save({
                        ...request,
                        newSeedOpinionList: Array.from(
                            { length: 7 },
                            (_, index) => `Seed ${index}`,
                        ),
                    })
                ).success,
            ).toBe(true);
            expect(detector).toHaveBeenCalledTimes(7);
            expect(maximumActive).toBeGreaterThan(1);
            expect(maximumActive).toBeLessThanOrEqual(5);
        } finally {
            detector.mockRestore();
        }
    });

    it("uses the same content-edit entitlement policy for displaying and adding seed statements", async () => {
        const { request, conversation } = await createConversation();
        await db
            .update(conversationTable)
            .set({ requiresEventTicket: "devconnect-2025" })
            .where(eq(conversationTable.id, conversation.id));
        const editable = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: conversation.slugId,
        });
        expect(editable.success && editable.canAddSeedOpinions).toBe(true);
        expect(
            (
                await save({
                    ...request,
                    requiresEventTicket: "devconnect-2025",
                    newSeedOpinionList: ["Facilitator seed"],
                })
            ).success,
        ).toBe(true);
    });

    it("saves details without requiring new statements and rejects empty additions atomically", async () => {
        const { request, conversation } = await createConversation();
        expect(
            (await save({ ...request, conversationTitle: "Details only" }))
                .success,
        ).toBe(true);
        expect(
            await save({
                ...request,
                conversationTitle: "Invalid update",
                newSeedOpinionList: ["<p></p>"],
            }),
        ).toMatchObject({
            success: false,
            reason: "invalid_seed_opinion",
            seedOpinionFailure: { index: 0, reason: "plain_text_empty" },
        });
        const current = firstRow(
            await db
                .select({ title: conversationContentTable.title })
                .from(conversationTable)
                .innerJoin(
                    conversationContentTable,
                    eq(
                        conversationContentTable.id,
                        conversationTable.currentContentId,
                    ),
                )
                .where(eq(conversationTable.id, conversation.id)),
        );
        expect(current.title).toBe("Details only");
        expect(
            Dto.updateConversationRequest.safeParse({
                ...request,
                seedOpinions: [{ slugId: "oldseed1", content: "Changed" }],
            }).success,
        ).toBe(false);
    });

    it("appends new seeds without altering existing content or votes", async () => {
        const original = await createConversation();
        const oldSeed = await postNewOpinion({
            db,
            normalizedContent: {
                html: "<p>Existing seed</p>",
                plainText: "Existing seed",
            },
            conversationSlugId: original.conversation.slugId,
            userAgent: "test",
            now: new Date(),
            isSeed: true,
            conversationMetadata: {
                conversationId: original.conversation.id,
                conversationContentId: original.content.id,
                conversationAuthorId: OWNER,
                conversationIsIndexed: true,
                conversationParticipationMode: "account_required",
                conversationIsClosed: false,
                requiresEventTicket: null,
            },
        });
        if (!oldSeed.success) throw new Error("Failed to create fixture seed");
        const opinion = firstRow(
            await db
                .select()
                .from(opinionTable)
                .where(eq(opinionTable.slugId, oldSeed.opinionSlugId)),
        );
        if (opinion.currentContentId === null)
            throw new Error("Missing seed content");
        const vote = firstRow(
            await db
                .insert(voteTable)
                .values({ authorId: OWNER, opinionId: opinion.id })
                .returning(),
        );
        const voteContent = firstRow(
            await db
                .insert(voteContentTable)
                .values({
                    voteId: vote.id,
                    opinionContentId: opinion.currentContentId,
                    vote: "agree",
                })
                .returning(),
        );
        await db
            .update(voteTable)
            .set({ currentContentId: voteContent.id })
            .where(eq(voteTable.id, vote.id));

        const result = await save({
            ...original.request,
            newSeedOpinionList: ["<p>New <strong>seed</strong></p>"],
        });
        expect(result.success).toBe(true);
        expect(result.success && result.addedOpinions?.at(0)?.numAgrees).toBe(
            0,
        );
        expect(
            firstRow(
                await db
                    .select()
                    .from(opinionTable)
                    .where(eq(opinionTable.id, opinion.id)),
            ),
        ).toEqual(opinion);
        expect(
            firstRow(
                await db
                    .select()
                    .from(voteTable)
                    .where(eq(voteTable.id, vote.id)),
            ).currentContentId,
        ).toBe(voteContent.id);
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(voteTable)
                    .where(eq(voteTable.opinionId, opinion.id)),
            ).count,
        ).toBe(1);
        const edit = await getConversationForEdit({
            db,
            userId: OWNER,
            conversationSlugId: original.conversation.slugId,
        });
        expect(
            edit.success && edit.seedOpinions.map((seed) => seed.content),
        ).toEqual(["<p>Existing seed</p>", "<p>New <strong>seed</strong></p>"]);
        expect(
            firstRow(
                await db
                    .select()
                    .from(opinionContentTable)
                    .where(
                        eq(opinionContentTable.id, opinion.currentContentId),
                    ),
            ).content,
        ).toBe("<p>Existing seed</p>");
    });

    it("rejects duplicate concurrent saves without inserting twice", async () => {
        const { request, conversation } = await createConversation();
        const results = await Promise.all([
            save({ ...request, newSeedOpinionList: ["One seed"] }),
            save({ ...request, newSeedOpinionList: ["<p>ONE SEED</p>"] }),
        ]);
        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(results.find((result) => !result.success)).toMatchObject({
            reason: "invalid_seed_opinion",
            seedOpinionFailure: { index: 0, reason: "duplicate" },
        });
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(opinionTable)
                    .where(eq(opinionTable.conversationId, conversation.id)),
            ).count,
        ).toBe(1);
    });

    it("rolls back details and every new statement when later work fails", async () => {
        const { request, conversation, content } = await createConversation();
        const translationFailure = vi
            .spyOn(
                translations,
                "createEagerContentTranslationWorkForKnownConversation",
            )
            .mockRejectedValueOnce(new Error("translation unavailable"));
        try {
            await expect(
                save({
                    ...request,
                    conversationTitle: "Changed title",
                    newSeedOpinionList: ["First seed", "Second seed"],
                }),
            ).rejects.toThrow("translation unavailable");
        } finally {
            translationFailure.mockRestore();
        }
        expect(
            firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversation.id)),
            ).currentContentId,
        ).toBe(content.id);
        expect(
            firstRow(
                await db
                    .select({ count: count() })
                    .from(opinionTable)
                    .where(eq(opinionTable.conversationId, conversation.id)),
            ).count,
        ).toBe(0);
    });

    it("allows additions to closed conversations without reopening them", async () => {
        const { request, conversation } = await createConversation({
            closed: true,
        });
        expect(
            (
                await save({
                    ...request,
                    newSeedOpinionList: ["Prepared for later"],
                })
            ).success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(conversationTable)
                    .where(eq(conversationTable.id, conversation.id)),
            ).isClosed,
        ).toBe(true);
    });

    it("enforces editor permissions and locking", async () => {
        const { request, conversation } = await createConversation();
        expect(
            await updateConversation({
                db,
                userId: STRANGER,
                data: { ...request, newSeedOpinionList: ["Unauthorized"] },
            }),
        ).toMatchObject({ success: false, reason: "not_author" });
        await db.insert(conversationModerationTable).values({
            conversationId: conversation.id,
            authorId: OWNER,
            moderationAction: "lock",
            moderationReason: "spam",
        });
        expect(
            await save({ ...request, newSeedOpinionList: ["Locked"] }),
        ).toMatchObject({ success: false, reason: "conversation_locked" });
    });

    it("adds manual ranking seeds and preserves source-managed lists", async () => {
        const manual = await createConversation({ ranking: true });
        expect(
            (
                await save({
                    ...manual.request,
                    newSeedOpinionList: ["First item", "Second item"],
                })
            ).success,
        ).toBe(true);
        expect(
            firstRow(
                await db
                    .select()
                    .from(rankingConversationConfigTable)
                    .where(
                        eq(rankingConversationConfigTable.id, manual.config.id),
                    ),
            ).itemCount,
        ).toBe(2);
        expect(
            await db
                .select({ isSeed: rankingItemTable.isSeed })
                .from(rankingItemTable)
                .where(
                    eq(rankingItemTable.conversationId, manual.conversation.id),
                ),
        ).toEqual([{ isSeed: true }, { isSeed: true }]);
        const linked = await createConversation({
            ranking: true,
            sourceManaged: true,
        });
        expect(
            await save({
                ...linked.request,
                newSeedOpinionList: ["Manual item"],
            }),
        ).toMatchObject({
            success: false,
            reason: "seed_opinions_not_allowed",
        });
    });
});
