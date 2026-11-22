import { randomUUID } from "node:crypto";
import { Script } from "@valkey/valkey-glide";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as schema from "../src/shared-backend/schema.js";
import { gatheringCreation } from "../src/shared/gathering.js";
import { Dto } from "../src/shared/types/dto.js";
import * as gathering from "../src/service/gathering.js";
import { fetchGatheringDisplayCounts } from "../src/service/gatheringDisplayCounts.js";
import { insertInitialGatheringResponses } from "../src/service/gatheringPersistence.js";
import { zodSSEConversationSettingsUpdatedData } from "../src/shared/types/sse.js";
import { getConversationForEdit } from "../src/service/postEdit.js";
import { buildConversationEmailParticipationQuery } from "../src/shared-backend/conversationEmailUpdateParticipation.js";
import { mergeGuestIntoVerifiedUser } from "../src/service/merge.js";
import { selectFeedCandidates } from "../src/service/feedSelection.js";
import {
    createNewPost,
    closeConversation,
    openConversation,
    fetchPostBySlugId,
} from "../src/service/post.js";
import { applyAccountLiveInputChange } from "../src/service/accountLiveInputs.js";
import { lockAccountConversations } from "../src/shared-backend/accountContributions.js";
import type { VoteBuffer } from "../src/service/voteBuffer.js";
import { requestGatheringContentTranslation } from "../src/service/gatheringTranslation.js";
import { createEagerGatheringTranslationWork } from "../src/service/gatheringTranslationScheduling.js";
import type { ContentDisplayRequest } from "../src/service/displayContent.js";

function first<T>(rows: T[]): T {
    const value = rows.at(0);
    if (value === undefined) throw new Error("Missing Gathering fixture");
    return value;
}
function barrier() {
    let resolve = () => {};
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("Gathering backend", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "gathering_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "gathering_test",
        };
        client = postgres({
            ...connection,
            max: 12,
            onnotice: () => undefined,
        });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (
                await pushSchema(schema, drizzlePg({ client: pool }))
            ).apply();
        } finally {
            await pool.end();
        }
    }, 120_000);
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function identity() {
        const userId = randomUUID();
        const didWrite = `did:key:gathering-${userId}`;
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: userId.slice(0, 20) });
        await db.insert(schema.deviceTable).values({
            userId,
            didWrite,
            userAgent: "Gathering test",
            sessionExpiry: new Date("2100-01-01"),
        });
        return { userId, didWrite };
    }
    const field = () => ({
        fieldId: randomUUID(),
        label: "Proposal",
        required: true,
        characterLimit: 500,
    });
    async function create({
        actor,
        input,
        database = db,
        translationEnabled = false,
    }: {
        actor: Awaited<ReturnType<typeof identity>>;
        input: z.input<typeof gatheringCreation>;
        database?: PostgresJsDatabase;
        translationEnabled?: boolean;
    }) {
        const request = Dto.createNewConversationRequest.parse({
            conversationType: "gathering",
            conversationTitle: "Gathering test",
            participationMode: "guest",
            isIndexed: true,
            multilingualSetting: {
                additionalLanguageCodes: translationEnabled ? ["fr"] : [],
                dynamicTranslationEnabled: translationEnabled,
            },
            languageSettingsSource: "conversation_override",
            gathering: input,
        });
        const created = await createNewPost({
            db: database,
            request,
            normalizedRichText: { body: undefined, seedOpinions: [] },
            authorId: actor.userId,
            autoProvisionedDefaultLanguage: "en",
            isImporting: false,
            valkey: undefined,
        });
        if (!created.success) throw new Error("Gathering creation rejected");
        const conversationSlugId = created.conversationSlugId;
        const config = await gathering.loadGathering({
            db: database,
            didWrite: actor.didWrite,
            conversationSlugId,
        });
        const answer = (value: string) => [
            { fieldId: first(config.responseFormat).fieldId, value },
        ];
        return { actor, conversationSlugId, config, answer };
    }
    async function fixture({
        visibility = "everyone",
        allowNewResponses = true,
        translationEnabled = false,
    }: {
        visibility?: "everyone" | "facilitators";
        allowNewResponses?: boolean;
        translationEnabled?: boolean;
    } = {}) {
        return await create({
            actor: await identity(),
            translationEnabled,
            input: {
                gatheringMode: "new",
                responseVisibility: visibility,
                allowNewResponses,
                responseFormat: [field()],
            },
        });
    }
    async function save({
        f,
        actor,
        change,
    }: {
        f: Awaited<ReturnType<typeof fixture>>;
        actor: Awaited<ReturnType<typeof identity>>;
        change: z.infer<typeof Dto.gatheringSaveRequest>["change"];
    }) {
        return await gathering.saveGatheringResponse({
            db,
            didWrite: actor.didWrite,
            request: { conversationSlugId: f.conversationSlugId, change },
            userAgent: "Gathering test",
            currentDisplayLanguage: "en",
        });
    }
    async function list({
        f,
        actor,
        view = "active",
    }: {
        f: Awaited<ReturnType<typeof fixture>>;
        actor?: Awaited<ReturnType<typeof identity>>;
        view?: "active" | "own" | "moderation";
    }) {
        return await gathering.listGatheringResponses({
            db,
            didWrite: actor?.didWrite,
            request: {
                conversationSlugId: f.conversationSlugId,
                view,
                limit: 30,
            },
        });
    }

    const frenchDisplay: ContentDisplayRequest = {
        kind: "localized",
        displayLanguage: "fr",
        spokenLanguages: ["fr"],
    };

    it("translates frozen labels and exact response versions without changing editable answers", async () => {
        const f = await fixture({ translationEnabled: true });
        const response = await save({
            f,
            actor: f.actor,
            change: { action: "submit", answers: f.answer("Original answer") },
        });
        const read = () =>
            gathering.readGatheringResponse({
                db,
                didWrite: f.actor.didWrite,
                displayPreferences: frenchDisplay,
                request: {
                    conversationSlugId: f.conversationSlugId,
                    responseSlugId: response.responseSlugId,
                },
            });
        expect((await read()).displayContent).toMatchObject({
            mode: "original",
            translationControl: { status: "pending" },
        });
        const fieldId = first(f.config.responseFormat).fieldId;
        const content = first(
            await db
                .select()
                .from(schema.gatheringResponseContentTable)
                .where(
                    eq(
                        schema.gatheringResponseContentTable.publicId,
                        response.sourceVersion,
                    ),
                ),
        );
        const expandedTranslation = "Une réponse traduite ".repeat(50);
        await db.insert(schema.gatheringFieldTranslationTable).values({
            fieldId,
            displayLanguageCode: "fr",
            translatedLabel: "Proposition",
            sourceLanguageCode: "en",
        });
        await db.insert(schema.gatheringAnswerTranslationTable).values({
            contentId: content.id,
            fieldId,
            displayLanguageCode: "fr",
            translatedValue: expandedTranslation,
            sourceLanguageCode: "en",
        });
        const loaded = await gathering.loadGathering({
            db,
            didWrite: f.actor.didWrite,
            conversationSlugId: f.conversationSlugId,
            displayPreferences: frenchDisplay,
        });
        expect(loaded.fieldDisplayContent).toMatchObject([
            {
                fieldId,
                displayContent: {
                    sourceVersion: fieldId,
                    mode: "translated",
                    content: { text: "Proposition" },
                },
            },
        ]);
        const translated = await read();
        expect(Dto.gatheringResponse.parse(translated)).toEqual(translated);
        expect(translated.answers).toEqual(f.answer("Original answer"));
        expect(translated.displayContent).toMatchObject({
            sourceVersion: response.sourceVersion,
            mode: "translated",
            content: { answers: [{ fieldId, value: expandedTranslation }] },
        });
        const edited = await save({
            f,
            actor: f.actor,
            change: {
                action: "edit",
                responseSlugId: response.responseSlugId,
                sourceVersion: response.sourceVersion,
                answers: f.answer("Edited original"),
            },
        });
        expect(edited.sourceVersion).not.toBe(response.sourceVersion);
        expect((await read()).displayContent).toMatchObject({
            sourceVersion: edited.sourceVersion,
            mode: "original",
            content: { answers: f.answer("Edited original") },
        });
        const history = await gathering.readGatheringResponseHistory({
            db,
            didWrite: f.actor.didWrite,
            displayPreferences: frenchDisplay,
            request: {
                conversationSlugId: f.conversationSlugId,
                responseSlugId: response.responseSlugId,
                limit: 50,
            },
        });
        expect(
            history.find(
                ({ sourceVersion }) => sourceVersion === response.sourceVersion,
            )?.displayContent,
        ).toMatchObject({
            mode: "translated",
            content: { answers: [{ fieldId, value: expandedTranslation }] },
        });
        await db
            .update(schema.conversationTable)
            .set({ dynamicTranslationEnabled: false })
            .where(eq(schema.conversationTable.slugId, f.conversationSlugId));
        const afterDisable = await gathering.readGatheringResponseHistory({
            db,
            didWrite: f.actor.didWrite,
            displayPreferences: frenchDisplay,
            request: {
                conversationSlugId: f.conversationSlugId,
                responseSlugId: response.responseSlugId,
                limit: 50,
            },
        });
        expect(
            afterDisable.every(
                ({ displayContent }) =>
                    displayContent.status === "available" &&
                    displayContent.mode === "original" &&
                    displayContent.translationControl === null,
            ),
        ).toBe(true);
    });

    it("never queues private response text and reuses current private-access authorization", async () => {
        const f = await fixture({
            visibility: "facilitators",
            translationEnabled: true,
        });
        const response = await save({
            f,
            actor: f.actor,
            change: { action: "submit", answers: f.answer("Private answer") },
        });
        const beforeQueueTranslationWork = vi.fn();
        const params = {
            db,
            valkey: undefined,
            queueScript: new Script("return 0"),
            now: new Date(),
            log: { info: vi.fn(), error: vi.fn() },
            didWrite: f.actor.didWrite,
            subject: {
                kind: "gathering_response" as const,
                conversationSlugId: f.conversationSlugId,
                responseSlugId: response.responseSlugId,
                sourceVersion: response.sourceVersion,
            },
            targetLanguageCode: "fr" as const,
            requestMode: "queue_if_missing" as const,
            beforeQueueTranslationWork,
        };
        const own = await requestGatheringContentTranslation(params);
        expect(own?.content).toMatchObject({ kind: "original_only" });
        expect(beforeQueueTranslationWork).not.toHaveBeenCalled();
        const content = first(
            await db
                .select()
                .from(schema.gatheringResponseContentTable)
                .where(
                    eq(
                        schema.gatheringResponseContentTable.publicId,
                        response.sourceVersion,
                    ),
                ),
        );
        expect(
            await db
                .select()
                .from(schema.contentTranslationWorkTable)
                .where(
                    eq(
                        schema.contentTranslationWorkTable
                            .gatheringResponseContentId,
                        content.id,
                    ),
                ),
        ).toEqual([]);
        const stranger = await identity();
        expect(
            await requestGatheringContentTranslation({
                ...params,
                didWrite: stranger.didWrite,
            }),
        ).toBeUndefined();
        expect(beforeQueueTranslationWork).not.toHaveBeenCalled();
    });

    it("does rate-limit I/O outside lifecycle locks and rechecks revocation before queueing", async () => {
        const f = await fixture();
        const response = await save({
            f,
            actor: f.actor,
            change: { action: "submit", answers: f.answer("Public answer") },
        });
        const conversation = first(
            await db
                .update(schema.conversationTable)
                .set({
                    dynamicTranslationEnabled: true,
                })
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                )
                .returning(),
        );
        await db
            .insert(schema.conversationTranslationTargetLanguageTable)
            .values({
                conversationId: conversation.id,
                languageCode: "fr",
            });
        const beforeQueueTranslationWork = vi.fn(async () => {
            await db.transaction(async (tx) => {
                await tx.execute(sql`SET LOCAL lock_timeout = '500ms'`);
                await tx
                    .update(schema.conversationTable)
                    .set({ dynamicTranslationEnabled: false })
                    .where(eq(schema.conversationTable.id, conversation.id));
            });
        });
        const result = await requestGatheringContentTranslation({
            db,
            didWrite: f.actor.didWrite,
            valkey: undefined,
            queueScript: new Script("return 0"),
            now: new Date(),
            log: { info: vi.fn(), error: vi.fn() },
            targetLanguageCode: "fr",
            requestMode: "queue_if_missing",
            beforeQueueTranslationWork,
            subject: {
                kind: "gathering_response",
                conversationSlugId: f.conversationSlugId,
                responseSlugId: response.responseSlugId,
                sourceVersion: response.sourceVersion,
            },
        });
        expect(beforeQueueTranslationWork).toHaveBeenCalledOnce();
        expect(result?.content.kind).toBe("original_only");
        const contents = db
            .select({ id: schema.gatheringResponseContentTable.id })
            .from(schema.gatheringResponseContentTable)
            .where(
                eq(
                    schema.gatheringResponseContentTable.publicId,
                    response.sourceVersion,
                ),
            );
        expect(
            await db
                .select()
                .from(schema.contentTranslationWorkTable)
                .where(
                    inArray(
                        schema.contentTranslationWorkTable
                            .gatheringResponseContentId,
                        contents,
                    ),
                ),
        ).toEqual([]);
    });

    it("schedules more than one source page without selecting response text or duplicating work", async () => {
        const f = await fixture({ translationEnabled: true });
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        if (conversation.gatheringConfigId === null)
            throw new Error("Missing Gathering config");
        const configId = conversation.gatheringConfigId;
        const queries: string[] = [];
        const instrumented = drizzle({
            client,
            logger: {
                logQuery: (query) => {
                    queries.push(query);
                },
            },
        });
        await instrumented.transaction(async (tx) => {
            await insertInitialGatheringResponses({
                tx,
                conversationId: conversation.id,
                configId,
                responses: Array.from({ length: 501 }, (_, index) => ({
                    owner: { isSeed: true, authorId: null },
                    answers: f.answer(`Seed ${String(index)}`),
                    source: undefined,
                })),
            });
        });
        queries.length = 0;
        const workIds = await instrumented.transaction(
            async (tx) =>
                await createEagerGatheringTranslationWork({
                    tx,
                    conversationSlugId: f.conversationSlugId,
                    now: new Date(),
                    scope: { kind: "conversation" },
                }),
        );
        expect(workIds.length).toBeGreaterThanOrEqual(501);
        expect(
            queries.filter((query) =>
                /insert into "content_translation_work"/u.test(query),
            ).length,
        ).toBeGreaterThan(1);
        expect(queries.some((query) => /select .*"value"/u.test(query))).toBe(
            false,
        );
        expect(
            queries.some((query) => /select .*"translated_value"/u.test(query)),
        ).toBe(false);
        expect(
            await db.transaction(
                async (tx) =>
                    await createEagerGatheringTranslationWork({
                        tx,
                        conversationSlugId: f.conversationSlugId,
                        now: new Date(),
                        scope: { kind: "conversation" },
                    }),
            ),
        ).toEqual([]);
    });

    it("creates real Gathering conversations and rejects a seventh SQL field", async () => {
        const f = await fixture();
        expect(f.config.gatheringMode).toBe("new");
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        const configId = conversation.gatheringConfigId;
        if (configId === null) throw new Error("Missing Gathering config");
        await expect(
            db.insert(schema.gatheringFieldTable).values({
                configId,
                position: 7,
                label: "Overflow",
                required: false,
                characterLimit: 100,
            }),
        ).rejects.toThrow();
        expect(conversation.polisConfigId).toBeNull();
        expect(conversation.rankingConfigId).toBeNull();
        expect(conversation.creditVotingConfigId).toBeNull();
    });
    it("checks current ownership and private counts in one statement", async () => {
        const source = await fixture({ visibility: "facilitators" });
        const destination = await fixture();
        await save({
            f: source,
            actor: await identity(),
            change: { action: "submit", answers: source.answer("Private") },
        });
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(
                        schema.conversationTable.slugId,
                        source.conversationSlugId,
                    ),
                ),
        );
        const destinationConversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(
                        schema.conversationTable.slugId,
                        destination.conversationSlugId,
                    ),
                ),
        );
        const queries: string[] = [];
        const instrumented = drizzle({
            client,
            logger: {
                logQuery: (query) => {
                    queries.push(query);
                },
            },
        });
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db: instrumented,
                    conversationIds: [conversation.id],
                    userId: source.actor.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 1, participantCount: 1 });
        expect(queries).toHaveLength(1);
        await db
            .update(schema.conversationTable)
            .set({ projectId: destinationConversation.projectId })
            .where(eq(schema.conversationTable.id, conversation.id));
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: source.actor.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 0, participantCount: 0 });
        expect(
            (await list({ f: source, actor: source.actor })).responses,
        ).toHaveLength(0);
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: destination.actor.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 1, participantCount: 1 });
        await db
            .update(schema.organizationMembershipTable)
            .set({ deletedAt: new Date() })
            .where(
                eq(
                    schema.organizationMembershipTable.userId,
                    destination.actor.userId,
                ),
            );
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: destination.actor.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 0, participantCount: 0 });
    });
    it("does not disclose private counts to a restricted facilitator", async () => {
        const f = await fixture({ visibility: "facilitators" });
        await save({
            f,
            actor: await identity(),
            change: { action: "submit", answers: f.answer("Private") },
        });
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        await db
            .update(schema.userTable)
            .set({
                authRestrictedAt: new Date(),
                authRestrictionReason: "test restriction",
            })
            .where(eq(schema.userTable.id, f.actor.userId));
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: f.actor.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 0, participantCount: 0 });
    });
    it("persists 1,000 initial seeds in four statements without mixing their answers", async () => {
        const f = await fixture();
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        if (conversation.gatheringConfigId === null)
            throw new Error("Missing Gathering config");
        const configId = conversation.gatheringConfigId;
        const queries: string[] = [];
        const instrumented = drizzle({
            client,
            logger: {
                logQuery: (query) => {
                    queries.push(query);
                },
            },
        });
        await instrumented.transaction(async (tx) => {
            await insertInitialGatheringResponses({
                tx,
                conversationId: conversation.id,
                configId,
                responses: Array.from({ length: 1_000 }, (_, index) => ({
                    owner: { isSeed: true, authorId: null },
                    answers: f.answer(`Seed ${String(index)}`),
                    source: undefined,
                })),
            });
        });
        expect(
            queries.filter((query) => /^(insert|update) /i.test(query)),
        ).toHaveLength(4);
        const values = await db
            .select({ value: schema.gatheringAnswerTable.value })
            .from(schema.gatheringAnswerTable)
            .where(eq(schema.gatheringAnswerTable.configId, configId));
        expect(new Set(values.map((answer) => answer.value)).size).toBe(1_000);
        const page = await list({ f });
        expect(page.accessibleCount).toBe(1_000);
        expect(page.participantResponseCount).toBe(0);
        expect(
            page.responses.every(
                (response) =>
                    response.isSeed && response.baseline === undefined,
            ),
        ).toBe(true);
    });
    it("hydrates metadata and both feed orders without requiring numerical analysis snapshots", async () => {
        const f = await fixture({ visibility: "facilitators" });
        await db
            .update(schema.projectTable)
            .set({ directoryVisibility: "listed" })
            .from(schema.conversationTable)
            .where(
                and(
                    eq(
                        schema.projectTable.id,
                        schema.conversationTable.projectId,
                    ),
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
            );
        await save({
            f,
            actor: await identity(),
            change: { action: "submit", answers: f.answer("Private") },
        });
        const loaded = await fetchPostBySlugId({
            db,
            conversationSlugId: f.conversationSlugId,
            baseImageServiceUrl: "https://images.example.test",
        });
        expect(loaded.metadata).toMatchObject({
            conversationType: "gathering",
            responseCount: 0,
            participantCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
        });
        expect(loaded.metadata.conversationViewSnapshotId).toBeUndefined();
        const facilitator = await fetchPostBySlugId({
            db,
            conversationSlugId: f.conversationSlugId,
            personalizedUserId: f.actor.userId,
            baseImageServiceUrl: "https://images.example.test",
        });
        expect(facilitator.metadata).toMatchObject({
            responseCount: 1,
            participantCount: 1,
        });
        for (const sortAlgorithm of ["new", "following"]) {
            const feed = await selectFeedCandidates({
                db,
                viewerId: undefined,
                purpose: "head",
                request: Dto.fetchFeedRequest.parse({
                    sortAlgorithm,
                    cursor: null,
                }),
            });
            expect(
                feed.rows.some((row) => row.slugId === f.conversationSlugId),
            ).toBe(true);
        }
    });
    it("allows concurrent readers while preserving the lifecycle lock boundary", async () => {
        const f = await fixture();
        await db.transaction(async (firstReader) => {
            await firstReader
                .select({ id: schema.conversationTable.id })
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                )
                .for("share");
            await db.transaction(async (secondReader) => {
                await secondReader.execute(
                    sql`set local lock_timeout = '500ms'`,
                );
                const loaded = await gathering.loadGathering({
                    db: secondReader,
                    didWrite: undefined,
                    conversationSlugId: f.conversationSlugId,
                });
                expect(loaded.isClosed).toBe(false);
            });
        });
    });
    it("does not advertise legacy seed-opinion editing and emits the changed admission setting", async () => {
        const f = await fixture();
        const edit = await getConversationForEdit({
            db,
            conversationSlugId: f.conversationSlugId,
            userId: f.actor.userId,
        });
        expect(edit.success).toBe(true);
        if (!edit.success) throw new Error("Missing Gathering editor");
        expect(edit.canAddSeedOpinions).toBe(false);
        await gathering.updateGatheringSettings({
            db,
            didWrite: f.actor.didWrite,
            request: {
                conversationSlugId: f.conversationSlugId,
                allowNewResponses: false,
            },
        });
        const events = await db
            .select({ payload: schema.realtimeEventOutboxTable.payload })
            .from(schema.realtimeEventOutboxTable)
            .where(
                eq(
                    schema.realtimeEventOutboxTable.eventType,
                    "conversation_settings_updated",
                ),
            );
        const event = events
            .map((row) =>
                zodSSEConversationSettingsUpdatedData.parse(row.payload),
            )
            .find((row) => row.conversationSlugId === f.conversationSlugId);
        expect(event?.settings.gathering).toEqual({ allowNewResponses: false });
    });
    it("paginates immutable history by a version owned by the requested response", async () => {
        const f = await fixture();
        const actor = await identity();
        const original = await save({
            f,
            actor,
            change: { action: "submit", answers: f.answer("First") },
        });
        const edited = await save({
            f,
            actor,
            change: {
                action: "edit",
                responseSlugId: original.responseSlugId,
                sourceVersion: original.sourceVersion,
                answers: f.answer("Second"),
            },
        });
        const request = {
            conversationSlugId: f.conversationSlugId,
            responseSlugId: original.responseSlugId,
        };
        expect(
            (
                await gathering.readGatheringResponse({
                    db,
                    didWrite: actor.didWrite,
                    request,
                })
            ).sourceVersion,
        ).toBe(edited.sourceVersion);
        const page = await gathering.readGatheringResponseHistory({
            db,
            didWrite: actor.didWrite,
            request: { ...request, limit: 1 },
        });
        expect(page.map((response) => response.sourceVersion)).toEqual([
            edited.sourceVersion,
        ]);
        const next = await gathering.readGatheringResponseHistory({
            db,
            didWrite: actor.didWrite,
            request: {
                ...request,
                limit: 1,
                beforeSourceVersion: edited.sourceVersion,
            },
        });
        expect(next.map((response) => response.sourceVersion)).toEqual([
            original.sourceVersion,
        ]);
        const other = await save({
            f,
            actor: await identity(),
            change: { action: "submit", answers: f.answer("Other") },
        });
        await expect(
            gathering.readGatheringResponseHistory({
                db,
                didWrite: actor.didWrite,
                request: {
                    ...request,
                    limit: 1,
                    beforeSourceVersion: other.sourceVersion,
                },
            }),
        ).rejects.toThrow("Version not found");
    });
    it("serializes simultaneous submissions and retains immutable, conflict-aware versions", async () => {
        const f = await fixture();
        const actor = await identity();
        const results = await Promise.allSettled(
            [1, 2].map(() =>
                save({
                    f,
                    actor,
                    change: { action: "submit", answers: f.answer("Original") },
                }),
            ),
        );
        expect(
            results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        const original = first((await list({ f, actor })).responses);
        const same = await save({
            f,
            actor,
            change: {
                action: "edit",
                responseSlugId: original.responseSlugId,
                sourceVersion: original.sourceVersion,
                answers: f.answer("Original"),
            },
        });
        expect(same.sourceVersion).toBe(original.sourceVersion);
        const edited = await save({
            f,
            actor,
            change: {
                action: "edit",
                responseSlugId: original.responseSlugId,
                sourceVersion: original.sourceVersion,
                answers: f.answer("Updated"),
            },
        });
        expect(edited.sourceVersion).not.toBe(original.sourceVersion);
        await expect(
            save({
                f,
                actor,
                change: {
                    action: "edit",
                    responseSlugId: original.responseSlugId,
                    sourceVersion: original.sourceVersion,
                    answers: f.answer("Stale"),
                },
            }),
        ).rejects.toThrow("Response changed");
        const history = await gathering.readGatheringResponseHistory({
            db,
            didWrite: actor.didWrite,
            request: {
                conversationSlugId: f.conversationSlugId,
                responseSlugId: original.responseSlugId,
                limit: 50,
            },
        });
        expect(history.map((version) => first(version.answers).value)).toEqual([
            "Updated",
            "Original",
        ]);
        await expect(
            save({
                f,
                actor: f.actor,
                change: {
                    action: "edit",
                    responseSlugId: original.responseSlugId,
                    sourceVersion: edited.sourceVersion,
                    answers: f.answer("Facilitator rewrite"),
                },
            }),
        ).rejects.toThrow();
    });
    it("supports multiple seeds without occupying or counting the facilitator's participant slot", async () => {
        const f = await fixture();
        for (const value of ["Seed A", "Seed B"])
            await save({
                f,
                actor: f.actor,
                change: { action: "seed", answers: f.answer(value) },
            });
        const own = await save({
            f,
            actor: f.actor,
            change: { action: "submit", answers: f.answer("Personal") },
        });
        const page = await list({ f });
        expect(page.responses).toHaveLength(3);
        expect(
            page.responses.filter((response) => !response.isSeed),
        ).toHaveLength(1);
        expect(page.participantResponseCount).toBe(1);
        expect(own.isOwn).toBe(true);
        await expect(
            save({
                f,
                actor: await identity(),
                change: { action: "seed", answers: f.answer("Unauthorized") },
            }),
        ).rejects.toThrow();
        await db.transaction(async (tx) => {
            await lockAccountConversations({ db: tx, userId: f.actor.userId });
            await applyAccountLiveInputChange({
                db: tx,
                userId: f.actor.userId,
                change: { type: "hide", hiddenAt: new Date() },
            });
        });
        expect((await list({ f })).responses).toHaveLength(2);
    });
    it("enforces private visibility on lists, counts, direct reads and every saved version", async () => {
        const f = await fixture({ visibility: "facilitators" });
        const actor = await identity();
        const outsider = await identity();
        const saved = await save({
            f,
            actor,
            change: { action: "submit", answers: f.answer("Private") },
        });
        expect((await list({ f, actor: outsider })).accessibleCount).toBe(0);
        expect((await list({ f })).accessibleCount).toBe(0);
        expect((await list({ f, actor: f.actor })).responses).toHaveLength(1);
        expect((await list({ f, actor, view: "own" })).responses).toHaveLength(
            1,
        );
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: outsider.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 0, participantCount: 0 });
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: f.actor.userId,
                })
            ).get(conversation.id),
        ).toEqual({ responseCount: 1, participantCount: 1 });
        await expect(
            gathering.readGatheringResponseHistory({
                db,
                didWrite: outsider.didWrite,
                request: {
                    conversationSlugId: f.conversationSlugId,
                    responseSlugId: saved.responseSlugId,
                    limit: 50,
                },
            }),
        ).rejects.toThrow("Response not found");
    });
    it("lets facilitators change admission after publication without disabling edits or seed management", async () => {
        const f = await fixture();
        const actor = await identity();
        const saved = await save({
            f,
            actor,
            change: { action: "submit", answers: f.answer("Before") },
        });
        await gathering.updateGatheringSettings({
            db,
            didWrite: f.actor.didWrite,
            request: {
                conversationSlugId: f.conversationSlugId,
                allowNewResponses: false,
            },
        });
        await expect(
            save({
                f,
                actor: await identity(),
                change: { action: "submit", answers: f.answer("Blocked") },
            }),
        ).rejects.toThrow("New responses disabled");
        await save({
            f,
            actor,
            change: {
                action: "edit",
                responseSlugId: saved.responseSlugId,
                sourceVersion: saved.sourceVersion,
                answers: f.answer("After"),
            },
        });
        await save({
            f,
            actor: f.actor,
            change: { action: "seed", answers: f.answer("Allowed seed") },
        });
        await expect(
            gathering.updateGatheringSettings({
                db,
                didWrite: actor.didWrite,
                request: {
                    conversationSlugId: f.conversationSlugId,
                    allowNewResponses: true,
                },
            }),
        ).rejects.toThrow();
    });
    it("copies selected responses exactly, preserving authorship and baseline but using independent identities", async () => {
        const source = await fixture();
        const selectedAuthor = await identity();
        const unselectedAuthor = await identity();
        const selected = await save({
            f: source,
            actor: selectedAuthor,
            change: { action: "submit", answers: source.answer("Selected") },
        });
        await save({
            f: source,
            actor: unselectedAuthor,
            change: { action: "submit", answers: source.answer("Excluded") },
        });
        const target = await create({
            actor: source.actor,
            input: {
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: source.conversationSlugId,
                selectedResponses: [
                    {
                        responseSlugId: selected.responseSlugId,
                        sourceVersion: selected.sourceVersion,
                    },
                ],
            },
        });
        expect(target.config.allowNewResponses).toBe(false);
        const copied = first(
            (await list({ f: target, actor: selectedAuthor })).responses,
        );
        expect(copied.isOwn).toBe(true);
        expect(first(copied.answers).value).toBe("Selected");
        expect(copied.responseSlugId).not.toBe(selected.responseSlugId);
        expect(first(copied.answers).fieldId).not.toBe(
            first(selected.answers).fieldId,
        );
        expect(copied.baseline?.sourceVersion).toBe(copied.sourceVersion);
        await save({
            f: source,
            actor: selectedAuthor,
            change: {
                action: "edit",
                responseSlugId: selected.responseSlugId,
                sourceVersion: selected.sourceVersion,
                answers: source.answer("Source later"),
            },
        });
        expect(first((await list({ f: target })).responses).answers).toEqual(
            copied.answers,
        );
        await save({
            f: target,
            actor: selectedAuthor,
            change: {
                action: "edit",
                responseSlugId: copied.responseSlugId,
                sourceVersion: copied.sourceVersion,
                answers: target.answer("Amended"),
            },
        });
        await expect(
            save({
                f: target,
                actor: unselectedAuthor,
                change: { action: "submit", answers: target.answer("New") },
            }),
        ).rejects.toThrow();
        await gathering.updateGatheringSettings({
            db,
            didWrite: target.actor.didWrite,
            request: {
                conversationSlugId: target.conversationSlugId,
                allowNewResponses: true,
            },
        });
        for (const actor of [unselectedAuthor, await identity()]) {
            const newResponse = await save({
                f: target,
                actor,
                change: { action: "submit", answers: target.answer("New") },
            });
            expect(newResponse.baseline).toBeUndefined();
        }
        await expect(
            save({
                f: target,
                actor: selectedAuthor,
                change: { action: "submit", answers: target.answer("Second") },
            }),
        ).rejects.toThrow("Response already exists");
        expect((await list({ f: source })).responses).toHaveLength(2);
    });
    it("does not count copied baselines as email participation before an author amendment", async () => {
        const source = await fixture();
        const actor = await identity();
        const saved = await save({
            f: source,
            actor,
            change: { action: "submit", answers: source.answer("Original") },
        });
        const target = await create({
            actor: source.actor,
            input: {
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: source.conversationSlugId,
                selectedResponses: [
                    {
                        responseSlugId: saved.responseSlugId,
                        sourceVersion: saved.sourceVersion,
                    },
                ],
            },
        });
        const targetRow = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(
                        schema.conversationTable.slugId,
                        target.conversationSlugId,
                    ),
                ),
        );
        const participation = async () =>
            await buildConversationEmailParticipationQuery({
                db,
                scope: { kind: "user", userId: actor.userId },
                cutoffAt: new Date("2100-01-01"),
            });
        expect(
            (await participation()).some(
                (row) => row.conversationId === targetRow.id,
            ),
        ).toBe(false);
        const copied = first((await list({ f: target, actor })).responses);
        await save({
            f: target,
            actor,
            change: {
                action: "edit",
                responseSlugId: copied.responseSlugId,
                sourceVersion: copied.sourceVersion,
                answers: target.answer("Amended"),
            },
        });
        expect(
            (await participation()).some(
                (row) => row.conversationId === targetRow.id,
            ),
        ).toBe(true);
    });
    it("merges whole copied roots while preserving a deleted destination slot", async () => {
        const source = await fixture();
        const guest = await identity();
        const destination = await identity();
        const saved = await save({
            f: source,
            actor: guest,
            change: { action: "submit", answers: source.answer("Guest") },
        });
        const destinationResponse = await save({
            f: source,
            actor: destination,
            change: { action: "submit", answers: source.answer("Destination") },
        });
        await gathering.deleteGatheringResponse({
            db,
            didWrite: destination.didWrite,
            request: {
                conversationSlugId: source.conversationSlugId,
                responseSlugId: destinationResponse.responseSlugId,
                sourceVersion: destinationResponse.sourceVersion,
            },
        });
        const target = await create({
            actor: source.actor,
            input: {
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: source.conversationSlugId,
                selectedResponses: [
                    {
                        responseSlugId: saved.responseSlugId,
                        sourceVersion: saved.sourceVersion,
                    },
                ],
            },
        });
        await db.transaction(async (tx) => {
            await mergeGuestIntoVerifiedUser({
                db: tx,
                guestUserId: guest.userId,
                verifiedUserId: destination.userId,
                now: new Date(),
            });
        });
        expect((await list({ f: source })).responses).toHaveLength(0);
        const copied = first(
            (await list({ f: target, actor: destination })).responses,
        );
        expect(copied.isOwn).toBe(true);
        expect(copied.baseline?.answers).toEqual(copied.answers);
        await expect(
            save({
                f: source,
                actor: destination,
                change: {
                    action: "submit",
                    answers: source.answer("Replacement"),
                },
            }),
        ).rejects.toThrow("Response already exists");
    });
    it("serializes copying with account deletion and excludes unavailable authors", async () => {
        const source = await fixture();
        const actor = await identity();
        const saved = await save({
            f: source,
            actor,
            change: {
                action: "submit",
                answers: source.answer("Private author"),
            },
        });
        const locked = barrier();
        const release = barrier();
        const deletion = db.transaction(async (tx) => {
            await tx
                .select()
                .from(schema.userTable)
                .where(eq(schema.userTable.id, actor.userId))
                .for("no key update");
            locked.resolve();
            await release.promise;
            await lockAccountConversations({ db: tx, userId: actor.userId });
            await tx
                .update(schema.userTable)
                .set({ isDeleted: true })
                .where(eq(schema.userTable.id, actor.userId));
            await applyAccountLiveInputChange({
                db: tx,
                userId: actor.userId,
                change: { type: "hide", hiddenAt: new Date() },
            });
        });
        await locked.promise;
        const copying = Promise.allSettled([
            create({
                actor: source.actor,
                input: {
                    gatheringMode: "amend",
                    responseVisibility: "everyone",
                    sourceConversationSlugId: source.conversationSlugId,
                    selectedResponses: [
                        {
                            responseSlugId: saved.responseSlugId,
                            sourceVersion: saved.sourceVersion,
                        },
                    ],
                },
            }),
        ]);
        release.resolve();
        await deletion;
        expect(first(await copying).status).toBe("rejected");
        expect((await list({ f: source })).accessibleCount).toBe(0);
    });
    it("includes copies committed just before account deletion in the complete hiding scope", async () => {
        const source = await fixture();
        const actor = await identity();
        const saved = await save({
            f: source,
            actor,
            change: {
                action: "submit",
                answers: source.answer("Copied before deletion"),
            },
        });
        const populated = barrier();
        const release = barrier();
        const copying = db.transaction(async (tx) => {
            const target = await create({
                database: tx,
                actor: source.actor,
                input: {
                    gatheringMode: "amend",
                    responseVisibility: "everyone",
                    sourceConversationSlugId: source.conversationSlugId,
                    selectedResponses: [
                        {
                            responseSlugId: saved.responseSlugId,
                            sourceVersion: saved.sourceVersion,
                        },
                    ],
                },
            });
            populated.resolve();
            await release.promise;
            return target;
        });
        await populated.promise;
        const deleting = db.transaction(async (tx) => {
            await tx
                .select()
                .from(schema.userTable)
                .where(eq(schema.userTable.id, actor.userId))
                .for("no key update");
            await lockAccountConversations({ db: tx, userId: actor.userId });
            await tx
                .update(schema.userTable)
                .set({ isDeleted: true })
                .where(eq(schema.userTable.id, actor.userId));
            await applyAccountLiveInputChange({
                db: tx,
                userId: actor.userId,
                change: { type: "hide", hiddenAt: new Date() },
            });
        });
        release.resolve();
        const target = await copying;
        await deleting;
        expect((await list({ f: source })).responses).toHaveLength(0);
        expect((await list({ f: target })).responses).toHaveLength(0);
    });
    it("returns no protected counts for deleted parents", async () => {
        const f = await fixture();
        await save({
            f,
            actor: await identity(),
            change: {
                action: "submit",
                answers: f.answer("Hidden with parent"),
            },
        });
        const conversation = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        await db
            .update(schema.conversationTable)
            .set({ deletedAt: new Date(), currentContentId: null })
            .where(eq(schema.conversationTable.id, conversation.id));
        expect(
            (
                await fetchGatheringDisplayCounts({
                    db,
                    conversationIds: [conversation.id],
                    userId: f.actor.userId,
                })
            ).has(conversation.id),
        ).toBe(false);
    });
    it("rejects stale amendment selections, private-to-public copying and participant text replacements", async () => {
        const source = await fixture({ visibility: "facilitators" });
        const saved = await save({
            f: source,
            actor: await identity(),
            change: { action: "submit", answers: source.answer("Private") },
        });
        await expect(
            create({
                actor: source.actor,
                input: {
                    gatheringMode: "amend",
                    responseVisibility: "everyone",
                    sourceConversationSlugId: source.conversationSlugId,
                    selectedResponses: [
                        {
                            responseSlugId: saved.responseSlugId,
                            sourceVersion: saved.sourceVersion,
                        },
                    ],
                },
            }),
        ).rejects.toThrow("Private source responses");
        await expect(
            create({
                actor: source.actor,
                input: {
                    gatheringMode: "amend",
                    responseVisibility: "facilitators",
                    sourceConversationSlugId: source.conversationSlugId,
                    selectedResponses: [
                        {
                            responseSlugId: saved.responseSlugId,
                            sourceVersion: randomUUID(),
                        },
                    ],
                },
            }),
        ).rejects.toThrow("Source response changed");
    });
    it("preserves copied seed management while new amendment seeds have no baseline", async () => {
        const source = await fixture();
        const seed = await save({
            f: source,
            actor: source.actor,
            change: { action: "seed", answers: source.answer("Source seed") },
        });
        const target = await create({
            actor: source.actor,
            input: {
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: source.conversationSlugId,
                selectedResponses: [
                    {
                        responseSlugId: seed.responseSlugId,
                        sourceVersion: seed.sourceVersion,
                    },
                ],
                seedGatheringResponses: [source.answer("New seed")],
            },
        });
        const seeds = (await list({ f: target })).responses;
        expect(
            seeds.every((response) => response.isSeed && !response.isOwn),
        ).toBe(true);
        expect(
            seeds.filter((response) => response.baseline !== undefined),
        ).toHaveLength(1);
        expect((await list({ f: target })).participantResponseCount).toBe(0);
        const copied = first(
            seeds.filter((response) => response.baseline !== undefined),
        );
        const edited = await save({
            f: target,
            actor: target.actor,
            change: {
                action: "edit",
                responseSlugId: copied.responseSlugId,
                sourceVersion: copied.sourceVersion,
                answers: target.answer("Managed copy"),
            },
        });
        expect(first(edited.baseline?.answers ?? []).value).toBe("Source seed");
    });
    it("admits a newly registered guest and still enforces stronger target participation requirements", async () => {
        const f = await fixture();
        const didWrite = `did:key:new-gathering-${randomUUID()}`;
        await gathering.saveGatheringResponse({
            db,
            didWrite,
            userAgent: "Guest test",
            currentDisplayLanguage: "en",
            request: {
                conversationSlugId: f.conversationSlugId,
                change: { action: "submit", answers: f.answer("Guest") },
            },
        });
        const own = await gathering.listGatheringResponses({
            db,
            didWrite,
            request: {
                conversationSlugId: f.conversationSlugId,
                view: "own",
                limit: 30,
            },
        });
        expect(first(own.responses).isOwn).toBe(true);
        await db
            .update(schema.conversationTable)
            .set({ participationMode: "account_required" })
            .where(eq(schema.conversationTable.slugId, f.conversationSlugId));
        await expect(
            save({
                f,
                actor: await identity(),
                change: {
                    action: "submit",
                    answers: f.answer("Blocked guest"),
                },
            }),
        ).rejects.toThrow("account_required");
        // Seeding is an organizer operation, not participant admission.
        await save({
            f,
            actor: f.actor,
            change: { action: "seed", answers: f.answer("Organizer seed") },
        });
    });
    it("preserves copied text when source content is purged and clears only nullable provenance", async () => {
        const source = await fixture();
        const actor = await identity();
        const saved = await save({
            f: source,
            actor,
            change: { action: "submit", answers: source.answer("Independent") },
        });
        const target = await create({
            actor: source.actor,
            input: {
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: source.conversationSlugId,
                selectedResponses: [
                    {
                        responseSlugId: saved.responseSlugId,
                        sourceVersion: saved.sourceVersion,
                    },
                ],
            },
        });
        const original = first(
            await db
                .select()
                .from(schema.gatheringResponseTable)
                .where(
                    eq(
                        schema.gatheringResponseTable.slugId,
                        saved.responseSlugId,
                    ),
                ),
        );
        if (original.currentContentId === null)
            throw new Error("Missing original content");
        // Isolated test-only purge exercises SET NULL, not an application deletion implementation.
        await db
            .update(schema.gatheringResponseTable)
            .set({ currentContentId: null, deletedAt: new Date() })
            .where(eq(schema.gatheringResponseTable.id, original.id));
        await db
            .delete(schema.gatheringAnswerTable)
            .where(
                eq(
                    schema.gatheringAnswerTable.contentId,
                    original.currentContentId,
                ),
            );
        await db
            .delete(schema.gatheringResponseContentTable)
            .where(
                eq(
                    schema.gatheringResponseContentTable.id,
                    original.currentContentId,
                ),
            );
        const copy = first((await list({ f: target })).responses);
        const storedCopy = first(
            await db
                .select()
                .from(schema.gatheringResponseTable)
                .where(
                    eq(
                        schema.gatheringResponseTable.slugId,
                        copy.responseSlugId,
                    ),
                ),
        );
        expect(storedCopy.sourceResponseContentId).toBeNull();
        expect(first(copy.answers).value).toBe("Independent");
        expect(copy.baseline?.answers).toEqual(copy.answers);
    });
    const buffer: VoteBuffer = {
        add: vi.fn(async () => undefined),
        hasBlockingVotes: vi.fn(async () => false),
        flush: vi.fn(async () => {}),
        shutdown: vi.fn(async () => {}),
    };
    it("closes and reopens without analysis/scoring work; waiting writes recheck closure", async () => {
        const f = await fixture();
        const actor = await identity();
        const closed = barrier();
        const release = barrier();
        const closing = db.transaction(async (tx) => {
            await closeConversation({
                db: tx,
                conversationSlugId: f.conversationSlugId,
                valkey: undefined,
                voteBuffer: buffer,
            });
            closed.resolve();
            await release.promise;
        });
        await closed.promise;
        const writing = Promise.allSettled([
            save({
                f,
                actor,
                change: { action: "submit", answers: f.answer("Late") },
            }),
        ]);
        release.resolve();
        await closing;
        expect(first(await writing).status).toBe("rejected");
        expect(buffer.flush).not.toHaveBeenCalled();
        const row = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(
                    eq(schema.conversationTable.slugId, f.conversationSlugId),
                ),
        );
        expect(row.closedFinalizedAt).not.toBeNull();
        await openConversation({
            db,
            conversationSlugId: f.conversationSlugId,
            valkey: undefined,
        });
        await save({
            f,
            actor,
            change: { action: "submit", answers: f.answer("Open") },
        });
    });
    it("moderates after closure without deleting history or clearing moderation on edit", async () => {
        const f = await fixture();
        const actor = await identity();
        const saved = await save({
            f,
            actor,
            change: { action: "submit", answers: f.answer("Original") },
        });
        const request = {
            conversationSlugId: f.conversationSlugId,
            responseSlugId: saved.responseSlugId,
        };
        await gathering.moderateGatheringResponse({
            db,
            didWrite: f.actor.didWrite,
            request: { ...request, action: "move", reason: "Outside scope" },
        });
        await save({
            f,
            actor,
            change: {
                action: "edit",
                ...request,
                sourceVersion: saved.sourceVersion,
                answers: f.answer("Edited"),
            },
        });
        expect((await list({ f })).responses).toHaveLength(0);
        expect((await list({ f, view: "moderation" })).responses).toHaveLength(
            1,
        );
        await closeConversation({
            db,
            conversationSlugId: f.conversationSlugId,
            valkey: undefined,
            voteBuffer: buffer,
        });
        await gathering.moderateGatheringResponse({
            db,
            didWrite: f.actor.didWrite,
            request: { ...request, action: "restore", reason: "Restored" },
        });
        expect((await list({ f })).responses).toHaveLength(1);
        await gathering.moderateGatheringResponse({
            db,
            didWrite: f.actor.didWrite,
            request: { ...request, action: "hide", reason: "Safety" },
        });
        expect((await list({ f, actor, view: "own" })).responses).toHaveLength(
            0,
        );
        await gathering.moderateGatheringResponse({
            db,
            didWrite: f.actor.didWrite,
            request: {
                ...request,
                action: "restore",
                reason: "Safety review complete",
            },
        });
        expect((await list({ f })).responses).toHaveLength(1);
    });
    it("hides all account-owned copies, restores account-hidden roots only, and never resurrects explicitly deleted versions", async () => {
        const f = await fixture({ visibility: "facilitators" });
        const actor = await identity();
        const saved = await save({
            f,
            actor,
            change: { action: "submit", answers: f.answer("Secret") },
        });
        const target = await create({
            actor: f.actor,
            input: {
                gatheringMode: "amend",
                responseVisibility: "facilitators",
                sourceConversationSlugId: f.conversationSlugId,
                selectedResponses: [
                    {
                        responseSlugId: saved.responseSlugId,
                        sourceVersion: saved.sourceVersion,
                    },
                ],
            },
        });
        const accountChange = async (hide: boolean) =>
            await db.transaction(async (tx) => {
                await tx
                    .select()
                    .from(schema.userTable)
                    .where(eq(schema.userTable.id, actor.userId))
                    .for("update");
                await lockAccountConversations({
                    db: tx,
                    userId: actor.userId,
                });
                await applyAccountLiveInputChange({
                    db: tx,
                    userId: actor.userId,
                    change: hide
                        ? { type: "hide", hiddenAt: new Date() }
                        : { type: "restore" },
                });
            });
        await accountChange(true);
        expect((await list({ f, actor: f.actor })).responses).toHaveLength(0);
        expect(
            (await list({ f: target, actor: f.actor })).responses,
        ).toHaveLength(0);
        await accountChange(false);
        expect((await list({ f, actor })).responses).toHaveLength(1);
        await gathering.deleteGatheringResponse({
            db,
            didWrite: actor.didWrite,
            request: {
                conversationSlugId: f.conversationSlugId,
                responseSlugId: saved.responseSlugId,
                sourceVersion: saved.sourceVersion,
            },
        });
        await accountChange(true);
        await accountChange(false);
        await expect(
            gathering.readGatheringResponseHistory({
                db,
                didWrite: f.actor.didWrite,
                request: {
                    conversationSlugId: f.conversationSlugId,
                    responseSlugId: saved.responseSlugId,
                    limit: 50,
                },
            }),
        ).rejects.toThrow("Response not found");
        await expect(
            save({
                f,
                actor,
                change: { action: "submit", answers: f.answer("Replacement") },
            }),
        ).rejects.toThrow("Response already exists");
        expect(
            first(
                await db
                    .select({ value: count() })
                    .from(schema.gatheringResponseContentTable),
            ).value,
        ).toBeGreaterThan(0);
    });
});
