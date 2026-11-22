import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import * as languageMetadata from "../src/service/contentLanguageMetadata.js";
import * as schema from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { createComparisonStatement } from "../src/service/comparisonStatements.js";
import { withParticipantStatementAdmission } from "../src/service/participantStatementAdmission.js";
import { fetchCurrentConversationTypeSettings } from "../src/service/conversationTypeConfig.js";
import { updateConversation } from "../src/service/postEdit.js";
import { postNewOpinion } from "../src/service/comment.js";
import type { VoteBuffer } from "../src/service/voteBuffer.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing statement fixture");
    return row;
}
function barrier() {
    let resolve = () => {};
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

describe("participant statement policy", () => {
    afterEach(() => vi.restoreAllMocks());
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "participant_statements",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "participant_statements",
        };
        client = postgres({ ...connection, max: 8, onnotice: () => undefined });
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

    async function fixture(family: "polis" | "bws" | "pairwise" | "qv") {
        const userId = randomUUID();
        const didWrite = `did:key:statement-${userId}`;
        await db
            .insert(schema.userTable)
            .values({ id: userId, username: userId.slice(0, 20) });
        await db.insert(schema.deviceTable).values({
            userId,
            didWrite,
            userAgent: "statement tests",
            sessionExpiry: new Date("2100-01-01"),
        });
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: randomUUID().slice(0, 8),
                    title: "Statement tests",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const organization = first(
            await db
                .insert(schema.organizationTable)
                .values({
                    slug: randomUUID().slice(0, 8),
                    displayName: "Statement tests",
                    defaultLanguageCode: "en",
                    isFullImagePath: false,
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        await db
            .insert(schema.projectOrganizationOwnershipTable)
            .values({ projectId: project.id, organizationId: organization.id });
        const polisConfig =
            family === "polis"
                ? first(
                      await db
                          .insert(schema.polisConversationConfigTable)
                          .values({})
                          .returning(),
                  )
                : undefined;
        const comparisonConfig =
            family === "bws" || family === "pairwise"
                ? first(
                      await db
                          .insert(schema.rankingConversationConfigTable)
                          .values({ rankingMode: family })
                          .returning(),
                  )
                : undefined;
        const qvConfig =
            family === "qv"
                ? first(
                      await db
                          .insert(schema.qvConfigTable)
                          .values({})
                          .returning(),
                  )
                : undefined;
        const conversation = first(
            await db
                .insert(schema.conversationTable)
                .values({
                    slugId: randomUUID().slice(0, 8),
                    projectId: project.id,
                    participationMode: "guest",
                    conversationType:
                        family === "polis" ? "polis" : "prioritizing",
                    prioritizationType:
                        family === "polis"
                            ? undefined
                            : family === "qv"
                              ? "qv"
                              : "comparisons",
                    polisConfigId: polisConfig?.id,
                    rankingConfigId: comparisonConfig?.id,
                    creditVotingConfigId: qvConfig?.id,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: conversation.id,
                    title: "Statement tests",
                })
                .returning(),
        );
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.conversationTable.id, conversation.id));
        const context = {
            db,
            didWrite,
            userAgent: "statement tests",
            now: new Date(),
            currentDisplayLanguage: "en" as const,
            conversationSlugId: conversation.slugId,
            family:
                family === "polis"
                    ? ("polis" as const)
                    : ("comparisons" as const),
        };
        const submit = () =>
            createComparisonStatement({
                ...context,
                request: {
                    conversationSlugId: conversation.slugId,
                    statementBody: "<p>Improve public transit</p>",
                },
                googleCloudCredentials: undefined,
                valkey: undefined,
            });
        const edit = (
            participantStatementsChange:
                | { expectedEnabled: boolean; enabled: boolean }
                | undefined,
        ) =>
            updateConversation({
                db,
                userId,
                data: Dto.updateConversationRequest.parse({
                    conversationSlugId: conversation.slugId,
                    conversationTitle: content.title,
                    isIndexed: true,
                    participationMode: "guest",
                    multilingualSetting: {
                        additionalLanguageCodes: [],
                        dynamicTranslationEnabled: false,
                    },
                    conversationTypeConfig:
                        family === "polis"
                            ? {
                                  conversationType: "polis",
                                  votingPresentation: "list",
                              }
                            : family === "qv"
                              ? {
                                    conversationType: "prioritizing",
                                    prioritizationType: "qv",
                                    creditPricing: "quadratic",
                                    allowOpposition: true,
                                }
                              : {
                                    conversationType: "prioritizing",
                                    prioritizationType: "comparisons",
                                    comparisonMethod: family,
                                },
                    participantStatementsChange,
                }),
            });
        return {
            userId,
            conversation,
            polisConfig,
            comparisonConfig,
            qvConfig,
            context,
            submit,
            edit,
        };
    }

    it.each(["polis", "bws", "pairwise", "qv"] as const)(
        "projects the correct database default for %s",
        async (family) => {
            const f = await fixture(family);
            const settings = await fetchCurrentConversationTypeSettings({
                db,
                conversationId: f.conversation.id,
            });
            expect(settings.participantStatements).toEqual(
                family === "qv"
                    ? { supported: false }
                    : { supported: true, enabled: family === "polis" },
            );
            expect("allowParticipantStatements" in schema.qvConfigTable).toBe(
                false,
            );
        },
    );

    it.each(["bws", "pairwise"] as const)(
        "rejects OFF then creates a participant-authored %s item when enabled",
        async (family) => {
            const f = await fixture(family);
            expect(await f.submit()).toEqual({
                success: false,
                reason: "participant_statements_disabled",
            });
            expect(
                await f.edit({ expectedEnabled: false, enabled: true }),
            ).toMatchObject({
                success: true,
                participantStatements: { supported: true, enabled: true },
            });
            const result = await f.submit();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.loginStatus).toMatchObject({
                    isKnown: true,
                    isRegistered: false,
                    userId: f.userId,
                });
                expect(result.loginStatus).not.toHaveProperty("sessionExpiry");
            }
            const items = await db
                .select()
                .from(schema.rankingItemTable)
                .where(
                    eq(
                        schema.rankingItemTable.conversationId,
                        f.conversation.id,
                    ),
                );
            expect(items).toHaveLength(1);
            expect(first(items)).toMatchObject({
                authorId: f.userId,
                isSeed: false,
                lifecycleStatus: "active",
            });
            expect(
                await db
                    .select()
                    .from(schema.comparisonResponseTable)
                    .where(
                        eq(
                            schema.comparisonResponseTable.conversationId,
                            f.conversation.id,
                        ),
                    ),
            ).toHaveLength(0);
            const config = first(
                await db
                    .select()
                    .from(schema.rankingConversationConfigTable)
                    .where(
                        eq(
                            schema.rankingConversationConfigTable.id,
                            f.comparisonConfig?.id ?? -1,
                        ),
                    ),
            );
            expect(config).toMatchObject({
                itemCount: 1,
                totalItemCount: 1,
                participantCount: 0,
                voteCount: 0,
            });
            expect(
                await db
                    .select()
                    .from(schema.realtimeEventOutboxTable)
                    .where(
                        eq(
                            schema.realtimeEventOutboxTable.eventType,
                            "comparison_items_updated",
                        ),
                    ),
            ).not.toHaveLength(0);
            expect(
                await f.edit({ expectedEnabled: true, enabled: false }),
            ).toMatchObject({ success: true });
            expect(await f.submit()).toEqual({
                success: false,
                reason: "participant_statements_disabled",
            });
            expect(
                await db
                    .select()
                    .from(schema.rankingItemTable)
                    .where(
                        eq(
                            schema.rankingItemTable.conversationId,
                            f.conversation.id,
                        ),
                    ),
            ).toHaveLength(1);
        },
    );

    it("rejects QV updates and both cross-family submission paths", async () => {
        const f = await fixture("qv");
        expect(
            await f.edit({ expectedEnabled: false, enabled: true }),
        ).toMatchObject({
            success: false,
            reason: "participant_statements_unsupported",
        });
        expect(
            await f.edit({ expectedEnabled: false, enabled: false }),
        ).toMatchObject({
            success: false,
            reason: "participant_statements_unsupported",
        });
        const persist = vi.fn(async () => undefined);
        for (const family of ["polis", "comparisons"] as const)
            expect(
                await withParticipantStatementAdmission({
                    ...f.context,
                    family,
                    persist,
                }),
            ).toEqual({
                success: false,
                reason: "participant_statements_unsupported",
            });
        expect(persist).not.toHaveBeenCalled();
        await expect(
            db
                .update(schema.conversationTable)
                .set({
                    polisConfigId: first(
                        await db
                            .insert(schema.polisConversationConfigTable)
                            .values({})
                            .returning(),
                    ).id,
                })
                .where(eq(schema.conversationTable.id, f.conversation.id)),
        ).rejects.toThrow();
    });

    it("detects stale intentional edits without changing content or scoring inputs", async () => {
        const f = await fixture("pairwise");
        expect(
            await f.edit({ expectedEnabled: false, enabled: true }),
        ).toMatchObject({ success: true });
        expect(
            await f.edit({ expectedEnabled: false, enabled: false }),
        ).toMatchObject({
            success: false,
            reason: "participant_statements_changed",
        });
        expect(await f.edit(undefined)).toMatchObject({
            success: true,
            participantStatements: { supported: true, enabled: true },
        });
        const row = first(
            await db
                .select()
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.id, f.conversation.id)),
        );
        expect(row.isEdited).toBe(false);
        const config = first(
            await db
                .select()
                .from(schema.rankingConversationConfigTable)
                .where(
                    eq(
                        schema.rankingConversationConfigTable.id,
                        f.comparisonConfig?.id ?? -1,
                    ),
                ),
        );
        expect(config.scoringInputRevision).toBe(0);
    });

    it("lets an admitted write finish before disabling and rejects later writes", async () => {
        const f = await fixture("polis");
        const entered = barrier();
        const release = barrier();
        const submission = withParticipantStatementAdmission({
            ...f.context,
            persist: async () => {
                entered.resolve();
                await release.promise;
                return "accepted";
            },
        });
        await entered.promise;
        const edit = f.edit({ expectedEnabled: true, enabled: false });
        release.resolve();
        expect(await submission).toMatchObject({
            success: true,
            value: "accepted",
            loginStatus: {
                isKnown: true,
                userId: f.userId,
                isRegistered: false,
            },
        });
        expect(await edit).toMatchObject({ success: true });
        const persist = vi.fn(async () => "unexpected");
        expect(
            await withParticipantStatementAdmission({ ...f.context, persist }),
        ).toEqual({
            success: false,
            reason: "participant_statements_disabled",
        });
        expect(persist).not.toHaveBeenCalled();
    });

    it("reads policy after waiting for an editor rather than using a joined stale value", async () => {
        const f = await fixture("polis");
        const locked = barrier();
        const release = barrier();
        const edit = db.transaction(async (tx) => {
            await tx
                .select()
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.id, f.conversation.id))
                .for("update");
            locked.resolve();
            await release.promise;
            await tx
                .update(schema.polisConversationConfigTable)
                .set({ allowParticipantStatements: false })
                .where(
                    eq(
                        schema.polisConversationConfigTable.id,
                        f.polisConfig?.id ?? -1,
                    ),
                );
        });
        await locked.promise;
        const persist = vi.fn(async () => "unexpected");
        const submission = withParticipantStatementAdmission({
            ...f.context,
            persist,
        });
        release.resolve();
        await edit;
        expect(await submission).toEqual({
            success: false,
            reason: "participant_statements_disabled",
        });
        expect(persist).not.toHaveBeenCalled();
    });

    it("keeps closed activities closed even when their statement policy is ON", async () => {
        const f = await fixture("polis");
        await db
            .update(schema.conversationTable)
            .set({ isClosed: true })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        expect(
            await withParticipantStatementAdmission({
                ...f.context,
                persist: vi.fn(),
            }),
        ).toMatchObject({ success: false, reason: "conversation_closed" });
    });

    it("enforces policy and family through the real opinion-creation service without buffering a vote", async () => {
        const voteBuffer = {
            add: vi.fn<VoteBuffer["add"]>().mockResolvedValue(undefined),
            hasBlockingVotes: vi
                .fn<VoteBuffer["hasBlockingVotes"]>()
                .mockResolvedValue(false),
            flush: vi.fn<VoteBuffer["flush"]>().mockResolvedValue(undefined),
            shutdown: vi
                .fn<VoteBuffer["shutdown"]>()
                .mockResolvedValue(undefined),
        } satisfies VoteBuffer;
        const f = await fixture("polis");
        await f.edit({ expectedEnabled: true, enabled: false });
        const result = await postNewOpinion({
            ...f.context,
            isSeed: false,
            commentBody: "<p>A new statement</p>",
            useGoogleLanguageDetection: false,
            voteBuffer,
        });
        expect(result).toEqual({
            success: false,
            reason: "participant_statements_disabled",
        });
        const qv = await fixture("qv");
        expect(
            await postNewOpinion({
                ...qv.context,
                isSeed: false,
                commentBody: "<p>A new statement</p>",
                useGoogleLanguageDetection: false,
                voteBuffer,
            }),
        ).toEqual({
            success: false,
            reason: "participant_statements_unsupported",
        });
        expect(voteBuffer.add).not.toHaveBeenCalled();
        expect(
            await db
                .select()
                .from(schema.opinionTable)
                .where(
                    eq(schema.opinionTable.conversationId, f.conversation.id),
                ),
        ).toHaveLength(0);
        await f.edit({ expectedEnabled: false, enabled: true });
        const accepted = await postNewOpinion({
            ...f.context,
            isSeed: false,
            commentBody: "<p>An accepted statement</p>",
            useGoogleLanguageDetection: false,
            voteBuffer,
        });
        expect(accepted).toMatchObject({
            success: true,
            displayedOpinionItem: {
                opinion: "<p>An accepted statement</p>",
                isSeed: false,
            },
        });
        expect(voteBuffer.add).toHaveBeenCalledOnce();
        expect(
            await db
                .select()
                .from(schema.opinionTable)
                .where(
                    eq(schema.opinionTable.conversationId, f.conversation.id),
                ),
        ).toHaveLength(1);
    });

    it("rolls unknown guest registration back when creation is disabled", async () => {
        const f = await fixture("pairwise");
        const didWrite = `did:key:unknown-${randomUUID()}`;
        expect(
            await withParticipantStatementAdmission({
                ...f.context,
                didWrite,
                persist: vi.fn(),
            }),
        ).toMatchObject({
            success: false,
            reason: "participant_statements_disabled",
        });
        expect(
            await db
                .select()
                .from(schema.deviceTable)
                .where(and(eq(schema.deviceTable.didWrite, didWrite))),
        ).toHaveLength(0);
    });

    it("rejects disabled submissions before language-provider work", async () => {
        const detect = vi.spyOn(
            languageMetadata,
            "resolveContentLanguageMetadata",
        );
        const f = await fixture("pairwise");
        await db
            .update(schema.conversationTable)
            .set({ dynamicTranslationEnabled: true })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        expect(await f.submit()).toEqual({
            success: false,
            reason: "participant_statements_disabled",
        });
        expect(detect).not.toHaveBeenCalled();
    });

    it("rechecks policy after provider work without leaving a rejected guest account", async () => {
        const f = await fixture("pairwise");
        await f.edit({ expectedEnabled: false, enabled: true });
        const entered = barrier();
        const release = barrier();
        vi.spyOn(
            languageMetadata,
            "resolveContentLanguageMetadata",
        ).mockImplementation(async () => {
            entered.resolve();
            await release.promise;
            return languageMetadata.UNKNOWN_CONTENT_LANGUAGE_METADATA;
        });
        const didWrite = `did:key:provider-race-${randomUUID()}`;
        const submission = createComparisonStatement({
            ...f.context,
            didWrite,
            request: {
                conversationSlugId: f.conversation.slugId,
                statementBody: "<p>Keep transit affordable</p>",
            },
            googleCloudCredentials: undefined,
            valkey: undefined,
        });
        await entered.promise;
        await f.edit({ expectedEnabled: true, enabled: false });
        release.resolve();
        expect(await submission).toEqual({
            success: false,
            reason: "participant_statements_disabled",
        });
        expect(
            await db
                .select()
                .from(schema.deviceTable)
                .where(eq(schema.deviceTable.didWrite, didWrite)),
        ).toHaveLength(0);
        expect(
            await db
                .select()
                .from(schema.rankingItemTable)
                .where(
                    eq(
                        schema.rankingItemTable.conversationId,
                        f.conversation.id,
                    ),
                ),
        ).toHaveLength(0);
    });

    it("does not let a deleted account submit or re-register its existing device", async () => {
        const f = await fixture("polis");
        await db
            .update(schema.userTable)
            .set({ isDeleted: true })
            .where(eq(schema.userTable.id, f.userId));
        await expect(
            withParticipantStatementAdmission({
                ...f.context,
                persist: vi.fn(),
            }),
        ).rejects.toThrow("Account unavailable");
        expect(
            first(
                await db
                    .select()
                    .from(schema.deviceTable)
                    .where(eq(schema.deviceTable.didWrite, f.context.didWrite)),
            ).userId,
        ).toBe(f.userId);
    });
});
