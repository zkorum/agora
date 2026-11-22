import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchQvResults } from "../src/service/qvResults.js";
import { closeConversation, openConversation } from "../src/service/post.js";
import * as schema from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import type { VoteBuffer } from "../src/service/voteBuffer.js";

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing QV fallback fixture");
    return row;
}

function barrier() {
    let resolve = () => {};
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("QV accepted-result fallback", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let recordedQueries: string[] | undefined;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "qv_fallback",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "qv_fallback",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({
            client,
            logger: {
                logQuery(query) {
                    recordedQueries?.push(query);
                },
            },
        });
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

    async function stageResult({
        writer,
        calculationId,
        participantCount,
        itemCount = 2,
        includeResults = true,
    }: {
        writer: PostgresJsDatabase;
        calculationId: string;
        participantCount: number;
        itemCount?: number;
        includeResults?: boolean;
    }) {
        const snapshot = first(
            await writer
                .insert(schema.qvInputSnapshotTable)
                .values({
                    calculationId,
                    creditBudget: 100,
                    creditPricing: "quadratic",
                    allowOpposition: true,
                    statementSetRevision: 0,
                    ruleVersion: 1,
                    algorithmVersion: 1,
                    participantCount,
                })
                .returning(),
        );
        const items = Array.from({ length: itemCount }, (_, position) => ({
            snapshotId: snapshot.id,
            itemSlugId: randomUUID().slice(0, 8),
            sourceVersion: randomUUID(),
            position,
            title: `Frozen ${position}`,
            body: `Frozen body ${position}`,
        }));
        if (items.length > 0) {
            await writer.insert(schema.qvInputItemTable).values(items);
            if (includeResults)
                await writer.insert(schema.qvResultItemTable).values(
                    items.map((item) => ({
                        snapshotId: snapshot.id,
                        itemSlugId: item.itemSlugId,
                        supportUnits: participantCount,
                        oppositionUnits: 1,
                        netUnits: participantCount - 1,
                        supportingParticipantCount: participantCount,
                        opposingParticipantCount: 1,
                        rank: 1,
                    })),
                );
        }
        await writer
            .update(schema.qvCalculationTable)
            .set({
                status: "ready",
                inputSnapshotId: snapshot.id,
                readyAt: new Date(),
            })
            .where(eq(schema.qvCalculationTable.id, calculationId));
        return snapshot;
    }

    async function fixture({ empty = false }: { empty?: boolean } = {}) {
        return await db.transaction(async (tx) => {
            const project = first(
                await tx
                    .insert(schema.projectTable)
                    .values({
                        slug: randomUUID().slice(0, 8),
                        title: "QV fallback",
                        directoryVisibility: "unlisted",
                    })
                    .returning(),
            );
            const config = first(
                await tx
                    .insert(schema.qvConfigTable)
                    .values({ itemCount: 2 })
                    .returning(),
            );
            const conversation = first(
                await tx
                    .insert(schema.conversationTable)
                    .values({
                        slugId: randomUUID().slice(0, 8),
                        projectId: project.id,
                        conversationType: "prioritizing",
                        prioritizationType: "qv",
                        creditVotingConfigId: config.id,
                        isClosed: true,
                        closedFinalizedAt: new Date(),
                        closingTargetRevision: 1,
                    })
                    .returning(),
            );
            const content = first(
                await tx
                    .insert(schema.conversationContentTable)
                    .values({
                        conversationId: conversation.id,
                        title: "QV fallback",
                    })
                    .returning(),
            );
            await tx
                .update(schema.conversationTable)
                .set({ currentContentId: content.id })
                .where(eq(schema.conversationTable.id, conversation.id));
            const calculation = first(
                await tx
                    .insert(schema.qvCalculationTable)
                    .values({
                        conversationId: conversation.id,
                        generation: 1,
                    })
                    .returning(),
            );
            const snapshot = await stageResult({
                writer: tx,
                calculationId: calculation.id,
                participantCount: empty ? 0 : 3,
                itemCount: empty ? 0 : 2,
            });
            await tx.insert(schema.qvCalculationStateTable).values({
                conversationId: conversation.id,
                generation: 1,
                currentCalculationId: calculation.id,
            });
            return { conversation, calculation, snapshot };
        });
    }

    async function requestCorrection({
        conversationId,
        status = "queued",
        generation = 2,
    }: {
        conversationId: number;
        status?: "queued" | "running" | "failed";
        generation?: number;
    }) {
        return await db.transaction(async (tx) => {
            const work = first(
                await tx
                    .insert(schema.qvCalculationTable)
                    .values({
                        conversationId,
                        generation,
                        status,
                        ...(status === "running"
                            ? {
                                  leaseToken: randomUUID(),
                                  leaseExpiresAt: new Date("2100-01-01"),
                              }
                            : {}),
                    })
                    .returning(),
            );
            await tx
                .update(schema.qvCalculationStateTable)
                .set({ generation })
                .where(
                    eq(
                        schema.qvCalculationStateTable.conversationId,
                        conversationId,
                    ),
                );
            return work;
        });
    }

    it("localizes the accepted item revision, never a newer working edit or redacted snapshot", async () => {
        const f = await fixture();
        await db
            .update(schema.conversationTable)
            .set({
                dynamicTranslationEnabled: true,
                languageSettingsSource: "conversation_override",
            })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await db
            .insert(schema.conversationTranslationTargetLanguageTable)
            .values({
                conversationId: f.conversation.id,
                languageCode: "fr",
            });
        const frozen = first(
            await db
                .select()
                .from(schema.qvInputItemTable)
                .where(eq(schema.qvInputItemTable.snapshotId, f.snapshot.id)),
        );
        const item = first(
            await db
                .insert(schema.rankingItemTable)
                .values({
                    slugId: frozen.itemSlugId,
                    conversationId: f.conversation.id,
                    isSeed: true,
                })
                .returning(),
        );
        const source = first(
            await db
                .insert(schema.rankingItemContentTable)
                .values({
                    publicId: frozen.sourceVersion,
                    rankingItemId: item.id,
                    title: frozen.title,
                    body: frozen.body,
                    bodyPlainText: frozen.body,
                    conversationContentId:
                        f.conversation.currentContentId ??
                        first(
                            await db
                                .select()
                                .from(schema.conversationContentTable)
                                .where(
                                    eq(
                                        schema.conversationContentTable
                                            .conversationId,
                                        f.conversation.id,
                                    ),
                                ),
                        ).id,
                    sourceLanguageCode: "en",
                })
                .returning(),
        );
        const newer = first(
            await db
                .insert(schema.rankingItemContentTable)
                .values({
                    rankingItemId: item.id,
                    title: "Newer working edit",
                    conversationContentId: source.conversationContentId,
                    sourceLanguageCode: "en",
                })
                .returning(),
        );
        await db
            .update(schema.rankingItemTable)
            .set({ currentContentId: newer.id })
            .where(eq(schema.rankingItemTable.id, item.id));
        await db.insert(schema.rankingItemContentTranslationTable).values({
            rankingItemContentId: source.id,
            displayLanguageCode: "fr",
            translatedTitle: "Ancienne proposition traduite",
            translatedBodyHtml: "Ancienne description traduite",
            translatedBodyPlainText: "Ancienne description traduite",
            sourceLanguageCode: "en",
        });
        const params = {
            db,
            conversationSlugId: f.conversation.slugId,
            displayPreferences: {
                kind: "localized" as const,
                displayLanguage: "fr" as const,
                spokenLanguages: ["fr" as const],
            },
        };
        const result = await fetchQvResults(params);
        expect(result).toMatchObject({
            status: "ready",
            calculationId: f.calculation.id,
            participantCount: 3,
            items: expect.arrayContaining([
                expect.objectContaining({
                    itemSlugId: frozen.itemSlugId,
                    sourceVersion: frozen.sourceVersion,
                    displayContent: {
                        sourceVersion: frozen.sourceVersion,
                        status: "available",
                        mode: "translated",
                        content: {
                            title: "Ancienne proposition traduite",
                            bodyHtml: "Ancienne description traduite",
                        },
                        translationControl: expect.objectContaining({
                            status: "completed",
                        }),
                    },
                    netUnits: 2,
                }),
            ]),
        });
        expect(JSON.stringify(result)).not.toContain("Newer working edit");
        await db
            .update(schema.qvInputItemTable)
            .set({ title: "", body: null })
            .where(eq(schema.qvInputItemTable.snapshotId, f.snapshot.id));
        const redacted = await fetchQvResults(params);
        expect(JSON.stringify(redacted)).not.toContain("Ancienne");
        expect(JSON.stringify(redacted)).not.toContain("Frozen");
    });

    it("does not expose retained results after the owning project is deleted", async () => {
        const f = await fixture();
        await db
            .update(schema.projectTable)
            .set({ deletedAt: new Date() })
            .where(eq(schema.projectTable.id, f.conversation.projectId));
        await expect(
            fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it.each(["queued", "running", "failed"] as const)(
        "keeps one coherent accepted result during a %s correction",
        async (status) => {
            const f = await fixture();
            const accepted = await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            });
            await requestCorrection({
                conversationId: f.conversation.id,
                status,
            });
            const result = await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            });
            expect(result).toEqual({
                ...accepted,
                generation: 2,
                refreshStatus: status === "failed" ? "failed" : "calculating",
            });
            expect(Dto.qvResultsResponse.parse(result)).toEqual(result);
        },
    );

    it("keeps an explicitly empty accepted result through coalesced corrections", async () => {
        const f = await fixture({ empty: true });
        for (const generation of [2, 3])
            await requestCorrection({
                conversationId: f.conversation.id,
                generation,
            });
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toMatchObject({
            status: "ready",
            generation: 3,
            calculationId: f.calculation.id,
            participantCount: 0,
            items: [],
            refreshStatus: "calculating",
        });
    });

    it.each(["queued", "failed"] as const)(
        "does not use old results during initial finalization (%s)",
        async (status) => {
            const f = await fixture();
            await requestCorrection({
                conversationId: f.conversation.id,
                status,
            });
            await db
                .update(schema.conversationTable)
                .set({ closedFinalizedAt: null, closingTargetRevision: null })
                .where(eq(schema.conversationTable.id, f.conversation.id));
            expect(
                await fetchQvResults({
                    db,
                    conversationSlugId: f.conversation.slugId,
                }),
            ).toEqual({
                status: status === "failed" ? "failed" : "calculating",
                generation: 2,
            });
        },
    );

    it("never carries a fallback across reopening and reclosing", async () => {
        const f = await fixture();
        await requestCorrection({ conversationId: f.conversation.id });
        const params = {
            db,
            conversationSlugId: f.conversation.slugId,
            valkey: undefined,
        };
        expect(await openConversation(params)).toEqual({ success: true });
        expect(await fetchQvResults(params)).toEqual({
            status: "open",
            generation: 3,
        });
        const voteBuffer: VoteBuffer = {
            add: async () => undefined,
            hasBlockingVotes: async () => false,
            flush: async () => {},
            shutdown: async () => {},
        };
        expect(await closeConversation({ ...params, voteBuffer })).toEqual({
            success: true,
        });
        expect(await fetchQvResults(params)).toEqual({
            status: "calculating",
            generation: 4,
        });
    });

    it.each(["missing_pointer", "wrong_revision", "unready_result"] as const)(
        "rejects an invalid accepted reference (%s)",
        async (defect) => {
            const f = await fixture();
            await requestCorrection({ conversationId: f.conversation.id });
            if (defect === "missing_pointer")
                await db
                    .update(schema.qvCalculationStateTable)
                    .set({ currentCalculationId: null })
                    .where(
                        eq(
                            schema.qvCalculationStateTable.conversationId,
                            f.conversation.id,
                        ),
                    );
            else if (defect === "wrong_revision")
                await db
                    .update(schema.conversationTable)
                    .set({ closingTargetRevision: 2 })
                    .where(eq(schema.conversationTable.id, f.conversation.id));
            else
                await db
                    .update(schema.qvCalculationTable)
                    .set({ status: "failed", readyAt: null })
                    .where(eq(schema.qvCalculationTable.id, f.calculation.id));
            await expect(
                fetchQvResults({
                    db,
                    conversationSlugId: f.conversation.slugId,
                }),
            ).rejects.toMatchObject({ statusCode: 503 });
        },
    );

    it("does not substitute a previous result for an unactivated ready publication", async () => {
        const f = await fixture();
        const work = await requestCorrection({
            conversationId: f.conversation.id,
        });
        await db.transaction(async (tx) => {
            await stageResult({
                writer: tx,
                calculationId: work.id,
                participantCount: 2,
            });
        });
        await expect(
            fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).rejects.toMatchObject({ statusCode: 503 });
    });

    it("uses current text redaction without changing fallback mathematics", async () => {
        const f = await fixture();
        await requestCorrection({ conversationId: f.conversation.id });
        await db
            .update(schema.qvInputItemTable)
            .set({ title: "", body: null })
            .where(eq(schema.qvInputItemTable.snapshotId, f.snapshot.id));
        const result = await fetchQvResults({
            db,
            conversationSlugId: f.conversation.slugId,
        });
        expect(result).toMatchObject({
            status: "ready",
            participantCount: 3,
            items: [
                { displayContent: { content: { title: "" } }, netUnits: 2 },
                { displayContent: { content: { title: "" } }, netUnits: 2 },
            ],
        });
        expect(JSON.stringify(result)).not.toContain("Frozen");
        await db
            .update(schema.conversationTable)
            .set({ currentContentId: null })
            .where(eq(schema.conversationTable.id, f.conversation.id));
        await expect(
            fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejects an incomplete accepted aggregate instead of silently dropping its items", async () => {
        const f = await fixture();
        const work = await requestCorrection({
            conversationId: f.conversation.id,
        });
        await db.transaction(async (tx) => {
            await stageResult({
                writer: tx,
                calculationId: work.id,
                participantCount: 2,
                includeResults: false,
            });
            await tx
                .update(schema.qvCalculationStateTable)
                .set({ currentCalculationId: work.id })
                .where(
                    eq(
                        schema.qvCalculationStateTable.conversationId,
                        f.conversation.id,
                    ),
                );
        });
        await expect(
            fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).rejects.toMatchObject({ statusCode: 503 });
    });

    it("rolls back replacement activation without losing the fallback", async () => {
        const f = await fixture();
        const work = await requestCorrection({
            conversationId: f.conversation.id,
        });
        const before = await fetchQvResults({
            db,
            conversationSlugId: f.conversation.slugId,
        });
        await expect(
            db.transaction(async (tx) => {
                await stageResult({
                    writer: tx,
                    calculationId: work.id,
                    participantCount: 2,
                });
                await tx
                    .update(schema.qvCalculationStateTable)
                    .set({ currentCalculationId: work.id })
                    .where(
                        eq(
                            schema.qvCalculationStateTable.conversationId,
                            f.conversation.id,
                        ),
                    );
                throw new Error("Rollback correction");
            }),
        ).rejects.toThrow("Rollback correction");
        expect(
            await fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ).toEqual(before);
    });

    it("reads references after waiting for atomic replacement, never new counts with old scores", async () => {
        const f = await fixture();
        const work = await requestCorrection({
            conversationId: f.conversation.id,
        });
        const staged = barrier();
        const release = barrier();
        const publishing = db.transaction(async (tx) => {
            await tx
                .select({ id: schema.conversationTable.id })
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.id, f.conversation.id))
                .for("no key update");
            await stageResult({
                writer: tx,
                calculationId: work.id,
                participantCount: 2,
            });
            await tx
                .update(schema.qvCalculationStateTable)
                .set({ currentCalculationId: work.id })
                .where(
                    eq(
                        schema.qvCalculationStateTable.conversationId,
                        f.conversation.id,
                    ),
                );
            await tx
                .update(schema.conversationTable)
                .set({ closingTargetRevision: 2 })
                .where(eq(schema.conversationTable.id, f.conversation.id));
            staged.resolve();
            await release.promise;
        });
        await staged.promise;
        recordedQueries = [];
        const reading = Promise.allSettled([
            fetchQvResults({
                db,
                conversationSlugId: f.conversation.slugId,
            }),
        ]);
        try {
            await vi.waitFor(() => {
                expect(
                    recordedQueries?.some(
                        (query) =>
                            query.includes('from "conversation"') &&
                            query.includes("for share"),
                    ),
                ).toBe(true);
            });
        } finally {
            release.resolve();
            recordedQueries = undefined;
        }
        await publishing;
        const outcome = first(await reading);
        expect(outcome).toMatchObject({
            status: "fulfilled",
            value: {
                status: "ready",
                generation: 2,
                calculationId: work.id,
                participantCount: 2,
                items: [{ netUnits: 1 }, { netUnits: 1 }],
            },
        });
        if (outcome.status === "fulfilled")
            expect(outcome.value).not.toHaveProperty("refreshStatus");
    });
});
