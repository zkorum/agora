import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { withReplicas } from "drizzle-orm/pg-core";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
    buildQvAllocationItemsQuery,
    buildQvCommandReceiptQuery,
    buildQvOwnerResponseQuery,
    buildQvSavedAllocationsQuery,
    buildQvStatementSourcesQuery,
} from "../src/service/qvQueries.js";
import * as schema from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { updateConversation } from "../src/service/postEdit.js";
import { closeConversation, openConversation } from "../src/service/post.js";
import { fetchQvResults } from "../src/service/qvResults.js";
import { resolveConversationCreateTarget } from "../src/service/projectAccess.js";
import type { VoteBuffer } from "../src/service/voteBuffer.js";
import {
    loadQvSession,
    saveQvResponse,
    withdrawQvResponse,
} from "../src/service/qvResponses.js";
import {
    mergeQvResponses,
    setQvAccountHidden,
    retireQvAccountInputs,
} from "../src/shared-backend/qvAccountLifecycle.js";
import { lockAccountConversations } from "../src/shared-backend/accountContributions.js";
import {
    normalizeQvStatementUpdate,
    prepareQvStatementUpdate,
    applyQvStatementUpdate,
} from "../src/service/qvStatements.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing QV fixture");
    return row;
}

function createBarrier() {
    let resolve = () => {};
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("QV explicit saved responses", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let recordedQueries: string[] | undefined;
    let recordedParameters: Map<string, unknown[]> | undefined;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "qv_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "qv_test",
        };
        client = postgres({
            ...connection,
            max: 12,
            onnotice: () => undefined,
        });
        db = drizzle({
            client,
            logger: {
                logQuery(query, parameters) {
                    recordedQueries?.push(query);
                    recordedParameters?.set(query, parameters);
                },
            },
        });
        const pool = new Pool(connection);
        try {
            await (await pushSchema(schema, drizzlePg({ client: pool }))).apply();
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
        const didWrite = `did:key:qv-${userId}`;
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: userId.slice(0, 20) });
        await db.insert(schema.deviceTable).values({
            userId,
            didWrite,
            userAgent: "QV test",
            sessionExpiry: new Date("2100-01-01"),
        });
        return { userId, didWrite };
    }
    async function fixture({
        allowOpposition = true,
        statementCount = 2,
    }: { allowOpposition?: boolean; statementCount?: number } = {}) {
        const actor = await identity();
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: randomUUID().slice(0, 8),
                    title: "QV tests",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const config = first(
            await db
                .insert(schema.creditVotingConfigTable)
                .values({ allowOpposition, itemCount: statementCount })
                .returning(),
        );
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    projectId: project.id,
                    conversationType: "prioritizing",
                    prioritizationType: "qv",
                    creditVotingConfigId: config.id,
                    participationMode: "guest",
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "QV test",
                    bodyPlainText: "",
                })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const statements = [];
        for (let position = 0; position < statementCount; position++) {
            const item = first(
                await db
                    .insert(schema.rankingItemTable)
                    .values({
                        conversationId: conversation.id,
                        slugId: randomUUID().slice(0, 8),
                        isSeed: true,
                        position,
                    })
                    .returning(),
            );
            const version = first(
                await db
                    .insert(schema.rankingItemContentTable)
                    .values({
                        rankingItemId: item.id,
                        conversationContentId: content.id,
                        title: `Proposal ${position}`,
                        sourceLanguageCode: "en",
                    })
                    .returning(),
            );
            await db
                .update(schema.rankingItemTable)
                .set({ currentContentId: version.id })
                .where(eq(schema.rankingItemTable.id, item.id));
            statements.push({
                itemId: item.slugId,
                sourceVersion: version.publicId,
                id: item.id,
                contentId: version.id,
            });
        }
        const allocation = {
            itemId: first(statements).itemId,
            sourceVersion: first(statements).sourceVersion,
            votes: 3,
        };
        const context = {
            db,
            didWrite: actor.didWrite,
            userAgent: "QV test",
            now: new Date(),
            currentDisplayLanguage: "en" as const,
        };
        const request = Dto.qvSaveRequest.parse({
            conversationSlugId: conversation.slugId,
            expectedViewerId: actor.userId,
            commandId: randomUUID(),
            expectedResponseRevision: 0,
            expectedStatementSetRevision: 0,
            allocations: [allocation],
        });
        const load = async (didWrite: string | undefined = actor.didWrite) =>
            await loadQvSession({
                db,
                didWrite,
                conversationSlugId: conversation.slugId,
                now: new Date(),
                displayPreferences: {
                    displayLanguage: "en",
                    targetLanguage: "en",
                    spokenLanguages: ["en"],
                    translationAllowed: false,
                },
            });
        return {
            actor,
            config,
            conversation,
            content,
            statements,
            allocation,
            context,
            request,
            load,
        };
    }

    it.each([false, true])(
        "keeps published QV rules and method fixed through Save, withdrawal and reopening (opposition=%s)",
        async (allowOpposition) => {
            const f = await fixture({ allowOpposition });
            const organization = first(
                await db
                    .insert(schema.organizationTable)
                    .values({
                        slug: randomUUID().slice(0, 8),
                        displayName: "QV editor",
                        defaultLanguageCode: "en",
                        isFullImagePath: false,
                        directoryVisibility: "listed",
                    })
                    .returning(),
            );
            const membership = first(
                await db
                    .insert(schema.organizationMembershipTable)
                    .values({
                        role: "admin",
                        organizationId: organization.id,
                        userId: f.actor.userId,
                    })
                    .returning(),
            );
            await db
                .insert(schema.organizationMembershipAllProjectCapabilityTable)
                .values({
                    organizationMembershipId: membership.id,
                    capability: "conversation_edit",
                    grantedByUserId: f.actor.userId,
                });
            await db.insert(schema.projectOrganizationOwnershipTable).values({
                projectId: f.conversation.projectId,
                organizationId: organization.id,
            });
            const request = Dto.updateConversationRequest.parse({
                conversationSlugId: f.conversation.slugId,
                conversationTitle: f.content.title,
                isIndexed: f.conversation.isIndexed,
                participationMode: f.conversation.participationMode,
                multilingualSetting: {
                    additionalLanguageCodes: [],
                    dynamicTranslationEnabled: false,
                },
                conversationTypeConfig: {
                    conversationType: "prioritizing",
                    prioritizationType: "qv",
                    creditPricing: "quadratic",
                    allowOpposition,
                },
            });
            const targets = [
                { conversationType: "polis", votingPresentation: "list" },
                {
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                    comparisonMethod: "bws",
                },
                {
                    conversationType: "prioritizing",
                    prioritizationType: "comparisons",
                    comparisonMethod: "pairwise",
                },
                {
                    conversationType: "prioritizing",
                    prioritizationType: "qv",
                    creditPricing: "quadratic",
                    allowOpposition: !allowOpposition,
                },
            ] satisfies Array<typeof request.conversationTypeConfig>;
            for (const phase of [
                "before_save",
                "saved",
                "withdrawn",
                "closed",
                "reopened",
            ]) {
                if (phase === "saved")
                    expect(
                        await saveQvResponse({
                            ...f.context,
                            request: f.request,
                        }),
                    ).toMatchObject({ success: true });
                if (phase === "withdrawn")
                    expect(
                        await withdrawQvResponse({
                            ...f.context,
                            request: {
                                conversationSlugId: f.conversation.slugId,
                                expectedViewerId: f.actor.userId,
                                commandId: randomUUID(),
                                expectedResponseRevision: 1,
                            },
                        }),
                    ).toMatchObject({ success: true });
                if (phase === "closed" || phase === "reopened")
                    await db
                        .update(schema.conversationTable)
                        .set({ isClosed: phase === "closed" })
                        .where(
                            eq(schema.conversationTable.id, f.conversation.id),
                        );
                const before = first(
                    await db
                        .select()
                        .from(schema.creditVotingConfigTable)
                        .where(
                            eq(schema.creditVotingConfigTable.id, f.config.id),
                        ),
                );
                const conversationBefore = first(
                    await db
                        .select()
                        .from(schema.conversationTable)
                        .where(
                            eq(schema.conversationTable.id, f.conversation.id),
                        ),
                );
                const contentCountBefore = first(
                    await db
                        .select({ value: count() })
                        .from(schema.conversationContentTable)
                        .where(
                            eq(
                                schema.conversationContentTable.conversationId,
                                f.conversation.id,
                            ),
                        ),
                );
                for (const target of targets)
                    expect(
                        await updateConversation({
                            db,
                            userId: f.actor.userId,
                            data: {
                                ...request,
                                conversationTitle: "Must not be saved",
                                expectedConversationTypeConfig:
                                    request.conversationTypeConfig,
                                conversationTypeConfig: target,
                            },
                        }),
                    ).toMatchObject({
                        success: false,
                        reason: "conversation_type_fixed",
                    });
                expect(
                    first(
                        await db
                            .select()
                            .from(schema.creditVotingConfigTable)
                            .where(
                                eq(
                                    schema.creditVotingConfigTable.id,
                                    f.config.id,
                                ),
                            ),
                    ),
                ).toEqual(before);
                expect(
                    first(
                        await db
                            .select()
                            .from(schema.conversationTable)
                            .where(
                                eq(
                                    schema.conversationTable.id,
                                    f.conversation.id,
                                ),
                            ),
                    ),
                ).toEqual(conversationBefore);
                expect(
                    first(
                        await db
                            .select({ value: count() })
                            .from(schema.conversationContentTable)
                            .where(
                                eq(
                                    schema.conversationContentTable
                                        .conversationId,
                                    f.conversation.id,
                                ),
                            ),
                    ),
                ).toEqual(contentCountBefore);
                expect(
                    await updateConversation({
                        db,
                        userId: f.actor.userId,
                        data: request,
                    }),
                ).toMatchObject({ success: true });
            }
        },
    );

    it("loads a coherent statement snapshot without registering participation or locking statements", async () => {
        const f = await fixture();
        const loaded = await f.load();
        expect(loaded).toMatchObject({
            statementSetRevision: 0,
            allowOpposition: true,
            isClosed: false,
            response: { revision: 0 },
        });
        expect(
            loaded.items.map((item) => item.displayContent.sourceVersion),
        ).toEqual(f.statements.map((item) => item.sourceVersion));
        expect(
            first(
                await db
                    .select()
                    .from(schema.creditVotingConfigTable)
                    .where(eq(schema.creditVotingConfigTable.id, f.config.id)),
            ).statementsLockedAt,
        ).toBeNull();
        expect(
            await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    eq(
                        schema.qvResponseTable.conversationId,
                        f.conversation.id,
                    ),
                ),
        ).toEqual([]);
    });

    it("closes QV without buffer work or a close-time manifest, and fences reopen/re-close generations", async () => {
        const f = await fixture();
        expect(
            await saveQvResponse({ ...f.context, request: f.request }),
        ).toMatchObject({ success: true });
        const buffer: VoteBuffer = {
            add: vi.fn(async () => undefined),
            hasBlockingVotes: vi.fn(async () => false),
            flush: vi.fn(async () => {}),
            shutdown: vi.fn(async () => {}),
        };
        const params = {
            db,
            conversationSlugId: f.conversation.slugId,
            valkey: undefined,
            voteBuffer: buffer,
        };
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual({ status: "open", generation: 0 });
        expect(await closeConversation(params)).toEqual({ success: true });
        expect(buffer.flush).not.toHaveBeenCalled();
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual({ status: "calculating", generation: 1 });
        expect(
            await db
                .select()
                .from(schema.qvInputSnapshotTable)
                .where(
                    eq(
                        schema.qvInputSnapshotTable.calculationId,
                        first(
                            await db
                                .select()
                                .from(schema.qvCalculationTable)
                                .where(
                                    eq(
                                        schema.qvCalculationTable
                                            .conversationId,
                                        f.conversation.id,
                                    ),
                                ),
                        ).id,
                    ),
                ),
        ).toEqual([]);
        expect(await closeConversation(params)).toEqual({
            success: false,
            reason: "already_closed",
        });
        expect(
            await saveQvResponse({
                ...f.context,
                request: {
                    ...f.request,
                    commandId: randomUUID(),
                    expectedResponseRevision: 1,
                },
            }),
        ).toMatchObject({ success: false });
        expect(await openConversation(params)).toEqual({ success: true });
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual({ status: "open", generation: 2 });
        expect(await closeConversation(params)).toEqual({ success: true });
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual({ status: "calculating", generation: 3 });
        expect(
            await db
                .select()
                .from(schema.qvCalculationTable)
                .where(
                    eq(
                        schema.qvCalculationTable.conversationId,
                        f.conversation.id,
                    ),
                ),
        ).toHaveLength(2);
    });

    it("keeps provisioning capability reads in the same write transaction", async () => {
        const actor = await identity();
        const replicaQueries: string[] = [];
        const replica = drizzle({
            client,
            logger: {
                logQuery: (query) => {
                    replicaQueries.push(query);
                },
            },
        });
        const target = await resolveConversationCreateTarget({
            db: withReplicas(db, [replica]),
            userId: actor.userId,
            postAsOrganizationSlug: undefined,
            autoProvisionedDefaultLanguage: "en",
        });
        expect(target.projectId).toBeGreaterThan(0);
        expect(replicaQueries).toEqual([]);
    });

    it("reads calculation references in a fresh snapshot after waiting for close", async () => {
        const f = await fixture();
        const closed = createBarrier();
        const release = createBarrier();
        const buffer: VoteBuffer = {
            add: vi.fn(async () => undefined),
            hasBlockingVotes: vi.fn(async () => false),
            flush: vi.fn(async () => {}),
            shutdown: vi.fn(async () => {}),
        };
        const closing = db.transaction(async (tx) => {
            await closeConversation({
                db: tx,
                conversationSlugId: f.conversation.slugId,
                valkey: undefined,
                voteBuffer: buffer,
            });
            closed.resolve();
            await release.promise;
        });
        await closed.promise;
        recordedQueries = [];
        const reading = Promise.allSettled([
            fetchQvResults({ db, conversationSlugId: f.conversation.slugId }),
        ]);
        try {
            await vi.waitFor(() =>
                expect(
                    recordedQueries?.some(
                        (query) =>
                            query.includes('from "conversation"') &&
                            query.includes("for share"),
                    ),
                ).toBe(true),
            );
        } finally {
            release.resolve();
        }
        try {
            await closing;
            expect(await reading).toEqual([
                {
                    status: "fulfilled",
                    value: { status: "calculating", generation: 1 },
                },
            ]);
            expect(
                recordedQueries.filter((query) => query.startsWith("select")),
            ).toHaveLength(2);
        } finally {
            recordedQueries = undefined;
        }
    });

    it("publishes lifecycle settings from the write boundary, not a lagging replica", async () => {
        const f = await fixture();
        const buffer: VoteBuffer = {
            add: vi.fn(async () => undefined),
            hasBlockingVotes: vi.fn(async () => false),
            flush: vi.fn(async () => {}),
            shutdown: vi.fn(async () => {}),
        };
        await db.transaction(
            async (replicaSnapshot) => {
                await replicaSnapshot
                    .select({ id: schema.conversationTable.id })
                    .from(schema.conversationTable)
                    .where(eq(schema.conversationTable.id, f.conversation.id));
                await db
                    .update(schema.conversationTable)
                    .set({
                        isIndexed: false,
                        participationMode: "email_verification",
                    })
                    .where(eq(schema.conversationTable.id, f.conversation.id));
                const params = {
                    db: withReplicas(db, [replicaSnapshot]),
                    conversationSlugId: f.conversation.slugId,
                    voteBuffer: buffer,
                    valkey: undefined,
                };
                expect(await closeConversation(params)).toEqual({
                    success: true,
                });
                expect(await openConversation(params)).toEqual({
                    success: true,
                });
            },
            { isolationLevel: "repeatable read" },
        );
        const events = await db
            .select({ payload: schema.realtimeEventOutboxTable.payload })
            .from(schema.realtimeEventOutboxTable)
            .where(
                eq(
                    schema.realtimeEventOutboxTable.eventType,
                    "conversation_settings_updated",
                ),
            );
        const settings = events
            .map(({ payload }) => payload)
            .filter(
                (payload) =>
                    z
                        .object({
                            conversationSlugId: z.literal(
                                f.conversation.slugId,
                            ),
                        })
                        .safeParse(payload).success,
            );
        expect(settings).toHaveLength(2);
        for (const payload of settings) {
            expect(payload).toMatchObject({
                settings: {
                    isIndexed: false,
                    participationMode: "email_verification",
                },
            });
        }
    });

    it("serves only the current closed aggregate and keeps its captured count independent of account hiding", async () => {
        const f = await fixture();
        await saveQvResponse({ ...f.context, request: f.request });
        await db.transaction(async (tx) => {
            await tx
                .update(schema.conversationTable)
                .set({ isClosed: true })
                .where(eq(schema.conversationTable.id, f.conversation.id));
            const work = first(
                await tx
                    .insert(schema.qvCalculationTable)
                    .values({
                        conversationId: f.conversation.id,
                        generation: 1,
                    })
                    .returning(),
            );
            const snapshot = first(
                await tx
                    .insert(schema.qvInputSnapshotTable)
                    .values({
                        calculationId: work.id,
                        creditBudget: 100,
                        creditPricing: "quadratic",
                        allowOpposition: true,
                        statementSetRevision: 0,
                        ruleVersion: 1,
                        algorithmVersion: 1,
                        participantCount: 2,
                    })
                    .returning(),
            );
            await tx.insert(schema.qvInputItemTable).values(
                f.statements.map((item, index) => ({
                    snapshotId: snapshot.id,
                    itemSlugId: item.itemId,
                    sourceVersion: item.sourceVersion,
                    position: index,
                    title: `Frozen ${index}`,
                })),
            );
            await tx.insert(schema.qvResultItemTable).values(
                f.statements.map((item) => ({
                    snapshotId: snapshot.id,
                    itemSlugId: item.itemId,
                    supportUnits: 3,
                    oppositionUnits: 1,
                    netUnits: 2,
                    supportingParticipantCount: 1,
                    opposingParticipantCount: 1,
                    rank: 1,
                })),
            );
            await tx
                .update(schema.qvCalculationTable)
                .set({
                    inputSnapshotId: snapshot.id,
                    status: "ready",
                    readyAt: new Date(),
                })
                .where(eq(schema.qvCalculationTable.id, work.id));
            await tx.insert(schema.qvCalculationStateTable).values({
                conversationId: f.conversation.id,
                generation: 1,
                currentCalculationId: work.id,
            });
        });
        const result = await fetchQvResults({
            db,
            conversationSlugId: f.conversation.slugId,
        });
        expect(result).toMatchObject({
            status: "ready",
            generation: 1,
            participantCount: 2,
            items: [
                { netUnits: 2, rank: 1 },
                { netUnits: 2, rank: 1 },
            ],
        });
        expect(Dto.qvResultsResponse.parse(result)).toEqual(result);
        if (result.status !== "ready")
            throw new Error("Expected ready QV fixture");
        await db
            .update(schema.qvCalculationStateTable)
            .set({ currentCalculationId: null })
            .where(
                eq(
                    schema.qvCalculationStateTable.conversationId,
                    f.conversation.id,
                ),
            );
        await expect(
            fetchQvResults({ db, conversationSlugId: f.conversation.slugId }),
        ).rejects.toMatchObject({ statusCode: 503 });
        await db
            .update(schema.qvCalculationStateTable)
            .set({ currentCalculationId: result.calculationId })
            .where(
                eq(
                    schema.qvCalculationStateTable.conversationId,
                    f.conversation.id,
                ),
            );
        await db.transaction(async (tx) => {
            await setQvAccountHidden({
                db: tx,
                userId: f.actor.userId,
                hiddenAt: new Date(),
            });
        });
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual(result);
        await openConversation({
            db,
            conversationSlugId: f.conversation.slugId,
            valkey: undefined,
        });
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual({ status: "open", generation: 2 });
        const buffer: VoteBuffer = {
            add: vi.fn(async () => undefined),
            hasBlockingVotes: vi.fn(async () => false),
            flush: vi.fn(async () => {}),
            shutdown: vi.fn(async () => {}),
        };
        await closeConversation({
            db,
            conversationSlugId: f.conversation.slugId,
            valkey: undefined,
            voteBuffer: buffer,
        });
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual({ status: "calculating", generation: 3 });
    });

    it("saves, replaces and withdraws explicitly, preserving immutable versions and the permanent lock", async () => {
        const f = await fixture();
        const saved = await saveQvResponse({
            ...f.context,
            request: f.request,
        });
        expect(saved).toMatchObject({
            success: true,
            response: {
                revision: 1,
                saved: { creditsSpent: 9, allocations: [f.allocation] },
            },
        });
        const replaced = await saveQvResponse({
            ...f.context,
            request: {
                ...f.request,
                commandId: randomUUID(),
                expectedResponseRevision: 1,
                allocations: [{ ...f.allocation, votes: -6 }],
            },
        });
        expect(replaced).toMatchObject({
            success: true,
            response: { revision: 2, saved: { creditsSpent: 36 } },
        });
        expect((await f.load()).response).toEqual(
            replaced.success ? replaced.response : undefined,
        );
        const withdrawn = await withdrawQvResponse({
            ...f.context,
            request: {
                conversationSlugId: f.conversation.slugId,
                commandId: randomUUID(),
                expectedResponseRevision: 2,
                expectedViewerId: f.actor.userId,
            },
        });
        expect(withdrawn).toMatchObject({
            success: true,
            response: { revision: 3 },
            loginStatus: { isKnown: true, userId: f.actor.userId },
        });
        if (withdrawn.success)
            expect(withdrawn.loginStatus).not.toHaveProperty("sessionExpiry");
        expect((await f.load()).response).toEqual({ revision: 3 });
        const versions = await db
            .select()
            .from(schema.qvResponseVersionTable)
            .where(
                eq(
                    schema.qvResponseVersionTable.conversationId,
                    f.conversation.id,
                ),
            );
        expect(versions).toHaveLength(2);
        expect(versions.every((version) => version.deletedAt === null)).toBe(
            true,
        );
        expect(
            first(
                await db
                    .select()
                    .from(schema.creditVotingConfigTable)
                    .where(eq(schema.creditVotingConfigTable.id, f.config.id)),
            ).statementsLockedAt,
        ).not.toBeNull();
    });

    it("replays an accepted receipt without replacing a newer response and refuses key reuse", async () => {
        const f = await fixture();
        const firstSave = await saveQvResponse({
            ...f.context,
            request: f.request,
        });
        const replacement = {
            ...f.request,
            commandId: randomUUID(),
            expectedResponseRevision: 1,
            allocations: [{ ...f.allocation, votes: 4 }],
        };
        const newer = await saveQvResponse({
            ...f.context,
            request: replacement,
        });
        expect(
            await saveQvResponse({ ...f.context, request: f.request }),
        ).toEqual(firstSave);
        expect((await f.load()).response).toEqual(
            newer.success ? newer.response : undefined,
        );
        expect(
            await saveQvResponse({
                ...f.context,
                request: {
                    ...f.request,
                    allocations: [{ ...f.allocation, votes: 5 }],
                },
            }),
        ).toEqual({ success: false, reason: "idempotency_conflict" });
        expect(
            await saveQvResponse({
                ...f.context,
                request: { ...f.request, commandId: randomUUID() },
            }),
        ).toEqual({ success: false, reason: "response_conflict" });
        expect(
            first(
                await db
                    .select({ value: count() })
                    .from(schema.qvStatsRefreshTable)
                    .where(
                        eq(
                            schema.qvStatsRefreshTable.conversationId,
                            f.conversation.id,
                        ),
                    ),
            ).value,
        ).toBe(2);
    });

    it("serializes simultaneous saves for one participant but admits independent participants", async () => {
        const f = await fixture();
        const same = await Promise.all([
            saveQvResponse({ ...f.context, request: f.request }),
            saveQvResponse({ ...f.context, request: f.request }),
        ]);
        expect(same[0]).toEqual(same[1]);
        const actors = await Promise.all(
            Array.from({ length: 12 }, () => identity()),
        );
        const saved = await Promise.all(
            actors.map((actor) =>
                saveQvResponse({
                    ...f.context,
                    didWrite: actor.didWrite,
                    request: {
                        ...f.request,
                        commandId: randomUUID(),
                        expectedViewerId: actor.userId,
                    },
                }),
            ),
        );
        expect(saved.every((result) => result.success)).toBe(true);
        expect(
            first(
                await db
                    .select({ count: count() })
                    .from(schema.qvResponseTable)
                    .where(
                        eq(
                            schema.qvResponseTable.conversationId,
                            f.conversation.id,
                        ),
                    ),
            ).count,
        ).toBe(13);
    });

    it("fences concurrent different commands against the same revision", async () => {
        const f = await fixture();
        const results = await Promise.all([
            saveQvResponse({ ...f.context, request: f.request }),
            saveQvResponse({
                ...f.context,
                request: {
                    ...f.request,
                    commandId: randomUUID(),
                    allocations: [{ ...f.allocation, votes: 4 }],
                },
            }),
        ]);
        expect(results.filter((r) => r.success)).toHaveLength(1);
        expect(results.filter((r) => !r.success)).toEqual([
            { success: false, reason: "response_conflict" },
        ]);
        expect((await f.load()).response.revision).toBe(1);
    });

    it("registers an unknown guest only for the explicit command and admits a sparse +7 / -6 ballot", async () => {
        const f = await fixture();
        const didWrite = `did:key:qv-new-${randomUUID()}`;
        const second = first(f.statements.slice(1));
        const saved = await saveQvResponse({
            ...f.context,
            didWrite,
            request: {
                ...f.request,
                expectedViewerId: undefined,
                allocations: [
                    { ...f.allocation, votes: 7 },
                    {
                        itemId: second.itemId,
                        sourceVersion: second.sourceVersion,
                        votes: -6,
                    },
                ],
            },
        });
        expect(saved).toMatchObject({
            success: true,
            response: { saved: { creditsSpent: 85 } },
        });
        const loaded = await f.load(didWrite);
        expect(loaded.response.saved?.allocations).toHaveLength(2);
        if (saved.success) {
            expect(saved.loginStatus).toEqual({
                isKnown: true,
                isRegistered: false,
                isLoggedIn: false,
                userId: loaded.viewerId,
                credentials: { email: null, phone: null, rarimo: null },
            });
        }
    });

    it("serializes actual statement deletion against the first accepted response", async () => {
        const f = await fixture();
        const statement = first(f.statements);
        const update = await normalizeQvStatementUpdate({
            expectedRevision: 0,
            changes: [
                {
                    action: "delete",
                    slugId: statement.itemId,
                    sourceVersion: statement.sourceVersion,
                },
            ],
        });
        const editing = db.transaction(async (tx) => {
            await tx
                .select({ id: schema.conversationTable.id })
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.id, f.conversation.id))
                .for("update");
            const prepared = await prepareQvStatementUpdate({
                db: tx,
                conversationId: f.conversation.id,
                configId: f.config.id,
                isClosed: false,
                update,
                lockConfig: true,
            });
            if (prepared.success)
                await applyQvStatementUpdate({
                    db: tx,
                    prepared,
                    conversation: {
                        id: f.conversation.id,
                        slugId: f.conversation.slugId,
                        contentId: f.content.id,
                    },
                    configId: f.config.id,
                    userId: f.actor.userId,
                    now: new Date(),
                    useGoogleLanguageDetection: false,
                    resolveLanguageMetadata: async () => {
                        throw new Error("Deletion must not detect languages");
                    },
                });
            return prepared;
        });
        const [edit, saved] = await Promise.all([
            editing,
            saveQvResponse({ ...f.context, request: f.request }),
        ]);
        if (edit.success)
            expect(saved).toEqual({
                success: false,
                reason: "statement_conflict",
            });
        else {
            expect(edit).toMatchObject({
                changeFailure: "participation_started",
            });
            expect(saved.success).toBe(true);
        }
    });

    it("seals a save wholly before close, or refuses it wholly after close", async () => {
        const f = await fixture();
        const [saved] = await Promise.all([
            saveQvResponse({ ...f.context, request: f.request }),
            db
                .update(schema.conversationTable)
                .set({ isClosed: true })
                .where(eq(schema.conversationTable.id, f.conversation.id)),
        ]);
        const loaded = await f.load();
        expect(loaded.isClosed).toBe(true);
        if (saved.success)
            expect(loaded.response.saved?.allocations).toEqual([f.allocation]);
        else {
            expect(saved.reason).toBe("conversation_closed");
            expect(loaded.response).toEqual({ revision: 0 });
        }
    });

    it.each([
        "duplicate",
        "over_budget",
        "opposition",
        "foreign_item",
        "content_version",
        "set_revision",
    ] as const)(
        "rejects %s without locking statements or persisting a response",
        async (kind) => {
            const f = await fixture({ allowOpposition: kind !== "opposition" });
            const other = first(f.statements.slice(1));
            const request = {
                ...f.request,
                allocations:
                    kind === "duplicate"
                        ? [f.allocation, f.allocation]
                        : kind === "over_budget"
                          ? [
                                { ...f.allocation, votes: 8 },
                                {
                                    itemId: other.itemId,
                                    sourceVersion: other.sourceVersion,
                                    votes: 8,
                                },
                            ]
                          : [
                                {
                                    ...f.allocation,
                                    ...(kind === "opposition"
                                        ? { votes: -1 }
                                        : kind === "foreign_item"
                                          ? { itemId: "foreign1" }
                                          : kind === "content_version"
                                            ? { sourceVersion: randomUUID() }
                                            : {}),
                                },
                            ],
                expectedStatementSetRevision: kind === "set_revision" ? 1 : 0,
            };
            expect(await saveQvResponse({ ...f.context, request })).toEqual({
                success: false,
                reason: ["duplicate", "over_budget", "opposition"].includes(
                    kind,
                )
                    ? "invalid_allocations"
                    : "statement_conflict",
            });
            expect(
                first(
                    await db
                        .select()
                        .from(schema.creditVotingConfigTable)
                        .where(
                            eq(schema.creditVotingConfigTable.id, f.config.id),
                        ),
                ).statementsLockedAt,
            ).toBeNull();
            expect(
                await db
                    .select()
                    .from(schema.qvResponseTable)
                    .where(
                        eq(
                            schema.qvResponseTable.conversationId,
                            f.conversation.id,
                        ),
                    ),
            ).toEqual([]);
        },
    );

    it.each([
        { allocations: [] },
        {
            allocations: [
                { itemId: "valid123", sourceVersion: randomUUID(), votes: 0 },
            ],
        },
        {
            allocations: [
                { itemId: "valid123", sourceVersion: randomUUID(), votes: 1.5 },
            ],
        },
    ])("refuses invalid wire allocations %j", ({ allocations }) => {
        expect(
            Dto.qvSaveRequest.safeParse({
                conversationSlugId: "valid123",
                commandId: randomUUID(),
                expectedResponseRevision: 0,
                expectedStatementSetRevision: 0,
                allocations,
            }).success,
        ).toBe(false);
    });

    it("does not expose another viewer's saved response or a logged-out registered account", async () => {
        const f = await fixture();
        await saveQvResponse({ ...f.context, request: f.request });
        const stranger = await identity();
        expect((await f.load(stranger.didWrite)).response).toEqual({
            revision: 0,
        });
        expect(
            (
                await loadQvSession({
                    db,
                    conversationSlugId: f.conversation.slugId,
                    didWrite: undefined,
                    now: new Date(),
                    displayPreferences: {
                        displayLanguage: "en",
                        targetLanguage: "en",
                        spokenLanguages: ["en"],
                        translationAllowed: false,
                    },
                })
            ).response,
        ).toEqual({ revision: 0 });
        await db.insert(schema.emailTable).values({
            userId: f.actor.userId,
            email: `${f.actor.userId}@example.org`,
            type: "primary",
        });
        await db
            .update(schema.deviceTable)
            .set({ sessionExpiry: new Date(0) })
            .where(eq(schema.deviceTable.didWrite, f.actor.didWrite));
        expect((await f.load()).response).toEqual({ revision: 0 });
    });

    it("rejects all closed writes including command retries but permits private reads", async () => {
        const f = await fixture();
        await saveQvResponse({ ...f.context, request: f.request });
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        expect(
            await saveQvResponse({ ...f.context, request: f.request }),
        ).toMatchObject({ success: false, reason: "conversation_closed" });
        expect(
            await withdrawQvResponse({
                ...f.context,
                request: {
                    conversationSlugId: f.conversation.slugId,
                    commandId: randomUUID(),
                    expectedResponseRevision: 1,
                },
            }),
        ).toMatchObject({ success: false, reason: "conversation_closed" });
        expect((await f.load()).response.saved?.allocations).toEqual([
            f.allocation,
        ]);
    });

    it("checks ordinary account and moderation admission before saving", async () => {
        const f = await fixture();
        await db
            .update(schema.conversationTable)
            .set({ participationMode: "account_required" })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        expect(
            await saveQvResponse({ ...f.context, request: f.request }),
        ).toMatchObject({ success: false, reason: "account_required" });
        await db
            .update(schema.conversationTable)
            .set({ participationMode: "guest" })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await db.insert(schema.conversationModerationTable).values({
            conversationId: f.conversation.id,
            authorId: f.actor.userId,
            moderationAction: "lock",
            moderationReason: "spam",
            moderationExplanation: "Test lock",
        });
        expect(
            await saveQvResponse({ ...f.context, request: f.request }),
        ).toMatchObject({ success: false, reason: "conversation_locked" });
    });

    it("hides account inputs during recoverable deletion and restores only eligible responses", async () => {
        const f = await fixture();
        await saveQvResponse({ ...f.context, request: f.request });
        await db.transaction(async (tx) => {
            await lockAccountConversations({ db: tx, userId: f.actor.userId });
            await setQvAccountHidden({
                db: tx,
                userId: f.actor.userId,
                hiddenAt: new Date(),
            });
        });
        expect((await f.load()).response).toEqual({ revision: 0 });
        await db.transaction(async (tx) => {
            await lockAccountConversations({ db: tx, userId: f.actor.userId });
            await setQvAccountHidden({
                db: tx,
                userId: f.actor.userId,
                hiddenAt: null,
            });
        });
        expect((await f.load()).response.saved?.allocations).toEqual([
            f.allocation,
        ]);
    });

    it.each([true, false])(
        "merges whole responses without combining budgets (destination saved: %s)",
        async (destinationSaved) => {
            const f = await fixture();
            const hard = await identity();
            await saveQvResponse({ ...f.context, request: f.request });
            if (destinationSaved)
                await saveQvResponse({
                    ...f.context,
                    didWrite: hard.didWrite,
                    request: {
                        ...f.request,
                        expectedViewerId: hard.userId,
                        commandId: randomUUID(),
                        allocations: [{ ...f.allocation, votes: 7 }],
                    },
                });
            await db.transaction(async (tx) => {
                await lockAccountConversations({
                    db: tx,
                    userId: f.actor.userId,
                });
                await mergeQvResponses({
                    db: tx,
                    guestUserId: f.actor.userId,
                    verifiedUserId: hard.userId,
                    now: new Date(),
                });
            });
            expect(
                (await f.load(hard.didWrite)).response.saved?.allocations,
            ).toEqual([{ ...f.allocation, votes: destinationSaved ? 7 : 3 }]);
            const active = await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    and(
                        eq(
                            schema.qvResponseTable.conversationId,
                            f.conversation.id,
                        ),
                        isNull(schema.qvResponseTable.deletedAt),
                    ),
                );
            expect(active).toHaveLength(1);
        },
    );

    it("publishes only the new guest copy when the destination has withdrawn version history", async () => {
        const f = await fixture();
        const hard = await identity();
        await saveQvResponse({ ...f.context, request: f.request });
        expect(
            (
                await saveQvResponse({
                    ...f.context,
                    didWrite: hard.didWrite,
                    request: {
                        ...f.request,
                        expectedViewerId: hard.userId,
                        commandId: randomUUID(),
                        allocations: [{ ...f.allocation, votes: 5 }],
                    },
                })
            ).success,
        ).toBe(true);
        expect(
            (
                await withdrawQvResponse({
                    ...f.context,
                    didWrite: hard.didWrite,
                    request: {
                        conversationSlugId: f.conversation.slugId,
                        expectedViewerId: hard.userId,
                        commandId: randomUUID(),
                        expectedResponseRevision: 1,
                    },
                })
            ).success,
        ).toBe(true);
        await db.transaction(async (tx) => {
            await lockAccountConversations({ db: tx, userId: f.actor.userId });
            await mergeQvResponses({
                db: tx,
                guestUserId: f.actor.userId,
                verifiedUserId: hard.userId,
                now: new Date(),
            });
        });
        const loaded = await f.load(hard.didWrite);
        expect(loaded.response.revision).toBe(3);
        expect(loaded.response.saved?.allocations).toEqual([f.allocation]);
        expect(loaded.response.saved?.creditsSpent).toBe(9);
    });

    it("does not rewrite closed response pointers on merge", async () => {
        const f = await fixture();
        const hard = await identity();
        await saveQvResponse({ ...f.context, request: f.request });
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        const before = await db
            .select()
            .from(schema.qvResponseTable)
            .where(
                eq(schema.qvResponseTable.conversationId, f.conversation.id),
            );
        await db.transaction(async (tx) => {
            await lockAccountConversations({ db: tx, userId: f.actor.userId });
            await mergeQvResponses({
                db: tx,
                guestUserId: f.actor.userId,
                verifiedUserId: hard.userId,
                now: new Date(),
            });
        });
        expect(
            await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    eq(
                        schema.qvResponseTable.conversationId,
                        f.conversation.id,
                    ),
                ),
        ).toEqual(before);
    });

    it("marks every retained individual copy only once purge becomes irreversible", async () => {
        const f = await fixture();
        await saveQvResponse({ ...f.context, request: f.request });
        expect(
            await db.transaction(
                async (tx) =>
                    await retireQvAccountInputs({
                        db: tx,
                        userId: f.actor.userId,
                    }),
            ),
        ).toBe(0);
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.actor.userId));
        expect(
            await db.transaction(
                async (tx) =>
                    await retireQvAccountInputs({
                        db: tx,
                        userId: f.actor.userId,
                    }),
            ),
        ).toBe(1);
        const response = first(
            await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    eq(
                        schema.qvResponseTable.conversationId,
                        f.conversation.id,
                    ),
                ),
        );
        expect(response.currentVersionId).toBeNull();
        expect(response.deletedAt).not.toBeNull();
        expect(
            (
                await db
                    .select()
                    .from(schema.qvResponseVersionTable)
                    .where(
                        eq(
                            schema.qvResponseVersionTable.responseId,
                            response.id,
                        ),
                    )
            ).every((v) => v.deletedAt !== null),
        ).toBe(true);
        expect(
            (
                await db
                    .select()
                    .from(schema.qvResponseCommandTable)
                    .where(
                        eq(
                            schema.qvResponseCommandTable.responseId,
                            response.id,
                        ),
                    )
            ).every((c) => c.deletedAt !== null),
        ).toBe(true);
        expect(
            (
                await db
                    .select()
                    .from(schema.qvAllocationTable)
                    .where(
                        eq(
                            schema.qvAllocationTable.conversationId,
                            f.conversation.id,
                        ),
                    )
            ).every((a) => a.deletedAt !== null),
        ).toBe(true);
        expect(
            first(
                await db
                    .select()
                    .from(schema.creditVotingConfigTable)
                    .where(eq(schema.creditVotingConfigTable.id, f.config.id)),
            ).statementsLockedAt,
        ).not.toBeNull();
    });

    it("enforces same-conversation item/version ownership and pointer ownership in PostgreSQL", async () => {
        const left = await fixture();
        const right = await fixture();
        await saveQvResponse({ ...left.context, request: left.request });
        await saveQvResponse({ ...right.context, request: right.request });
        const leftResponse = first(
            await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    eq(
                        schema.qvResponseTable.conversationId,
                        left.conversation.id,
                    ),
                ),
        );
        const rightResponse = first(
            await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    eq(
                        schema.qvResponseTable.conversationId,
                        right.conversation.id,
                    ),
                ),
        );
        await expect(
            db
                .update(schema.qvResponseTable)
                .set({ currentVersionId: rightResponse.currentVersionId })
                .where(eq(schema.qvResponseTable.id, leftResponse.id)),
        ).rejects.toThrow();
        if (leftResponse.currentVersionId === null)
            throw new Error("Missing version");
        await expect(
            db.insert(schema.qvAllocationTable).values({
                versionId: leftResponse.currentVersionId,
                conversationId: left.conversation.id,
                itemId: first(right.statements).id,
                contentId: first(right.statements).contentId,
                votes: 1,
            }),
        ).rejects.toThrow();
        await expect(
            db.insert(schema.qvAllocationTable).values({
                versionId: leftResponse.currentVersionId,
                conversationId: left.conversation.id,
                itemId: first(left.statements.slice(1)).id,
                contentId: first(right.statements).contentId,
                votes: 1,
            }),
        ).rejects.toThrow();
    });

    it("fences stale identity commands, while allowing an anonymous first-save receipt retry", async () => {
        const f = await fixture();
        const didWrite = `did:key:qv-new-${randomUUID()}`;
        const request = { ...f.request, expectedViewerId: undefined };
        const firstSave = await saveQvResponse({
            ...f.context,
            didWrite,
            request,
        });
        expect(firstSave.success).toBe(true);
        expect(
            await saveQvResponse({ ...f.context, didWrite, request }),
        ).toEqual(firstSave);
        expect(
            await saveQvResponse({
                ...f.context,
                didWrite,
                request: {
                    ...request,
                    commandId: randomUUID(),
                    expectedResponseRevision: 1,
                },
            }),
        ).toEqual({ success: false, reason: "identity_conflict" });
        expect(
            await saveQvResponse({
                ...f.context,
                request: { ...f.request, expectedViewerId: randomUUID() },
            }),
        ).toEqual({ success: false, reason: "identity_conflict" });
    });

    it("deduplicates simultaneous first saves from one unknown signing key", async () => {
        const f = await fixture();
        const didWrite = `did:key:qv-new-${randomUUID()}`;
        const request = { ...f.request, expectedViewerId: undefined };
        const results = await Promise.all([
            saveQvResponse({ ...f.context, didWrite, request }),
            saveQvResponse({ ...f.context, didWrite, request }),
        ]);
        expect(results[0]).toEqual(results[1]);
        expect(results[0]?.success).toBe(true);
    });
    it("canonicalizes sparse allocation order for command retries", async () => {
        const f = await fixture();
        const second = first(f.statements.slice(1));
        const request = {
            ...f.request,
            allocations: [
                f.allocation,
                {
                    itemId: second.itemId,
                    sourceVersion: second.sourceVersion,
                    votes: 2,
                },
            ],
        };
        const accepted = await saveQvResponse({ ...f.context, request });
        expect(accepted.success).toBe(true);
        expect(
            await saveQvResponse({
                ...f.context,
                request: {
                    ...request,
                    allocations: [...request.allocations].reverse(),
                },
            }),
        ).toEqual(accepted);
    });

    it("keeps Save/load query counts constant for one versus 100 allocations", async () => {
        const measurements = [];
        for (const statementCount of [1, 100]) {
            const f = await fixture({ statementCount });
            const request = {
                ...f.request,
                allocations: f.statements.map(({ itemId, sourceVersion }) => ({
                    itemId,
                    sourceVersion,
                    votes: 1,
                })),
            };
            try {
                recordedQueries = [];
                const result = await saveQvResponse({ ...f.context, request });
                expect(result.success).toBe(true);
                const saveQueries = recordedQueries.length;
                expect(
                    recordedQueries.filter(
                        (query) =>
                            query.includes('left join "phone"') &&
                            query.includes('from "device"'),
                    ),
                ).toHaveLength(1);
                expect(
                    recordedQueries.filter((query) =>
                        query.startsWith('insert into "qv_stats_refresh"'),
                    ),
                ).toHaveLength(1);
                expect(
                    recordedQueries.some(
                        (query) =>
                            query.startsWith('update "qv_live_stats"') ||
                            query.startsWith('update "conversation"'),
                    ),
                ).toBe(false);
                // Saving already has authoritative values: no post-insert read of its allocations.
                expect(
                    recordedQueries.filter(
                        (query) =>
                            query.startsWith("select") &&
                            query.includes('"qv_allocation"'),
                    ),
                ).toHaveLength(0);
                recordedQueries = [];
                expect(
                    (
                        await saveQvResponse({
                            ...f.context,
                            request: {
                                ...request,
                                commandId: randomUUID(),
                                expectedResponseRevision: 1,
                            },
                        })
                    ).success,
                ).toBe(true);
                const replaceQueries = recordedQueries.length;
                expect(
                    recordedQueries.some(
                        (query) =>
                            query.startsWith(
                                'insert into "conversation_participant"',
                            ) || query.startsWith('insert into "qv_response"'),
                    ),
                ).toBe(false);
                recordedQueries = [];
                const snapshot = await f.load();
                expect(snapshot.items).toHaveLength(statementCount);
                expect(snapshot.response.saved?.allocations).toHaveLength(
                    statementCount,
                );
                const loadQueries = recordedQueries.length;
                expect(
                    recordedQueries.some(
                        (query) =>
                            query.includes('"ranking_score_entity"') ||
                            query.includes('"ranking_item_external_source"'),
                    ),
                ).toBe(false);
                measurements.push({ saveQueries, replaceQueries, loadQueries });
            } finally {
                recordedQueries = undefined;
            }
        }
        expect(measurements[0]).toEqual(measurements[1]);
        console.info("QV SQL statements, 1 and 100 allocations:", measurements);
    });

    it("tombstones a purge batch with four updates rather than four per response", async () => {
        const f = await fixture();
        await saveQvResponse({ ...f.context, request: f.request });
        const other = await fixture();
        await saveQvResponse({
            ...other.context,
            didWrite: f.actor.didWrite,
            request: { ...other.request, expectedViewerId: f.actor.userId },
        });
        await db
            .update(schema.userTable)
            .set({ isDeleted: true, purgeStartedAt: new Date() })
            .where(eq(schema.userTable.id, f.actor.userId));
        try {
            recordedQueries = [];
            expect(
                await db.transaction(
                    async (tx) =>
                        await retireQvAccountInputs({
                            db: tx,
                            userId: f.actor.userId,
                        }),
                ),
            ).toBe(2);
            expect(
                recordedQueries.filter((query) =>
                    query.startsWith('update "qv_'),
                ),
            ).toHaveLength(4);
        } finally {
            recordedQueries = undefined;
        }
        expect(
            first(
                await db
                    .select({ value: count() })
                    .from(schema.qvAllocationTable)
                    .where(
                        and(
                            eq(
                                schema.qvAllocationTable.conversationId,
                                other.conversation.id,
                            ),
                            isNull(schema.qvAllocationTable.deletedAt),
                        ),
                    ),
            ).value,
        ).toBe(0);
    });

    it("keeps guest merge queries batched across multiple saved conversations", async () => {
        const counts = [];
        for (const conversationCount of [1, 3]) {
            const guest = await identity();
            const hard = await identity();
            const fixtures = [];
            for (let index = 0; index < conversationCount; index++) {
                const f = await fixture();
                fixtures.push(f);
                expect(
                    (
                        await saveQvResponse({
                            ...f.context,
                            didWrite: guest.didWrite,
                            request: {
                                ...f.request,
                                expectedViewerId: guest.userId,
                            },
                        })
                    ).success,
                ).toBe(true);
            }
            try {
                recordedQueries = [];
                await db.transaction(async (tx) => {
                    await lockAccountConversations({
                        db: tx,
                        userId: guest.userId,
                    });
                    await mergeQvResponses({
                        db: tx,
                        guestUserId: guest.userId,
                        verifiedUserId: hard.userId,
                        now: new Date(),
                    });
                });
                counts.push(recordedQueries.length);
                expect(
                    recordedQueries.filter(
                        (query) =>
                            query.startsWith("select") &&
                            query.includes('from "qv_allocation"'),
                    ),
                ).toHaveLength(1);
                expect(
                    recordedQueries.filter((query) =>
                        query.startsWith('update "qv_response"'),
                    ),
                ).toHaveLength(2);
                const publication = recordedQueries.filter(
                    (query) =>
                        query.startsWith('update "qv_response"') &&
                        query.includes('from "qv_response_version"'),
                );
                expect(publication).toHaveLength(1);
                expect(first(publication)).not.toContain("case ");
            } finally {
                recordedQueries = undefined;
            }
            for (const f of fixtures) {
                const loaded = await f.load(hard.didWrite);
                expect(loaded.response.revision).toBe(1);
                expect(loaded.response.saved?.allocations).toEqual([
                    f.allocation,
                ]);
            }
            await db.transaction(async (tx) => {
                await lockAccountConversations({
                    db: tx,
                    userId: guest.userId,
                });
                await mergeQvResponses({
                    db: tx,
                    guestUserId: guest.userId,
                    verifiedUserId: hard.userId,
                    now: new Date(),
                });
            });
            for (const f of fixtures)
                expect((await f.load(hard.didWrite)).response.revision).toBe(1);
        }
        expect(counts[0]).toBe(counts[1]);
    });

    it("uses indexed QV lookups among 20,000 unrelated responses, allocations and statements", async () => {
        const f = await fixture({ statementCount: 100 });
        await saveQvResponse({
            ...f.context,
            request: {
                ...f.request,
                allocations: f.statements.map(({ itemId, sourceVersion }) => ({
                    itemId,
                    sourceVersion,
                    votes: 1,
                })),
            },
        });
        const response = first(
            await db
                .select()
                .from(schema.qvResponseTable)
                .where(
                    eq(
                        schema.qvResponseTable.conversationId,
                        f.conversation.id,
                    ),
                ),
        );
        if (response.currentVersionId === null)
            throw new Error("Missing saved version");
        const unrelated = await fixture();
        // Bound parameters and carry inserted IDs forward; synthetic fixture
        // creation uses the same typed schema as the production lookup queries.
        for (let offset = 0; offset < 20_000; offset += 1000) {
            await db.transaction(async (tx) => {
                const users = Array.from({ length: 1000 }, (_, index) => ({
                    id: randomUUID(),
                    username: `qvplan${String(offset + index + 1)}`,
                }));
                await tx.insert(schema.userTable).values(users);
                const participants = await tx
                    .insert(schema.conversationParticipantTable)
                    .values(
                        users.map((user) => ({
                            conversationId: unrelated.conversation.id,
                            userId: user.id,
                        })),
                    )
                    .returning({ id: schema.conversationParticipantTable.id });
                const responses = await tx
                    .insert(schema.qvResponseTable)
                    .values(
                        participants.map((participant) => ({
                            participantId: participant.id,
                            conversationId: unrelated.conversation.id,
                        })),
                    )
                    .returning({ id: schema.qvResponseTable.id });
                const versions = await tx
                    .insert(schema.qvResponseVersionTable)
                    .values(
                        responses.map((response) => ({
                            responseId: response.id,
                            conversationId: unrelated.conversation.id,
                            statementSetRevision: 0,
                            allowOpposition: true,
                            creditsSpent: 1,
                        })),
                    )
                    .returning({ id: schema.qvResponseVersionTable.id });
                const statement = first(unrelated.statements);
                await tx.insert(schema.qvAllocationTable).values(
                    versions.map((version) => ({
                        versionId: version.id,
                        conversationId: unrelated.conversation.id,
                        itemId: statement.id,
                        contentId: statement.contentId,
                        votes: 1,
                    })),
                );
                await tx.insert(schema.qvResponseCommandTable).values(
                    responses.map((response) => ({
                        responseId: response.id,
                        commandId: randomUUID(),
                        requestHash: "0".repeat(64),
                        resultRevision: 1,
                    })),
                );
                const items = await tx
                    .insert(schema.rankingItemTable)
                    .values(
                        users.map((_, index) => ({
                            conversationId: unrelated.conversation.id,
                            slugId: `qp${String(offset + index + 1).padStart(6, "0")}`,
                            isSeed: true,
                        })),
                    )
                    .returning({ id: schema.rankingItemTable.id });
                await tx.insert(schema.rankingItemContentTable).values(
                    items.map((item) => ({
                        rankingItemId: item.id,
                        conversationContentId: unrelated.content.id,
                        title: "Synthetic statement",
                    })),
                );
                await tx
                    .update(schema.rankingItemTable)
                    .set({
                        currentContentId: schema.rankingItemContentTable.id,
                    })
                    .from(schema.rankingItemContentTable)
                    .where(
                        and(
                            eq(
                                schema.rankingItemTable.id,
                                schema.rankingItemContentTable.rankingItemId,
                            ),
                            inArray(
                                schema.rankingItemTable.id,
                                items.map((item) => item.id),
                            ),
                        ),
                    );
            });
        }
        // PostgreSQL planner instrumentation has no ORM equivalent. EXPLAIN uses
        // the actual ORM-generated queries; Zod parses its untyped diagnostic output.
        for (const table of [
            "user",
            "conversation_participant",
            "qv_response",
            "qv_response_version",
            "qv_response_command",
            "qv_allocation",
            "ranking_item",
            "ranking_item_content",
        ])
            await client.unsafe(`ANALYZE "${table}"`);
        const lookups = [
            {
                name: "owner response",
                table: "qv_response",
                query: buildQvOwnerResponseQuery({
                    db,
                    userId: f.actor.userId,
                    conversationId: f.conversation.id,
                }),
            },
            {
                name: "saved allocations",
                table: "qv_allocation",
                query: buildQvSavedAllocationsQuery({
                    db,
                    versionId: response.currentVersionId,
                }),
            },
            {
                name: "command receipt",
                table: "qv_response_command",
                query: buildQvCommandReceiptQuery({
                    db,
                    responseId: response.id,
                    commandId: f.request.commandId,
                }),
            },
            {
                name: "statement listing",
                table: "ranking_item",
                query: buildQvStatementSourcesQuery({
                    db,
                    conversationId: f.conversation.id,
                }),
            },
            {
                name: "save item validation",
                table: "ranking_item",
                query: buildQvAllocationItemsQuery({
                    db,
                    conversationId: f.conversation.id,
                    itemSlugs: f.statements.map(({ itemId }) => itemId),
                }),
            },
        ];
        const nodeSchema = z.object({
            "Node Type": z.string(),
            "Relation Name": z.string().optional(),
            "Index Name": z.string().optional(),
            Plans: z.array(z.unknown()).optional(),
        });
        function planNodes(node: unknown): z.infer<typeof nodeSchema>[] {
            const parsed = nodeSchema.parse(node);
            return [parsed, ...(parsed.Plans ?? []).flatMap(planNodes)];
        }
        for (const lookup of lookups) {
            const query = lookup.query.toSQL();
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
            const scans = planNodes(measured.Plan).filter(
                (node) => node["Relation Name"] === lookup.table,
            );
            expect(scans.length, lookup.name).toBeGreaterThan(0);
            expect(
                scans.every((node) =>
                    [
                        "Index Scan",
                        "Index Only Scan",
                        "Bitmap Heap Scan",
                    ].includes(node["Node Type"]),
                ),
                lookup.name,
            ).toBe(true);
            console.info(`QV EXPLAIN ${lookup.name}:`, {
                executionMs: measured["Execution Time"],
                indexes: planNodes(measured.Plan).flatMap(
                    (node) => node["Index Name"] ?? [],
                ),
            });
        }
        const hard = await identity();
        try {
            recordedQueries = [];
            recordedParameters = new Map();
            await db.transaction(async (tx) => {
                await lockAccountConversations({
                    db: tx,
                    userId: f.actor.userId,
                });
                await mergeQvResponses({
                    db: tx,
                    guestUserId: f.actor.userId,
                    verifiedUserId: hard.userId,
                    now: new Date(),
                });
            });
            const publication = first(
                recordedQueries.filter(
                    (query) =>
                        query.startsWith('update "qv_response"') &&
                        query.includes('from "qv_response_version"'),
                ),
            );
            const parameters = z
                .array(z.string())
                .parse(recordedParameters.get(publication));
            // Planning only: EXPLAIN ANALYZE would publish again and increment revisions.
            const rows = z
                .array(
                    z.object({
                        "QUERY PLAN": z.array(z.object({ Plan: z.unknown() })),
                    }),
                )
                .parse(
                    await client.unsafe(
                        `EXPLAIN (FORMAT JSON) ${publication}`,
                        parameters,
                    ),
                );
            const nodes = planNodes(first(first(rows)["QUERY PLAN"]).Plan);
            const lookups = nodes.filter(
                (node) =>
                    node["Relation Name"] === "qv_response" ||
                    node["Relation Name"] === "qv_response_version",
            );
            expect(
                lookups.filter((node) => node["Node Type"] === "Seq Scan"),
            ).toHaveLength(0);
            expect(
                lookups.some(
                    (node) =>
                        node["Relation Name"] === "qv_response" &&
                        [
                            "Index Scan",
                            "Index Only Scan",
                            "Bitmap Heap Scan",
                        ].includes(node["Node Type"]),
                ),
            ).toBe(true);
            console.info(
                "QV merge publication EXPLAIN:",
                nodes.flatMap((node) => node["Index Name"] ?? []),
            );
        } finally {
            recordedQueries = undefined;
            recordedParameters = undefined;
        }
    }, 60_000);
});
