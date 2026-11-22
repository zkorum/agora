import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { zstdCompressSync } from "node:zlib";
import { pushSchema } from "drizzle-kit/api-postgres";
import { desc, eq, getTableName, is, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import pino from "pino";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import {
    getClosedVoteWithdrawalStatus,
    withdrawClosedVotes,
} from "../src/service/closedVoteWithdrawal.js";
import { zodSSEConversationAnalysisUpdatedData } from "../src/shared/types/sse.js";
import { setClosedAnalysisInputMode } from "../src/service/closedAnalysisSelection.js";
import {
    fetchSurveyAggregatedResults,
    getActiveSurveyConfigRecord,
    setSurveyConfigForConversation,
    withdrawSurveyResponse,
} from "../src/service/survey.js";
import { scheduleAnalysisUpdate } from "../src/shared-backend/analysisScheduler.js";

const runFile = promisify(execFile);

function first<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing Polis retention fixture");
    return row;
}

describe("complete retained Polis evidence contracts", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "polis_retention",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "polis_retention",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (
                await pushSchema(schema, drizzlePg({ client: pool }))
            ).apply();
        } finally {
            await pool.end();
        }
        await db.transaction(async (tx) => {
            for (const filename of [
                "V0116.3__retain_complete_polis_inputs.sql",
                "V0116.4__bind_polis_analysis_closes.sql",
                "V0116.5__bind_polis_close_generations.sql",
                "V0116.6__certify_derived_polis_closing_inputs.sql",
                "V0116.7__fence_polis_close_publication.sql",
            ]) {
                await tx.execute(
                    sql.raw(
                        await readFile(
                            new URL(
                                `../database/flyway/${filename}`,
                                import.meta.url,
                            ),
                            "utf8",
                        ),
                    ),
                );
            }
        });
    }, 120_000);
    beforeEach(async () => {
        const tables = Object.values(schema)
            .filter((value) => is(value, PgTable))
            .map((table) => `"${getTableName(table)}"`);
        if (client === undefined) throw new Error("Missing test database");
        await client.unsafe(
            `TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
        );
    });
    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function runPython({
        script,
        env,
    }: {
        script: string;
        env?: NodeJS.ProcessEnv;
    }) {
        if (container === undefined)
            throw new Error("Missing PostgreSQL container");
        await runFile("uv", ["run", "python", "-c", script], {
            cwd: new URL("../../shared-analysis-worker/", import.meta.url),
            env: {
                ...process.env,
                ...env,
                AGORA_TEST_POSTGRES_DSN: `postgresql+psycopg://postgres:postgres@${container.getHost()}:${String(container.getMappedPort(5432))}/polis_retention`,
            },
            timeout: 30_000,
        });
    }

    async function seed({
        sourceVoteCount = 2,
        sourceParticipantCount = 2,
    }: {
        sourceVoteCount?: number;
        sourceParticipantCount?: number;
    } = {}) {
        const users = [randomUUID(), randomUUID()];
        await db
            .insert(schema.userTable)
            .values(
                users.map((id, index) => ({ id, username: `voter-${index}` })),
            );
        const project = first(
            await db
                .insert(schema.projectTable)
                .values({
                    slug: "retain",
                    title: "Retention",
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
                    slugId: "polis001",
                    projectId: project.id,
                    polisConfigId: config.id,
                    conversationType: "polis",
                })
                .returning(),
        );
        const complete = await capture({
            conversationId: conversation.id,
            participantCount: 2,
            opinionCount: 2,
            encodePayload: true,
        });
        const effective = await capture({
            conversationId: conversation.id,
            participantCount: 1,
            opinionCount: 1,
        });
        await db
            .insert(schema.analysisInputParticipantEligibilityTable)
            .values([
                ...users.map((userId, participantIndex) => ({
                    inputSnapshotId: complete.id,
                    participantIndex,
                    userId,
                })),
                {
                    inputSnapshotId: effective.id,
                    participantIndex: 0,
                    userId: first(users.slice(1)),
                },
            ]);
        await certify({
            inputId: complete.id,
            baselineId: complete.id,
            conversationId: conversation.id,
            indices: [0, 1],
            sourceVoteCount,
            sourceParticipantCount,
        });
        return {
            conversation,
            complete,
            effective,
            configId: config.id,
            users,
        };
    }

    async function capture({
        conversationId,
        participantCount,
        opinionCount,
        payloadVersion = 2,
        dataGeneration = 2,
        encodePayload = false,
    }: {
        conversationId: number;
        participantCount: number;
        opinionCount: number;
        payloadVersion?: number;
        dataGeneration?: number;
        encodePayload?: boolean;
    }) {
        const rawPayload = encodePayload
            ? Buffer.from(
                  JSON.stringify({
                      schema_version: 2,
                      conversation_id: conversationId,
                      data_generation: dataGeneration,
                      opinion_count: opinionCount,
                      participant_count: participantCount,
                      opinions: Array.from(
                          { length: opinionCount },
                          (_, index) => ({
                              opinion_id: index + 1,
                              opinion_content_id: index + 1,
                          }),
                      ),
                      votes: Array.from(
                          { length: participantCount },
                          (_, index) => ({
                              participant_index: index,
                              opinion_index: index % opinionCount,
                              vote: 1,
                          }),
                      ),
                  }),
              )
            : undefined;
        return first(
            await db
                .insert(schema.analysisInputSnapshotTable)
                .values({
                    conversationId,
                    dataGeneration,
                    inputHash:
                        rawPayload === undefined
                            ? randomUUID().replaceAll("-", "").repeat(2)
                            : createHash("sha256")
                                  .update(rawPayload)
                                  .digest("hex"),
                    payloadVersion,
                    participantCount,
                    opinionCount,
                    voteCount: participantCount,
                    compression: "zstd",
                    payload: (rawPayload === undefined
                        ? Buffer.from("metadata-contract-fixture")
                        : zstdCompressSync(rawPayload)
                    ).toString("base64url"),
                })
                .returning(),
        );
    }

    async function closingFixture() {
        const f = await seed();
        const content = first(
            await db
                .insert(schema.conversationContentTable)
                .values({
                    conversationId: f.conversation.id,
                    title: "Closing provenance",
                })
                .returning(),
        );
        const parent = first(
            await db
                .update(schema.conversationTable)
                .set({
                    currentContentId: content.id,
                    isClosed: true,
                    closingTargetRevision: 2,
                    closedFinalizedAt: new Date(),
                })
                .where(eq(schema.conversationTable.id, f.conversation.id))
                .returning(),
        );
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
                    key: "close-spec",
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
        const snapshot = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId: parent.id,
                    dataGeneration: 2,
                    inputSnapshotId: f.complete.id,
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db.insert(schema.analysisSnapshotResultTable).values({
            conversationId: parent.id,
            analysisSnapshotId: snapshot.id,
            opinionGroupSpecId: spec.id,
            outcome: "success",
        });
        const view = first(
            await db
                .insert(schema.conversationViewSnapshotTable)
                .values({
                    conversationId: parent.id,
                    opinionGroupSpecId: spec.id,
                    analysisSnapshotId: snapshot.id,
                    conversationContentId: content.id,
                    viewReason: "analysis_completed",
                    activatedAt: new Date(),
                    isClosed: true,
                    opinionCount: 2,
                    voteCount: 2,
                    participantCount: 2,
                    totalOpinionCount: 2,
                    totalVoteCount: 2,
                    totalParticipantCount: 2,
                    hiddenOpinionCount: 0,
                    moderatedOpinionCount: 0,
                })
                .returning(),
        );
        await db
            .insert(schema.conversationViewSnapshotCheckpointReasonTable)
            .values({
                conversationViewSnapshotId: view.id,
                conversationId: parent.id,
                opinionGroupSpecId: spec.id,
                reason: "conversation_closed",
            });
        if (parent.closedFinalizedAt === null)
            throw new Error("Missing finalized fixture");
        const closeValues = {
            conversationId: parent.id,
            closeEpoch: parent.voteBufferEpoch,
            sourceRevision: 2,
            finalizedAt: parent.closedFinalizedAt,
        };
        return {
            parent,
            closeValues,
            view,
            snapshot,
            spec,
            configId: f.configId,
            users: f.users,
            contentId: content.id,
        };
    }

    async function bindInitialClose({
        fixture: f,
        database = db,
    }: {
        fixture: Awaited<ReturnType<typeof closingFixture>>;
        database?: PostgresJsDatabase;
    }) {
        const close = first(
            await database
                .insert(schema.conversationAnalysisCloseTable)
                .values(f.closeValues)
                .returning(),
        );
        const refs = first(
            await database
                .insert(schema.polisAnalysisCloseTable)
                .values({
                    closeId: close.id,
                    conversationId: f.parent.id,
                    opinionGroupSpecId: f.spec.id,
                    originalViewSnapshotId: f.view.id,
                })
                .returning(),
        );
        return { close, refs };
    }

    it("invalidates Live inputs when an optional survey choice is withdrawn from a finalized Polis conversation", async () => {
        const f = await closingFixture();
        const { close } = await bindInitialClose({ fixture: f });
        const conversationId = f.parent.id;
        const conversationSlugId = f.parent.slugId;
        const participantId = first(f.users);
        const now = new Date();
        await db
            .update(schema.conversationTable)
            .set({ participationMode: "guest" })
            .where(eq(schema.conversationTable.id, conversationId));
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: 2 })
            .where(eq(schema.polisConversationConfigTable.id, f.configId));
        await db.insert(schema.deviceTable).values({
            didWrite: "did:test:withdraw",
            userId: participantId,
            userAgent: "Vitest",
            sessionExpiry: new Date(now.getTime() + 60_000),
        });
        await db.transaction(async (tx) => {
            await setSurveyConfigForConversation({
                db: tx,
                conversationSlugId,
                conversationId,
                now,
                surveyConfig: {
                    isOptional: true,
                    questions: [
                        {
                            questionType: "choice",
                            choiceDisplay: "list",
                            displayOrder: 0,
                            questionText: "Choose an option",
                            isRequired: true,
                            isPublicAggregateSuppressionEnabled: false,
                            constraints: {
                                type: "choice",
                                minSelections: 1,
                                maxSelections: 1,
                            },
                            options: [
                                {
                                    optionText: "Yes",
                                    displayOrder: 0,
                                    allowsText: false,
                                },
                                {
                                    optionText: "No",
                                    displayOrder: 1,
                                    allowsText: false,
                                },
                            ],
                        },
                    ],
                },
                sourceLanguageMetadata: {
                    sourceLanguageCode: null,
                    sourceLanguageConfidence: null,
                    sourceLanguageProvider: null,
                    sourceRawLanguageCode: null,
                },
            });
        });
        const survey = await getActiveSurveyConfigRecord({
            db,
            conversationId,
        });
        if (survey === undefined) throw new Error("Missing survey fixture");
        const question = first(survey.questions);
        const response = first(
            await db
                .insert(schema.surveyResponseTable)
                .values({ participantId, conversationId, completedAt: now })
                .returning(),
        );
        const answer = first(
            await db
                .insert(schema.surveyAnswerTable)
                .values({
                    surveyResponseId: response.id,
                    surveyQuestionId: question.id,
                    answeredQuestionSemanticVersion:
                        question.currentSemanticVersion,
                    conversationId,
                })
                .returning(),
        );
        await db.insert(schema.surveyAnswerOptionTable).values({
            surveyAnswerId: answer.id,
            surveyQuestionId: question.id,
            surveyQuestionOptionId: first(question.options).id,
        });
        const opinion = first(
            await db
                .insert(schema.opinionTable)
                .values({
                    slugId: "withdraw",
                    conversationId,
                    authorId: participantId,
                })
                .returning(),
        );
        const content = first(
            await db
                .insert(schema.opinionContentTable)
                .values({
                    opinionId: opinion.id,
                    conversationContentId: f.contentId,
                    content: "A statement",
                    contentPlainText: "A statement",
                })
                .returning(),
        );
        await db
            .update(schema.opinionTable)
            .set({ currentContentId: content.id })
            .where(eq(schema.opinionTable.id, opinion.id));
        const vote = first(
            await db
                .insert(schema.voteTable)
                .values({
                    authorId: participantId,
                    opinionId: opinion.id,
                })
                .returning(),
        );
        const voteContent = first(
            await db
                .insert(schema.voteContentTable)
                .values({
                    voteId: vote.id,
                    opinionContentId: content.id,
                    vote: "agree",
                })
                .returning(),
        );
        await db
            .update(schema.voteTable)
            .set({ currentContentId: voteContent.id })
            .where(eq(schema.voteTable.id, vote.id));

        expect(
            await withdrawSurveyResponse({
                db,
                conversationSlugId,
                didWrite: "did:test:withdraw",
                userAgent: "Vitest",
                now,
                currentDisplayLanguage: "en",
                skipEmailUpdateConsent: true,
                getEmailUpdateOnboardingAction: async () => undefined,
            }),
        ).toMatchObject({ success: true });

        expect(
            await db.select().from(schema.conversationAnalysisCloseTable),
        ).toEqual([close]);
        expect(
            await db.select().from(schema.polisConversationConfigTable),
        ).toMatchObject([{ analysisDataGeneration: 3 }]);
        expect(await db.select().from(schema.voteTable)).toMatchObject([
            { id: vote.id, currentContentId: voteContent.id },
        ]);
        expect(
            await db
                .select()
                .from(schema.analysisInputParticipantEligibilityTable),
        ).toContainEqual(
            expect.objectContaining({
                inputSnapshotId: f.snapshot.inputSnapshotId,
                userId: participantId,
            }),
        );
        expect(
            await db.select().from(schema.polisAnalysisCloseGenerationTable),
        ).toEqual([]);

        const owner = { db, conversationSlugId, userId: participantId };
        await expect(getClosedVoteWithdrawalStatus(owner)).resolves.toEqual({
            available: true,
            closeEpoch: close.closeEpoch,
        });
        const withdrawal = {
            db,
            userId: participantId,
            didWrite: "did:test:withdraw",
            now,
            request: {
                conversationSlugId,
                expectedViewerId: participantId,
                closeEpoch: close.closeEpoch,
            },
        };
        await expect(
            withdrawClosedVotes({
                ...withdrawal,
                request: { ...withdrawal.request, closeEpoch: randomUUID() },
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
        await expect(withdrawClosedVotes(withdrawal)).resolves.toEqual({
            success: true,
        });
        await expect(withdrawClosedVotes(withdrawal)).resolves.toEqual({
            success: true,
        });
        await expect(getClosedVoteWithdrawalStatus(owner)).resolves.toEqual({
            available: false,
        });
        expect(await db.select().from(schema.voteTable)).toMatchObject([
            {
                id: vote.id,
                currentContentId: null,
                withdrawnAt: expect.any(Date),
            },
        ]);
        expect(
            await db.select().from(schema.conversationAnalysisCloseTable),
        ).toEqual([close]);
        expect(
            await db.select().from(schema.polisConversationConfigTable),
        ).toMatchObject([{ analysisDataGeneration: 4 }]);
    });

    it("schedules ordinary Live work without retained evidence and binds only Closing work once evidence exists", async () => {
        const f = await closingFixture();
        const log = pino({ enabled: false });
        const conversationId = f.parent.id;
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: 2 })
            .where(eq(schema.polisConversationConfigTable.id, f.configId));
        const close = first(
            await db
                .insert(schema.conversationAnalysisCloseTable)
                .values(f.closeValues)
                .returning(),
        );
        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
                moderationChanged: true,
            }),
        ).toMatchObject({ dataGeneration: 3, scheduledSpecCount: 1 });
        const bindings = schema.polisAnalysisCloseGenerationTable;
        expect(await db.select().from(bindings)).toEqual([]);
        await db.insert(schema.polisAnalysisCloseTable).values({
            closeId: close.id,
            conversationId,
            opinionGroupSpecId: f.spec.id,
            originalViewSnapshotId: f.view.id,
        });
        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
                moderationChanged: true,
            }),
        ).toMatchObject({
            dataGeneration: 5,
            scheduledSpecCount: 2,
        });
        expect(await db.select().from(bindings)).toMatchObject([
            { closeId: close.id, conversationId, dataGeneration: 4 },
        ]);
        expect(await db.select().from(schema.analysisWorkStateTable)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ usesClosingInputs: false }),
                expect.objectContaining({ usesClosingInputs: true }),
            ]),
        );
        expect(
            first(await db.select().from(schema.conversationTable))
                .closingTargetRevision,
        ).toBe(2);
        expect(
            first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            ),
        ).toMatchObject({
            ...close,
            requestedResultRevision: 4,
            minimumClosingResultRevision: 4,
            selectionRevision: 1,
        });
        await expect(
            db
                .update(bindings)
                .set({ dataGeneration: 6 })
                .where(eq(bindings.closeId, close.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_close_generation_immutable" },
        });
        await expect(
            db.insert(bindings).values({
                closeId: close.id,
                conversationId,
                dataGeneration: 6,
                publishedAt: new Date(),
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_close_generation_initial" },
        });
        const rolledBack = new Error(
            "Roll back the caller's moderation transaction",
        );
        await expect(
            db.transaction(async (tx) => {
                expect(
                    await scheduleAnalysisUpdate({
                        db: tx,
                        log,
                        conversationId,
                        moderationChanged: true,
                    }),
                ).toMatchObject({ dataGeneration: 7 });
                throw rolledBack;
            }),
        ).rejects.toBe(rolledBack);
        expect(
            first(await db.select().from(schema.polisConversationConfigTable))
                .analysisDataGeneration,
        ).toBe(5);
        expect(
            first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            ),
        ).toMatchObject({ requestedResultRevision: 4, selectionRevision: 1 });
        await db
            .update(schema.conversationTable)
            .set({
                isClosed: false,
                closingTargetRevision: null,
                closedFinalizedAt: null,
                voteBufferEpoch: randomUUID(),
            })
            .where(eq(schema.conversationTable.id, conversationId));
        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
                moderationChanged: true,
            }),
        ).toMatchObject({ dataGeneration: 6, scheduledSpecCount: 1 });
        expect(await db.select().from(bindings)).toHaveLength(1);
    });

    it("certifies an identity-free Closing projection only against its bound close", async () => {
        const f = await closingFixture();
        await bindInitialClose({ fixture: f });
        const conversationId = f.parent.id;
        const log = pino({ enabled: false });
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: 2 })
            .where(eq(schema.polisConversationConfigTable.id, f.configId));
        const baselineId = f.snapshot.inputSnapshotId;
        const dataGeneration = 3;
        const derived = await capture({
            conversationId,
            dataGeneration,
            participantCount: 1,
            opinionCount: 1,
        });
        const certificate = {
            inputId: derived.id,
            baselineId,
            conversationId,
            indices: [1],
        };
        await expect(certify(certificate)).rejects.toMatchObject({
            cause: { constraint_name: "analysis_baseline_scope" },
        });
        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
                moderationChanged: true,
            }),
        ).toMatchObject({ dataGeneration: dataGeneration + 1 });

        // A different complete capture in the same conversation and source revision
        // is not evidence from the original close.
        const unrelated = await capture({
            conversationId,
            participantCount: 0,
            opinionCount: 0,
        });
        await certify({
            inputId: unrelated.id,
            baselineId: unrelated.id,
            conversationId,
            indices: [],
        });
        const empty = await capture({
            conversationId,
            dataGeneration,
            participantCount: 0,
            opinionCount: 0,
        });
        await expect(
            certify({
                inputId: empty.id,
                baselineId: unrelated.id,
                conversationId,
                indices: [],
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_closing_baseline_source" },
        });
        await certify(certificate);
        const account = first(
            await db.select({ id: schema.userTable.id }).from(schema.userTable),
        );
        await expect(
            db.insert(schema.analysisInputParticipantEligibilityTable).values({
                inputSnapshotId: derived.id,
                participantIndex: 0,
                userId: account.id,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_closing_input_identity_free" },
        });

        const liveCapture = await capture({
            conversationId,
            dataGeneration: 4,
            participantCount: 1,
            opinionCount: 1,
        });
        await expect(
            certify({ ...certificate, inputId: liveCapture.id }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_baseline_scope" },
        });
    });

    it("keeps Closing work current when ordinary Live inputs change", async () => {
        const log = pino({ enabled: false });
        const f = await closingFixture();
        const { close } = await bindInitialClose({ fixture: f });
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: close.sourceRevision })
            .where(eq(schema.polisConversationConfigTable.id, f.configId));
        const conversationId = f.parent.id;
        const table = schema.conversationAnalysisCloseTable;
        const readClose = async () => first(await db.select().from(table));

        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
            }),
        ).toMatchObject({ dataGeneration: 3, scheduledSpecCount: 1 });
        expect(await readClose()).toMatchObject({
            minimumClosingResultRevision: 0,
            requestedResultRevision: null,
            servedResultRevision: null,
        });
        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
                moderationChanged: true,
            }),
        ).toMatchObject({ dataGeneration: 5, scheduledSpecCount: 2 });
        expect(await readClose()).toMatchObject({
            minimumClosingResultRevision: 4,
            requestedResultRevision: 4,
            servedResultRevision: null,
        });

        await db
            .update(table)
            .set({ selectedInputMode: "live" })
            .where(eq(table.id, close.id));
        expect(
            await scheduleAnalysisUpdate({
                db,
                log,
                conversationId,
            }),
        ).toMatchObject({ dataGeneration: 6, scheduledSpecCount: 1 });
        expect(await readClose()).toMatchObject({
            minimumClosingResultRevision: 4,
            requestedResultRevision: 6,
            servedResultRevision: null,
        });
    });

    it("switches to ready Live immediately and reuses pending Live work across repeated switches", async () => {
        const f = await closingFixture();
        const { close } = await bindInitialClose({ fixture: f });
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: close.sourceRevision })
            .where(eq(schema.polisConversationConfigTable.id, f.configId));
        const users = await db
            .select({ id: schema.userTable.id })
            .from(schema.userTable)
            .orderBy(schema.userTable.username);
        const actor = first(users);
        const outsider = first(users.slice(1));
        const organization = first(
            await db
                .insert(schema.organizationTable)
                .values({
                    slug: "facilitators",
                    displayName: "Facilitators",
                    defaultLanguageCode: "en",
                    isFullImagePath: false,
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        await db.insert(schema.organizationMembershipTable).values({
            role: "manager",
            organizationId: organization.id,
            userId: actor.id,
        });
        await db.insert(schema.projectOrganizationOwnershipTable).values({
            projectId: f.parent.projectId,
            organizationId: organization.id,
        });
        const selectMode = {
            db,
            request: {
                conversationSlugId: f.parent.slugId,
                closeId: close.id,
                selectionRevision: 0,
                inputMode: "live",
            },
            userId: actor.id,
        } satisfies Parameters<typeof setClosedAnalysisInputMode>[0];
        await expect(
            setClosedAnalysisInputMode({ ...selectMode, userId: outsider.id }),
        ).rejects.toMatchObject({ statusCode: 403 });
        const table = schema.conversationAnalysisCloseTable;
        const readClose = async () => first(await db.select().from(table));
        const switchTo = async ({
            inputMode,
            selectionRevision,
        }: Pick<
            Parameters<typeof setClosedAnalysisInputMode>[0]["request"],
            "inputMode" | "selectionRevision"
        >) =>
            await setClosedAnalysisInputMode({
                ...selectMode,
                request: {
                    ...selectMode.request,
                    inputMode,
                    selectionRevision,
                },
            });
        await expect(
            setClosedAnalysisInputMode(selectMode),
        ).resolves.toMatchObject({
            selectionRevision: 1,
        });
        expect(await readClose()).toMatchObject({
            servedInputMode: "live",
            servedResultRevision: close.sourceRevision,
        });
        await switchTo({ inputMode: "closing", selectionRevision: 1 });
        const live = await scheduleAnalysisUpdate({
            db,
            log: pino({ enabled: false }),
            conversationId: f.parent.id,
        });
        const repeated = await Promise.all([
            switchTo({ inputMode: "live", selectionRevision: 2 }),
            switchTo({ inputMode: "live", selectionRevision: 2 }),
        ]);
        expect(repeated.map((value) => value.selectionRevision)).toEqual([
            3, 3,
        ]);
        expect(await readClose()).toMatchObject({
            selectedInputMode: "live",
            requestedResultRevision: live.dataGeneration,
            servedInputMode: "closing",
            servedResultRevision: null,
        });
        await expect(
            switchTo({ inputMode: "closing", selectionRevision: 2 }),
        ).rejects.toMatchObject({ statusCode: 409 });
        await expect(
            switchTo({ inputMode: "closing", selectionRevision: 3 }),
        ).resolves.toMatchObject({ selectionRevision: 4 });
        expect(await readClose()).toMatchObject({
            selectedInputMode: "closing",
            servedInputMode: "closing",
            requestedResultRevision: null,
            servedResultRevision: null,
        });
        await expect(
            switchTo({ inputMode: "live", selectionRevision: 4 }),
        ).resolves.toMatchObject({ selectionRevision: 5 });
        expect(await readClose()).toMatchObject({
            selectedInputMode: "live",
            requestedResultRevision: live.dataGeneration,
            servedInputMode: "closing",
        });
        expect(
            await db.select().from(schema.polisAnalysisCloseGenerationTable),
        ).toEqual([]);
        expect(
            await db.select().from(schema.polisConversationConfigTable),
        ).toMatchObject([{ analysisDataGeneration: live.dataGeneration }]);
    });

    async function bindSecondSpec({
        fixture: f,
        closeId,
    }: {
        fixture: Awaited<ReturnType<typeof closingFixture>>;
        closeId: number;
    }) {
        const conversationId = f.parent.id;
        const { id: _, ...specValues } = f.spec;
        const secondSpec = first(
            await db
                .insert(schema.opinionGroupSpecTable)
                .values({ ...specValues, key: "second-close-spec" })
                .returning(),
        );
        const result = {
            conversationId,
            analysisSnapshotId: f.snapshot.id,
            opinionGroupSpecId: secondSpec.id,
            outcome: "success",
        } satisfies typeof schema.analysisSnapshotResultTable.$inferInsert;
        await db.insert(schema.analysisSnapshotResultTable).values(result);
        const { id: _viewId, ...viewValues } = f.view;
        const secondView = first(
            await db
                .insert(schema.conversationViewSnapshotTable)
                .values({ ...viewValues, opinionGroupSpecId: secondSpec.id })
                .returning(),
        );
        await db
            .insert(schema.conversationViewSnapshotCheckpointReasonTable)
            .values({
                conversationViewSnapshotId: secondView.id,
                conversationId,
                opinionGroupSpecId: secondSpec.id,
                reason: "conversation_closed",
            });
        await db.insert(schema.polisAnalysisCloseTable).values({
            closeId,
            conversationId,
            opinionGroupSpecId: secondSpec.id,
            originalViewSnapshotId: secondView.id,
        });
        return secondSpec;
    }

    async function seedFrozenSurvey({
        fixture: f,
        opinionGroupVariantId,
    }: {
        fixture: Awaited<ReturnType<typeof closingFixture>>;
        opinionGroupVariantId: number;
    }) {
        const conversationId = f.parent.id;
        const config = first(
            await db
                .insert(schema.surveyConfigTable)
                .values({ conversationId, deletedAt: new Date() })
                .returning(),
        );
        const aggregate = first(
            await db
                .insert(schema.surveyAggregateSnapshotTable)
                .values({
                    conversationId,
                    analysisSnapshotId: f.snapshot.id,
                    surveyConfigId: config.id,
                    surveyConfigRevision: config.currentRevision,
                    suppressionThreshold: 5,
                })
                .returning(),
        );
        const question = first(
            await db
                .insert(schema.surveyAggregateQuestionTable)
                .values({
                    surveyAggregateSnapshotId: aggregate.id,
                    questionSlugId: "question",
                    questionOrder: 0,
                    questionType: "choice",
                    questionText: "Where do you live?",
                    isRequired: false,
                    questionSemanticVersion: 1,
                })
                .returning(),
        );
        const option = first(
            await db
                .insert(schema.surveyAggregateOptionTable)
                .values({
                    surveyAggregateQuestionId: question.id,
                    optionSlugId: "option01",
                    optionOrder: 0,
                    optionText: "In town",
                })
                .returning(),
        );
        const result = first(
            await db
                .select({ id: schema.analysisSnapshotResultTable.id })
                .from(schema.analysisSnapshotResultTable)
                .where(
                    eq(
                        schema.analysisSnapshotResultTable.opinionGroupSpecId,
                        f.spec.id,
                    ),
                ),
        );
        const scope = first(
            await db
                .insert(schema.opinionGroupLineageScopeTable)
                .values({ conversationId, opinionGroupVariantId })
                .returning(),
        );
        const candidate = first(
            await db
                .insert(schema.opinionGroupCandidateTable)
                .values({
                    snapshotResultId: result.id,
                    opinionGroupVariantId,
                    scopeId: scope.id,
                    outcome: "success",
                })
                .returning(),
        );
        await db.insert(schema.opinionGroupCandidateAssessmentTable).values({
            candidateId: candidate.id,
            selectionScore: 0.5,
        });
        const group = first(
            await db
                .insert(schema.opinionGroupTable)
                .values({
                    candidateId: candidate.id,
                    scopeId: scope.id,
                    key: "0",
                    externalId: 0,
                    numUsers: 1,
                })
                .returning(),
        );
        const row = {
            surveyAggregateSnapshotId: aggregate.id,
            surveyAggregateQuestionId: question.id,
            surveyAggregateOptionId: option.id,
            isSuppressed: false,
        };
        await db.insert(schema.surveyAggregateResultTable).values([
            { ...row, scope: "overall", suppressedCount: 1, fullCount: 1 },
            {
                ...row,
                scope: "opinion_group",
                candidateId: candidate.id,
                groupId: group.id,
                suppressedCount: 1,
                fullCount: 1,
            },
        ]);
        return { aggregateId: aggregate.id, candidateId: candidate.id };
    }

    it("keeps a pinned capture and accepted generation immutable", async () => {
        const f = await closingFixture();
        const { close } = await bindInitialClose({ fixture: f });
        const conversationId = f.parent.id;
        const secondSpec = await bindSecondSpec({
            fixture: f,
            closeId: close.id,
        });
        const { id: originalViewId, ...viewValues } = f.view;
        const slots = schema.polisAnalysisCloseTable;
        const result = {
            conversationId,
            opinionGroupSpecId: f.spec.id,
            analysisSnapshotId: f.snapshot.id,
            outcome: "success",
        } satisfies typeof schema.analysisSnapshotResultTable.$inferInsert;
        await db
            .update(schema.polisConversationConfigTable)
            .set({ analysisDataGeneration: 2 })
            .where(eq(schema.polisConversationConfigTable.id, f.configId));
        await scheduleAnalysisUpdate({
            db,
            log: pino({ enabled: false }),
            conversationId,
            moderationChanged: true,
        });
        const generations = schema.polisAnalysisCloseGenerationTable;
        const schedule = first(await db.select().from(generations));
        const input = await capture({
            conversationId,
            dataGeneration: schedule.dataGeneration,
            participantCount: 2,
            opinionCount: 2,
        });
        await certify({
            inputId: input.id,
            baselineId: f.snapshot.inputSnapshotId,
            conversationId,
            indices: [0, 1],
        });
        const generationFilter = eq(
            generations.dataGeneration,
            schedule.dataGeneration,
        );
        await db
            .update(generations)
            .set({ inputSnapshotId: input.id })
            .where(generationFilter);
        const stagedAnalysis = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId,
                    inputSnapshotId: input.id,
                    dataGeneration: schedule.dataGeneration,
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db.insert(schema.analysisSnapshotResultTable).values(
            [f.spec.id, secondSpec.id].map((opinionGroupSpecId) => ({
                ...result,
                opinionGroupSpecId,
                analysisSnapshotId: stagedAnalysis.id,
            })),
        );
        const replacement = {
            ...viewValues,
            activatedAt: null,
            analysisSnapshotId: stagedAnalysis.id,
            closeReplacementGeneration: schedule.dataGeneration,
        };
        await db.insert(schema.conversationViewSnapshotTable).values({
            ...replacement,
            opinionGroupSpecId: secondSpec.id,
        });
        const publish = async () =>
            await db
                .update(generations)
                .set({ publishedAt: new Date() })
                .where(generationFilter);
        const differentInput = await capture({
            conversationId,
            dataGeneration: schedule.dataGeneration,
            participantCount: 2,
            opinionCount: 2,
        });
        await certify({
            inputId: differentInput.id,
            baselineId: f.snapshot.inputSnapshotId,
            conversationId,
            indices: [0, 1],
        });
        await expect(
            db
                .update(generations)
                .set({ inputSnapshotId: differentInput.id })
                .where(generationFilter),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_close_publication_immutable" },
        });
        const differentAnalysis = first(
            await db
                .insert(schema.analysisSnapshotTable)
                .values({
                    conversationId,
                    inputSnapshotId: differentInput.id,
                    dataGeneration: schedule.dataGeneration,
                    computedAt: new Date(),
                })
                .returning(),
        );
        await db.insert(schema.analysisSnapshotResultTable).values({
            ...result,
            opinionGroupSpecId: f.spec.id,
            analysisSnapshotId: differentAnalysis.id,
        });
        await expect(
            db.insert(schema.conversationViewSnapshotTable).values({
                ...replacement,
                analysisSnapshotId: differentAnalysis.id,
            }),
        ).rejects.toMatchObject({
            cause: {
                constraint_name: "polis_close_replacement_capture",
            },
        });
        expect(
            first(await db.select().from(generations)).publishedAt,
        ).toBeNull();
        await db
            .insert(schema.conversationViewSnapshotTable)
            .values(replacement);
        await publish();
        const publication = first(await db.select().from(generations));
        expect(publication.publishedAt).toBeInstanceOf(Date);
        expect(publication.inputSnapshotId).toBe(input.id);
        expect(
            first(
                await db
                    .select()
                    .from(slots)
                    .where(eq(slots.opinionGroupSpecId, f.spec.id)),
            ).originalViewSnapshotId,
        ).toBe(originalViewId);
        await expect(
            db
                .update(generations)
                .set({ publishedAt: null })
                .where(generationFilter),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_close_publication_immutable" },
        });
    });

    it.runIf(process.env.AGORA_TEST_PYTHON_WORKER === "true").each([
        { inputMode: "closing", retainsSurveyChoices: false },
        { inputMode: "closing", retainsSurveyChoices: true },
        { inputMode: "live", retainsSurveyChoices: false },
    ] satisfies Array<{
        inputMode: typeof schema.conversationAnalysisCloseTable.$inferSelect.selectedInputMode;
        retainsSurveyChoices: boolean;
    }>)(
        "publishes $inputMode after unlinking (retained survey choices: $retainsSurveyChoices)",
        async ({ inputMode, retainsSurveyChoices }) => {
            const original = await closingFixture();
            const variant = first(
                await db
                    .insert(schema.opinionGroupVariantTable)
                    .values({
                        opinionGroupSpecId: original.spec.id,
                        groupCount: 2,
                    })
                    .returning(),
            );
            const survey =
                inputMode === "closing"
                    ? await seedFrozenSurvey({
                          fixture: original,
                          opinionGroupVariantId: variant.id,
                      })
                    : undefined;
            if (retainsSurveyChoices && survey !== undefined) {
                await runPython({
                    script: [
                        "import os",
                        "from sqlalchemy import create_engine",
                        "from sqlalchemy.orm import Session",
                        "from agora_analysis_worker_shared.db import _persist_initial_closing_survey_choices",
                        "from agora_analysis_worker_shared.survey_aggregates import SurveyChoiceAnswer",
                        `conversation_id = ${String(original.parent.id)}`,
                        `snapshot_id = ${String(original.snapshot.id)}`,
                        `survey_id = ${String(survey.aggregateId)}`,
                        "engine = create_engine(os.environ['AGORA_TEST_POSTGRES_DSN'])",
                        "with Session(engine) as session, session.begin():",
                        "    _persist_initial_closing_survey_choices(session, snapshot_ids_by_conversation_id={conversation_id: snapshot_id}, survey_ids_by_conversation_id={conversation_id: survey_id}, choices_by_conversation_id={conversation_id: [SurveyChoiceAnswer(1, 'question', ('option01',))]})",
                        "engine.dispose()",
                    ].join("\n"),
                });
                expect(
                    await db.select().from(schema.analysisSurveyChoiceTable),
                ).toEqual([
                    {
                        surveyAggregateSnapshotId: survey.aggregateId,
                        participantIndex: 1,
                        questionSlugId: "question",
                        optionSlugIds: ["option01"],
                    },
                ]);
            }
            const f =
                survey === undefined
                    ? original
                    : {
                          ...original,
                          view: first(
                              await db
                                  .update(schema.conversationViewSnapshotTable)
                                  .set({
                                      surveyAggregateSnapshotId:
                                          survey.aggregateId,
                                  })
                                  .where(
                                      eq(
                                          schema.conversationViewSnapshotTable
                                              .id,
                                          original.view.id,
                                      ),
                                  )
                                  .returning(),
                          ),
                      };
            const { close } = await bindInitialClose({ fixture: f });
            const secondSpec = await bindSecondSpec({
                fixture: f,
                closeId: close.id,
            });
            const { id: _originalSpecId, ...originalSpec } = f.spec;
            const currentSpec = first(
                await db
                    .insert(schema.opinionGroupSpecTable)
                    .values({
                        ...originalSpec,
                        version: originalSpec.version + 1,
                    })
                    .returning(),
            );
            await db
                .insert(schema.opinionGroupVariantTable)
                .values({ opinionGroupSpecId: currentSpec.id, groupCount: 2 });
            const conversationId = f.parent.id;
            await db
                .update(schema.polisConversationConfigTable)
                .set({ analysisDataGeneration: 2 })
                .where(eq(schema.polisConversationConfigTable.id, f.configId));
            await db
                .update(schema.analysisInputParticipantEligibilityTable)
                .set({ userId: null, isAccountHidden: true })
                .where(
                    eq(
                        schema.analysisInputParticipantEligibilityTable
                            .inputSnapshotId,
                        f.snapshot.inputSnapshotId,
                    ),
                );
            if (inputMode === "live") {
                await db
                    .update(schema.conversationAnalysisCloseTable)
                    .set({ selectedInputMode: "live" })
                    .where(
                        eq(schema.conversationAnalysisCloseTable.id, close.id),
                    );
            }
            const ordinary = await scheduleAnalysisUpdate({
                db,
                log: pino({ enabled: false }),
                conversationId,
                moderationChanged: inputMode === "closing",
            });
            const generations = schema.polisAnalysisCloseGenerationTable;
            const revision =
                inputMode === "closing"
                    ? first(await db.select().from(generations)).dataGeneration
                    : ordinary.dataGeneration;
            await db.insert(schema.opinionTable).values([
                { conversationId, slugId: "erased01", deletedAt: new Date() },
                { conversationId, slugId: "erased02", deletedAt: new Date() },
            ]);
            await db
                .insert(schema.opinionGroupVariantTable)
                .values({ opinionGroupSpecId: secondSpec.id, groupCount: 2 });
            const script = [
                "import os",
                "from dataclasses import replace",
                "from sqlalchemy import create_engine",
                "from sqlalchemy.orm import Session",
                "from agora_analysis_worker_shared.analysis_compute import CandidateAssessment, ComputedGroupOpinionStats, ComputedOpinionGroup, ComputedOpinionGroupCandidate, ComputedRepresentativeOpinion, compute_analysis_bundle",
                "from agora_analysis_worker_shared.db import capture_closing_analysis_input, claim_work_items_and_fetch_inputs_batch, fetch_claimable_work_conversation_ids, fetch_opinion_group_configs, persist_analysis_baselines_batch, persist_computed_analysis_results_batch, persist_empty_vote_matrix_results_batch",
                "from agora_analysis_worker_shared.input_snapshot import prepare_input_snapshot",
                "from agora_analysis_worker_shared.retained_inputs import LiveAnalysisResultInput, prepare_analysis_baseline",
                "from agora_analysis_worker_shared.generated_models import AnalysisResultOutcomeEnum, PolisAnalysisCloseGeneration, VoteEnumSimple",
                "engine = create_engine(os.environ['AGORA_TEST_POSTGRES_DSN'])",
                `conversation_id = ${String(conversationId)}`,
                "def run_spec():",
                "    assert set(fetch_claimable_work_conversation_ids(engine, limit=5, analysis_engine_epoch=1)) == {conversation_id}",
                "    batch = claim_work_items_and_fetch_inputs_batch(engine, worker_id='test-worker', conversation_ids=[conversation_id], lease_ttl_seconds=60, limit=1, analysis_engine_epoch=1)",
                "    (claim,) = batch.claims",
                "    if claim.uses_closing_inputs:",
                "        assert not batch.inputs_by_conversation_id",
                "        with Session(engine) as session, session.begin():",
                "            result, capture = capture_closing_analysis_input(session=session, claim=claim)",
                "        with Session(engine) as session, session.begin():",
                "            assert capture_closing_analysis_input(session=session, claim=claim) == (result, capture)",
                "        config = fetch_opinion_group_configs(engine, opinion_group_spec_ids=[claim.opinion_group_spec_id])[claim.opinion_group_spec_id]",
                "        computed = compute_analysis_bundle(snapshot=result.numerical, config=config)",
                ...(retainsSurveyChoices
                    ? [
                          "        success = AnalysisResultOutcomeEnum.success",
                          "        groups = []",
                          "        for index in range(2):",
                          "            representative = ComputedRepresentativeOpinion(index, VoteEnumSimple.agree, 0.9, 1, {})",
                          "            stats = ComputedGroupOpinionStats(index, 1, 0, 0, representative)",
                          "            groups.append(ComputedOpinionGroup(str(index), index, [index], [representative], [stats]))",
                          "        candidate = ComputedOpinionGroupCandidate(opinion_group_variant_id=config.variants[0].id, group_count=2, outcome=success, outcome_reason=None, raw_output=None, groups=groups, assessment=CandidateAssessment(0.5, 0, 1, 0.5, None), opinion_metrics=[])",
                          "        computed = replace(computed, outcome=success, outcome_reason=None, candidates=[candidate])",
                      ]
                    : []),
                "        persist_computed_analysis_results_batch(engine, claims=[claim], stored_input_snapshots_by_conversation_id={conversation_id: capture}, inputs_by_conversation_id={conversation_id: result}, bundles_by_conversation_id={conversation_id: computed}, ai_generation_expected=False)",
                "    else:",
                "        inputs = batch.inputs_by_conversation_id[conversation_id]",
                "        assert not inputs.complete.votes and not inputs.complete.opinions",
                "        prepared = prepare_input_snapshot(conversation_id=conversation_id, data_generation=claim.data_generation, rows=inputs.complete.votes, opinion_rows=inputs.complete.opinions)",
                "        baseline = prepare_analysis_baseline(effective=prepared, complete=prepared, source_counts=inputs.source_counts)",
                "        stored = persist_analysis_baselines_batch(engine, baselines=[baseline])",
                "        persist_empty_vote_matrix_results_batch(engine, claims=[claim], stored_input_snapshots_by_conversation_id=stored, inputs_by_conversation_id={conversation_id: LiveAnalysisResultInput(numerical=prepared)})",
                "    return claim",
                "try:",
                "    closing_count = 0",
                "    while fetch_claimable_work_conversation_ids(engine, limit=5, analysis_engine_epoch=1):",
                "        claim = run_spec()",
                "        if claim.uses_closing_inputs:",
                "            closing_count += 1",
                "            if closing_count == 1:",
                "                with Session(engine) as session:",
                `                    assert session.get_one(PolisAnalysisCloseGeneration, (conversation_id, ${String(revision)})).published_at is None`,
                `    assert closing_count == ${inputMode === "closing" ? 2 : 0}`,
                "    assert not fetch_claimable_work_conversation_ids(engine, limit=5, analysis_engine_epoch=1)",
                "finally:",
                "    engine.dispose()",
            ].join("\n");
            await runPython({ script });
            const derived = first(
                await db
                    .select()
                    .from(schema.analysisInputSnapshotTable)
                    .where(
                        eq(
                            schema.analysisInputSnapshotTable.dataGeneration,
                            revision,
                        ),
                    ),
            );
            expect(
                first(
                    await db
                        .select()
                        .from(schema.analysisInputBaselineTable)
                        .where(
                            eq(
                                schema.analysisInputBaselineTable
                                    .inputSnapshotId,
                                derived.id,
                            ),
                        ),
                ),
            ).toMatchObject({
                baselineInputSnapshotId:
                    inputMode === "closing"
                        ? f.snapshot.inputSnapshotId
                        : derived.id,
                participantIndices: inputMode === "closing" ? [0, 1] : [],
                opinionIndices: inputMode === "closing" ? [0, 1] : [],
            });
            expect(
                await db
                    .select()
                    .from(schema.analysisInputParticipantEligibilityTable)
                    .where(
                        eq(
                            schema.analysisInputParticipantEligibilityTable
                                .inputSnapshotId,
                            derived.id,
                        ),
                    ),
            ).toEqual([]);
            const view = schema.conversationViewSnapshotTable;
            const replacements = await db
                .select()
                .from(view)
                .where(eq(view.closeReplacementGeneration, revision))
                .orderBy(desc(view.createdAt), desc(view.id));
            const events = await db
                .select()
                .from(schema.realtimeEventOutboxTable);
            const served = first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            );
            if (inputMode === "closing") {
                expect(await db.select().from(generations)).toMatchObject([
                    {
                        inputSnapshotId: derived.id,
                        publishedAt: expect.any(Date),
                    },
                ]);
                expect(replacements).toHaveLength(2);
                expect(served).toMatchObject({
                    servedInputMode: "closing",
                    servedResultRevision: revision,
                    requestedResultRevision: revision,
                    selectionRevision: 2,
                });
                const closingEvents = events
                    .map((event) =>
                        zodSSEConversationAnalysisUpdatedData.parse(
                            event.payload,
                        ),
                    )
                    .filter(
                        (event) =>
                            event.conversationViewSnapshotId ===
                            first(replacements).id,
                    );
                expect(closingEvents).toHaveLength(1);
                expect(first(closingEvents)).toMatchObject({
                    conversationViewSnapshotId: first(replacements).id,
                    checkpointChanged: false,
                });
                const servedView = first(replacements);
                const originalView = first(
                    await db
                        .select()
                        .from(schema.polisAnalysisCloseTable)
                        .where(
                            eq(
                                schema.polisAnalysisCloseTable
                                    .opinionGroupSpecId,
                                servedView.opinionGroupSpecId,
                            ),
                        ),
                );
                const surveyRead = {
                    db,
                    conversationSlugId: f.parent.slugId,
                    analysisView: undefined,
                    accessLevel: "public",
                    displayLanguage: "en",
                } satisfies Omit<
                    Parameters<typeof fetchSurveyAggregatedResults>[0],
                    "checkpointViewSnapshotId"
                >;
                const frozen = await fetchSurveyAggregatedResults({
                    ...surveyRead,
                    checkpointViewSnapshotId: undefined,
                });
                if (retainsSurveyChoices) {
                    expect(frozen.source).toEqual({
                        kind: "polis_frame",
                        viewSnapshotId: servedView.id,
                        candidateId: expect.any(Number),
                    });
                    expect(frozen.suppressedRows).toMatchObject([
                        { scope: "overall", count: 1 },
                        { scope: "cluster", clusterId: "0", count: 0 },
                        { scope: "cluster", clusterId: "1", count: 1 },
                    ]);
                } else {
                    expect(frozen.source).toEqual({
                        kind: "original_close",
                        viewSnapshotId: servedView.id,
                        originalViewSnapshotId:
                            originalView.originalViewSnapshotId,
                    });
                    expect(frozen.suppressedRows).toMatchObject([
                        { scope: "overall", count: 1 },
                    ]);
                }
                expect(frozen.fullRows).toBeUndefined();

                const closingCheckpoint = await fetchSurveyAggregatedResults({
                    ...surveyRead,
                    checkpointViewSnapshotId: f.view.id,
                });
                const anchoredView = first(
                    replacements.filter(
                        (row) => row.opinionGroupSpecId === f.spec.id,
                    ),
                );
                expect(closingCheckpoint.source).toMatchObject({
                    kind: retainsSurveyChoices
                        ? "polis_frame"
                        : "original_close",
                    viewSnapshotId: anchoredView.id,
                });
                expect(closingCheckpoint.suppressedRows).toEqual(
                    frozen.suppressedRows,
                );
                expect(first(closingEvents)).toMatchObject({
                    closingCheckpointIds: expect.arrayContaining([f.view.id]),
                });
                if (survey === undefined)
                    throw new Error("Missing retained survey fixture");
                const originalSurvey = await db
                    .select()
                    .from(schema.surveyAggregateResultTable)
                    .where(
                        eq(
                            schema.surveyAggregateResultTable.candidateId,
                            survey.candidateId,
                        ),
                    );
                expect(originalSurvey).toMatchObject([
                    { scope: "opinion_group", fullCount: 1 },
                ]);
            } else {
                expect(await db.select().from(generations)).toEqual([]);
                expect(replacements).toEqual([]);
                expect(served).toMatchObject({
                    servedInputMode: "live",
                    servedResultRevision: revision,
                    requestedResultRevision: revision,
                });
                const ordinaryViews = await db
                    .select({ activatedAt: view.activatedAt })
                    .from(view)
                    .innerJoin(
                        schema.analysisSnapshotTable,
                        eq(
                            view.analysisSnapshotId,
                            schema.analysisSnapshotTable.id,
                        ),
                    )
                    .where(
                        eq(
                            schema.analysisSnapshotTable.dataGeneration,
                            revision,
                        ),
                    );
                expect(ordinaryViews).toMatchObject([
                    { activatedAt: expect.any(Date) },
                    { activatedAt: expect.any(Date) },
                ]);
            }
            for (const replacement of replacements)
                expect(replacement).toMatchObject({
                    activatedAt: null,
                    surveyAggregateSnapshotId: retainsSurveyChoices
                        ? expect.any(Number)
                        : null,
                    voteCount: inputMode === "closing" ? 2 : 0,
                });
            expect(
                await db
                    .select()
                    .from(schema.conversationViewSnapshotCheckpointReasonTable),
            ).toHaveLength(2);
            const opinions = await db
                .select()
                .from(schema.analysisSnapshotOpinionTable);
            expect(opinions).toHaveLength(inputMode === "closing" ? 4 : 0);
            expect(
                opinions.every((opinion) => opinion.opinionContentId === null),
            ).toBe(true);
        },
        40_000,
    );

    it("seals shared selection and native references without changing the closing graph", async () => {
        const f = await closingFixture();
        const { close, refs } = await bindInitialClose({ fixture: f });
        expect(close.selectedInputMode).toBe("closing");
        expect(refs.originalViewSnapshotId).toBe(f.view.id);
        expect(
            first(await db.select().from(schema.conversationViewSnapshotTable)),
        ).toEqual(f.view);
        await db
            .update(schema.conversationAnalysisCloseTable)
            .set({ selectedInputMode: "live" })
            .where(eq(schema.conversationAnalysisCloseTable.id, close.id));
        expect(
            first(await db.select().from(schema.conversationAnalysisCloseTable))
                .selectedInputMode,
        ).toBe("live");
        await expect(
            db
                .insert(schema.conversationAnalysisCloseTable)
                .values(f.closeValues),
        ).rejects.toMatchObject({ cause: { code: "23505" } });
    });

    // API-only jobs do not install the Python worker toolchain.
    it.runIf(process.env.AGORA_TEST_PYTHON_WORKER === "true")(
        "runs the worker finalizer against the canonical PostgreSQL close contracts",
        async () => {
            const f = await closingFixture();
            await db
                .update(schema.polisConversationConfigTable)
                .set({ analysisDataGeneration: 2 })
                .where(eq(schema.polisConversationConfigTable.id, f.configId));
            await db
                .update(schema.conversationTable)
                .set({ closedFinalizedAt: null })
                .where(eq(schema.conversationTable.id, f.parent.id));
            const script = [
                "import os",
                "from sqlalchemy import create_engine",
                "from sqlalchemy.orm import Session",
                "from agora_analysis_worker_shared.analysis_lifecycle import finalize_closed_analysis",
                "engine = create_engine(os.environ['AGORA_TEST_POSTGRES_DSN'])",
                "try:",
                "    with Session(engine) as session, session.begin():",
                "        finalize_closed_analysis(session, conversation_ids=[int(os.environ['AGORA_TEST_CONVERSATION_ID'])])",
                "finally:",
                "    engine.dispose()",
            ].join("\n");
            await runPython({
                script,
                env: { AGORA_TEST_CONVERSATION_ID: String(f.parent.id) },
            });
            const close = first(
                await db.select().from(schema.conversationAnalysisCloseTable),
            );
            expect(close.selectedInputMode).toBe("closing");
            expect(close.closeEpoch).toBe(f.parent.voteBufferEpoch);
            expect(close.sourceRevision).toBe(2);
            expect(
                first(await db.select().from(schema.polisAnalysisCloseTable)),
            ).toMatchObject({
                closeId: close.id,
                originalViewSnapshotId: f.view.id,
            });
            expect(
                await db.select().from(schema.conversationViewSnapshotTable),
            ).toHaveLength(1);
        },
        40_000,
    );

    it.each([
        "open",
        "erased",
        "deleted",
        "importing",
        "undrained",
        "epoch",
        "revision",
        "finalization",
    ])(
        "fences selection after parent invalidation: %s",
        async (invalidation) => {
            const f = await closingFixture();
            const { close } = await bindInitialClose({ fixture: f });
            switch (invalidation) {
                case "open":
                    await db.update(schema.conversationTable).set({
                        isClosed: false,
                        closedFinalizedAt: null,
                        closingTargetRevision: null,
                    });
                    break;
                case "erased":
                    await db
                        .update(schema.conversationTable)
                        .set({ currentContentId: null });
                    break;
                case "deleted":
                    await db
                        .update(schema.conversationTable)
                        .set({ deletedAt: new Date(), currentContentId: null });
                    break;
                case "importing":
                    await db
                        .update(schema.conversationTable)
                        .set({ isImporting: true });
                    break;
                case "undrained":
                    await db
                        .update(schema.conversationTable)
                        .set({ voteBufferDrained: false });
                    break;
                case "epoch":
                    await db
                        .update(schema.conversationTable)
                        .set({ voteBufferEpoch: randomUUID() });
                    break;
                case "revision":
                    await db
                        .update(schema.conversationTable)
                        .set({ closingTargetRevision: 3 });
                    break;
                case "finalization":
                    await db.update(schema.conversationTable).set({
                        closedFinalizedAt: new Date(
                            f.closeValues.finalizedAt.getTime() + 10_000,
                        ),
                    });
            }
            await expect(
                db
                    .update(schema.conversationAnalysisCloseTable)
                    .set({ selectedInputMode: "live" })
                    .where(
                        eq(schema.conversationAnalysisCloseTable.id, close.id),
                    ),
            ).rejects.toMatchObject({
                cause: { constraint_name: "analysis_close_current" },
            });
        },
    );

    it("rejects rebinding or deleting close provenance and defaulting a new close to Live", async () => {
        const f = await closingFixture();
        await expect(
            db
                .insert(schema.conversationAnalysisCloseTable)
                .values({ ...f.closeValues, selectedInputMode: "live" }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_close_initial_mode" },
        });
        const { close } = await bindInitialClose({ fixture: f });
        await expect(
            db
                .update(schema.conversationAnalysisCloseTable)
                .set({ sourceRevision: 3 })
                .where(eq(schema.conversationAnalysisCloseTable.id, close.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_close_immutable" },
        });
        await expect(
            db
                .delete(schema.conversationAnalysisCloseTable)
                .where(eq(schema.conversationAnalysisCloseTable.id, close.id)),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_close_immutable" },
        });
        await expect(
            db
                .update(schema.polisAnalysisCloseTable)
                .set({ originalViewSnapshotId: f.view.id }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_analysis_close_immutable" },
        });
    });

    it.each([
        "inactive",
        "open",
        "missing_result",
        "missing_analysis",
        "checkpoint",
    ])(
        "rejects a non-native or incomplete original checkpoint: %s",
        async (invalidation) => {
            const f = await closingFixture();
            switch (invalidation) {
                case "inactive":
                    await db
                        .update(schema.conversationViewSnapshotTable)
                        .set({ activatedAt: null });
                    break;
                case "open":
                    await db
                        .update(schema.conversationViewSnapshotTable)
                        .set({ isClosed: false });
                    break;
                case "missing_result":
                    await db.delete(schema.analysisSnapshotResultTable);
                    break;
                case "missing_analysis":
                    await db
                        .update(schema.conversationViewSnapshotTable)
                        .set({ analysisSnapshotId: null });
                    break;
                case "checkpoint":
                    await db.delete(
                        schema.conversationViewSnapshotCheckpointReasonTable,
                    );
                    break;
            }
            await expect(
                db.transaction(
                    async (tx) =>
                        await bindInitialClose({ fixture: f, database: tx }),
                ),
            ).rejects.toMatchObject({
                cause: { constraint_name: "polis_analysis_close_checkpoint" },
            });
            expect(
                await db.select().from(schema.polisAnalysisCloseTable),
            ).toEqual([]);
            expect(
                await db.select().from(schema.conversationAnalysisCloseTable),
            ).toEqual([]);
        },
    );

    it("protects closing numerical and survey provenance while permitting content erasure", async () => {
        const f = await closingFixture();
        await bindInitialClose({ fixture: f });
        await expect(
            db
                .update(schema.conversationViewSnapshotTable)
                .set({ totalVoteCount: 0 }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_closing_view_immutable" },
        });
        await expect(
            db.delete(schema.conversationViewSnapshotTable),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_closing_view_immutable" },
        });
        await expect(
            db.delete(schema.conversationViewSnapshotCheckpointReasonTable),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_closing_checkpoint_immutable" },
        });
        await db
            .update(schema.conversationViewSnapshotTable)
            .set({ conversationContentId: null });
        const redacted = first(
            await db.select().from(schema.conversationViewSnapshotTable),
        );
        expect(redacted).toEqual({ ...f.view, conversationContentId: null });
        await expect(
            db
                .update(schema.conversationViewSnapshotTable)
                .set({ conversationContentId: f.view.conversationContentId }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "polis_closing_view_immutable" },
        });
    });

    async function certify({
        inputId,
        baselineId,
        conversationId,
        indices,
        sourceVoteCount = 2,
        sourceParticipantCount = 2,
    }: {
        inputId: number;
        baselineId: number;
        conversationId: number;
        indices: number[];
        sourceVoteCount?: number;
        sourceParticipantCount?: number;
    }) {
        await db.insert(schema.analysisInputBaselineTable).values({
            inputSnapshotId: inputId,
            baselineInputSnapshotId: baselineId,
            conversationId,
            participantIndices: indices,
            opinionIndices: indices,
            sourceVoteCount,
            sourceParticipantCount,
        });
    }

    it("accepts direct projection, allows private unlinking, and retains both graphs through publication", async () => {
        const f = await seed();
        await certify({
            inputId: f.effective.id,
            baselineId: f.complete.id,
            conversationId: f.conversation.id,
            indices: [1],
        });
        await db.insert(schema.analysisSnapshotTable).values({
            conversationId: f.conversation.id,
            inputSnapshotId: f.effective.id,
            dataGeneration: 2,
            computedAt: new Date(),
        });
        await db.update(schema.analysisInputParticipantEligibilityTable).set({
            userId: null,
            isAccountHidden: true,
        });
        for (const id of [f.complete.id, f.effective.id]) {
            await expect(
                db
                    .update(schema.analysisInputSnapshotTable)
                    .set({
                        payload: Buffer.from("changed").toString("base64url"),
                    })
                    .where(eq(schema.analysisInputSnapshotTable.id, id)),
            ).rejects.toMatchObject({
                cause: { constraint_name: "analysis_input_immutable" },
            });
            await expect(
                db
                    .delete(schema.analysisInputBaselineTable)
                    .where(
                        eq(
                            schema.analysisInputBaselineTable.inputSnapshotId,
                            id,
                        ),
                    ),
            ).rejects.toMatchObject({
                cause: { constraint_name: "analysis_input_retained" },
            });
            await expect(
                db
                    .delete(schema.analysisInputSnapshotTable)
                    .where(eq(schema.analysisInputSnapshotTable.id, id)),
            ).rejects.toMatchObject({
                cause: { constraint_name: "analysis_input_immutable" },
            });
        }
        expect(
            await db.select().from(schema.analysisInputBaselineTable),
        ).toHaveLength(2);
    });

    it.each([
        { indices: [0] },
        { indices: [2] },
        { indices: [1, 1] },
        { indices: [] },
    ])(
        "rejects invalid participant projections $indices",
        async ({ indices }) => {
            const f = await seed();
            await expect(
                certify({
                    inputId: f.effective.id,
                    baselineId: f.complete.id,
                    conversationId: f.conversation.id,
                    indices,
                }),
            ).rejects.toThrow();
            expect(
                await db.select().from(schema.analysisInputBaselineTable),
            ).toHaveLength(1);
        },
    );

    it("rejects legacy evidence, source chains, and mutating accepted references", async () => {
        const f = await seed();
        const legacy = await capture({
            conversationId: f.conversation.id,
            participantCount: 0,
            opinionCount: 0,
            payloadVersion: 1,
        });
        await expect(
            certify({
                inputId: legacy.id,
                baselineId: legacy.id,
                conversationId: f.conversation.id,
                indices: [],
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_baseline_scope" },
        });
        await certify({
            inputId: f.effective.id,
            baselineId: f.complete.id,
            conversationId: f.conversation.id,
            indices: [1],
        });
        const next = await capture({
            conversationId: f.conversation.id,
            participantCount: 0,
            opinionCount: 0,
        });
        await expect(
            certify({
                inputId: next.id,
                baselineId: f.effective.id,
                conversationId: f.conversation.id,
                indices: [],
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_baseline_direct" },
        });
        await expect(
            db
                .update(schema.analysisInputBaselineTable)
                .set({ baselineInputSnapshotId: f.effective.id })
                .where(
                    eq(
                        schema.analysisInputBaselineTable.inputSnapshotId,
                        f.effective.id,
                    ),
                ),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_input_immutable" },
        });
    });

    it.each([
        { sourceVoteCount: 1, sourceParticipantCount: 1 },
        { sourceVoteCount: 3, sourceParticipantCount: 2 },
        { sourceVoteCount: 2, sourceParticipantCount: 3 },
    ])(
        "rejects source totals outside the certified baseline: %j",
        async (counts) => {
            const f = await seed();
            await expect(
                certify({
                    inputId: f.effective.id,
                    baselineId: f.complete.id,
                    conversationId: f.conversation.id,
                    indices: [1],
                    ...counts,
                }),
            ).rejects.toMatchObject({
                cause: { constraint_name: "analysis_baseline_source_counts" },
            });
        },
    );

    it("retains immutable broader source totals without enlarging the eligible matrix", async () => {
        const counts = { sourceVoteCount: 5, sourceParticipantCount: 3 };
        const f = await seed(counts);
        await certify({
            inputId: f.effective.id,
            baselineId: f.complete.id,
            conversationId: f.conversation.id,
            indices: [1],
            ...counts,
        });
        const certificates = await db
            .select()
            .from(schema.analysisInputBaselineTable);
        expect(certificates).toHaveLength(2);
        for (const certificate of certificates)
            expect(certificate).toMatchObject(counts);
        expect(f.complete.participantCount).toBe(2);
        expect(f.effective.participantCount).toBe(1);
        await expect(
            db
                .update(schema.analysisInputBaselineTable)
                .set({ sourceVoteCount: 6 }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_input_immutable" },
        });
    });

    it("rejects publication without certification and serializes retirement with publication", async () => {
        const f = await seed();
        const publication = {
            conversationId: f.conversation.id,
            inputSnapshotId: f.effective.id,
            dataGeneration: 2,
            computedAt: new Date(),
        };
        await expect(
            db.insert(schema.analysisSnapshotTable).values(publication),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_publication_evidence" },
        });
        await certify({
            inputId: f.effective.id,
            baselineId: f.complete.id,
            conversationId: f.conversation.id,
            indices: [1],
        });
        await db.transaction(async (tx) => {
            await tx.insert(schema.analysisSnapshotTable).values(publication);
            await expect(
                db.transaction(async (retirement) => {
                    await retirement.execute(
                        sql`SET LOCAL lock_timeout = '100ms'`,
                    );
                    await retirement
                        .delete(schema.analysisInputBaselineTable)
                        .where(
                            eq(
                                schema.analysisInputBaselineTable
                                    .inputSnapshotId,
                                f.effective.id,
                            ),
                        );
                }),
            ).rejects.toMatchObject({ cause: { code: "55P03" } });
        });
        await expect(
            db.insert(schema.analysisSnapshotTable).values({
                ...publication,
                dataGeneration: 3,
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_publication_evidence" },
        });
    });

    it("cannot publish after unused evidence is retired", async () => {
        const f = await seed();
        await certify({
            inputId: f.effective.id,
            baselineId: f.complete.id,
            conversationId: f.conversation.id,
            indices: [1],
        });
        await db
            .delete(schema.analysisInputBaselineTable)
            .where(
                eq(
                    schema.analysisInputBaselineTable.inputSnapshotId,
                    f.effective.id,
                ),
            );
        await expect(
            db.insert(schema.analysisSnapshotTable).values({
                conversationId: f.conversation.id,
                inputSnapshotId: f.effective.id,
                dataGeneration: 2,
                computedAt: new Date(),
            }),
        ).rejects.toMatchObject({
            cause: { constraint_name: "analysis_publication_evidence" },
        });
    });
});
