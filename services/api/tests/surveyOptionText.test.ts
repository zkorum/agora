import { and, eq, isNull, sql } from "drizzle-orm";
import { withReplicas } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "node:fs";
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
    conversationContentTable,
    conversationTable,
    polisConversationConfigTable,
    projectTable,
    rankingConversationConfigTable,
    opinionTable,
    opinionContentTable,
    surveyAnswerOptionTable,
    surveyAnswerTable,
    surveyResponseTable,
    userTable,
    voteTable,
    voteContentTable,
} from "../src/shared-backend/schema.js";
import { createExportParticipantMap } from "../src/service/conversationExport/generators/participantMap.js";
import type {
    SurveyAnswerSubmission,
    SurveyConfig,
} from "../src/shared/types/zod.js";
import { readDbFixtureSql } from "./dbFixture.js";
import { Dto } from "../src/shared/types/dto.js";
import { MAX_BYTES_SURVEY_OPTION_HTML } from "../src/shared/shared.js";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN_LIST = "http://localhost:9000";
process.env.PEPPERS = Buffer.from("0123456789abcdef0123456789abcdef").toString(
    "base64",
);
process.env.VERIFICATOR_SVC_BASE_URL = "http://localhost:3000";
process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const { participationCheck } = vi.hoisted(() => ({
    participationCheck: vi.fn(),
}));
vi.mock(
    import("../src/service/participationGate.js"),
    async (importOriginal) => ({
        ...(await importOriginal()),
        checkConversationParticipation: participationCheck,
    }),
);
const surveyModulePromise = import("../src/service/survey.js");
const exportModulePromise =
    import("../src/service/conversationExport/generators/surveyShared.js");

const participantId = "00000000-0000-4000-8000-000000000001";
const conversationSlugId = "survey01";
const now = new Date("2026-10-10T12:00:00Z");
const sourceLanguageMetadata = {
    sourceLanguageCode: null,
    sourceRawLanguageCode: null,
    sourceLanguageProvider: null,
    sourceLanguageConfidence: null,
};

describe("optional choice text persistence", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let conversationId: number;
    const queries: string[] = [];

    beforeAll(async () => {
        container = await new GenericContainer(
            process.env.AGORA_TEST_POSTGRES_IMAGE ?? "postgres:16-alpine",
        )
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
        await db.execute(sql.raw(readDbFixtureSql("survey-option-text.sql")));
        for (const migration of [
            "V0082.1__track_ranking_scoring_inputs.sql",
            "V0089.1__separate_ranking_scoring_invalidations.sql",
            "V0105__exclude_survey_annotations_from_scoring.sql",
        ]) {
            // The fixture uses current table names, not the pre-rename schema.
            const scoringTriggers = readFileSync(
                new URL(`../database/flyway/${migration}`, import.meta.url),
                "utf8",
            )
                .replaceAll("maxdiff_result_id", "comparison_response_id")
                .replaceAll("maxdiff_result", "comparison_response")
                .replaceAll("maxdiff_comparison", "comparison_answer")
                .replaceAll(
                    "conversation.conversation_type = 'ranking'",
                    "conversation.prioritization_type = 'comparisons'",
                );
            await db.execute(sql.raw(scoringTriggers));
        }
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE TABLE
            survey_answer_option, survey_answer, survey_response,
            survey_question_option_content, survey_question_option,
            survey_question_content, survey_question, survey_config,
            conversation_content, conversation, polis_conversation_config,
            project, "user", realtime_event_outbox_topic, realtime_event_outbox
            , opinion, opinion_content, vote, vote_content
            , ranking_conversation_config
        CASCADE`);
        await db
            .insert(userTable)
            .values({ id: participantId, username: "surveyor" });
        const [project] = await db
            .insert(projectTable)
            .values({
                slug: "survey-project",
                title: "Survey project",
                directoryVisibility: "listed",
            })
            .returning();
        const [polisConfig] = await db
            .insert(polisConversationConfigTable)
            .values({})
            .returning();
        if (project === undefined || polisConfig === undefined)
            throw new Error("Missing fixture project or config");
        const [conversation] = await db
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: project.id,
                polisConfigId: polisConfig.id,
            })
            .returning();
        if (conversation === undefined)
            throw new Error("Missing fixture conversation");
        conversationId = conversation.id;
        const [content] = await db
            .insert(conversationContentTable)
            .values({ conversationId, title: "Survey text test" })
            .returning();
        if (content === undefined) throw new Error("Missing fixture content");
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, conversationId));
        participationCheck.mockResolvedValue({
            success: true,
            participantId,
            conversationId,
            conversationType: "polis",
            rankingMode: null,
        });
    });

    async function configure({
        questionCount = 1,
        allowsText = false,
        maxSelections = 1,
        isOptional = false,
    }: {
        questionCount?: number;
        allowsText?: boolean;
        maxSelections?: number;
        isOptional?: boolean;
    } = {}) {
        const { setSurveyConfigForConversation } = await surveyModulePromise;
        const surveyConfig: SurveyConfig = {
            isOptional,
            questions: Array.from({ length: questionCount }, (_, index) => ({
                questionType: "choice",
                choiceDisplay: "list",
                questionText: `Question ${String(index + 1)}`,
                isRequired: true,
                isPublicAggregateSuppressionEnabled: false,
                displayOrder: index,
                constraints: {
                    type: "choice",
                    minSelections: 1,
                    maxSelections,
                },
                options: [
                    { optionText: "Bicycle", displayOrder: 0, allowsText },
                    { optionText: "Other", displayOrder: 1, allowsText },
                ],
            })),
        };
        await db.transaction(
            async (tx) =>
                await setSurveyConfigForConversation({
                    db: tx,
                    conversationSlugId,
                    conversationId,
                    surveyConfig,
                    now,
                    sourceLanguageMetadata,
                }),
        );
    }

    async function save({
        questionSlugId,
        answer,
        expectedQuestionSemanticVersion,
        knownSurveyRevision,
    }: {
        questionSlugId: string;
        answer: SurveyAnswerSubmission | null;
        expectedQuestionSemanticVersion?: number;
        knownSurveyRevision?: number;
    }) {
        const { saveSurveyAnswer } = await surveyModulePromise;
        if (
            expectedQuestionSemanticVersion === undefined ||
            knownSurveyRevision === undefined
        ) {
            const state = await loadState();
            const config = state.activeSurveyConfig;
            const question = config?.questions.find(
                (item) => item.slugId === questionSlugId,
            );
            if (config === undefined || question === undefined)
                throw new Error("Missing fixture survey version");
            expectedQuestionSemanticVersion ??= question.currentSemanticVersion;
            knownSurveyRevision ??= config.currentRevision;
        }
        return await saveSurveyAnswer({
            db,
            conversationSlugId,
            questionSlugId,
            expectedQuestionSemanticVersion,
            knownSurveyRevision,
            answer,
            didWrite: "did:test:survey",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: async () => undefined,
        });
    }

    async function loadState() {
        const { loadSurveyParticipantState } = await surveyModulePromise;
        return await loadSurveyParticipantState({
            db,
            conversationId,
            participantId,
        });
    }

    async function editSurvey(
        transform: (config: SurveyConfig) => SurveyConfig | null,
    ) {
        const {
            getSurveyConfigForConversation,
            setSurveyConfigForConversation,
        } = await surveyModulePromise;
        await db.transaction(async (tx) => {
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, conversationId))
                .for("update");
            const config = await getSurveyConfigForConversation({
                db: tx,
                conversationId,
            });
            if (config === undefined) throw new Error("Missing fixture config");
            await setSurveyConfigForConversation({
                db: tx,
                conversationSlugId,
                conversationId,
                surveyConfig: transform(config),
                now,
                sourceLanguageMetadata,
            });
        });
    }

    it.each([false, true])(
        "rejects a draft from older wording without invalidating optional saved answers (optional=%s)",
        async (isOptional) => {
            await configure({ isOptional });
            const { question, first } = await firstQuestion();
            const answer: SurveyAnswerSubmission = {
                questionType: "choice",
                optionSlugIds: [first.slugId],
            };
            if (isOptional)
                await save({ questionSlugId: question.slugId, answer });
            await editSurvey((config) => ({
                ...config,
                questions: config.questions.map((item) => ({
                    ...item,
                    questionText: "Different meaning",
                    textChangeIsSemantic: true,
                })),
            }));
            const result = Dto.surveyAnswerSaveResponse.parse(
                await save({
                    questionSlugId: question.slugId,
                    answer,
                    expectedQuestionSemanticVersion: 1,
                    knownSurveyRevision: 1,
                }),
            );
            expect(result).toMatchObject({
                success: false,
                reason: "survey_changed",
                recovery: {
                    kind: "survey",
                    form: {
                        currentRevision: 2,
                        questions: [
                            {
                                questionText: "Different meaning",
                                currentSemanticVersion: 2,
                            },
                        ],
                    },
                    routeResolution: {
                        kind: "question",
                        questionSlugId: question.slugId,
                    },
                },
            });
            const state = await loadState();
            if (isOptional) {
                expect(
                    state.answersByQuestionId.get(question.id)
                        ?.answeredQuestionSemanticVersion,
                ).toBe(1);
                expect(result.participationStatus).toEqual({ status: "ready" });
            } else {
                expect(state.response).toBeUndefined();
                expect(state.answersByQuestionId.size).toBe(0);
            }
        },
    );

    it("accepts an unchanged question and returns the revised form when another question changed", async () => {
        await configure({ questionCount: 2 });
        const { question, first } = await firstQuestion();
        await editSurvey((config) => ({
            ...config,
            questions: config.questions.map((item) =>
                item.questionSlugId === question.slugId
                    ? item
                    : {
                          ...item,
                          questionText: "New second question",
                          textChangeIsSemantic: true,
                      },
            ),
        }));
        const result = Dto.surveyAnswerSaveResponse.parse(
            await save({
                questionSlugId: question.slugId,
                expectedQuestionSemanticVersion: 1,
                knownSurveyRevision: 1,
                answer: {
                    questionType: "choice",
                    optionSlugIds: [first.slugId],
                },
            }),
        );
        expect(result).toMatchObject({
            success: true,
            currentRevision: 2,
            savedQuestion: {
                currentSemanticVersion: 1,
                answeredQuestionSemanticVersion: 1,
            },
            recovery: { kind: "survey", form: { currentRevision: 2 } },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionSlugIds,
        ).toEqual([first.slugId]);
    });

    it("accepts cosmetic edits without silently treating semantic changes as cosmetic", async () => {
        await configure();
        const { question, first } = await firstQuestion();
        await editSurvey((config) => ({
            ...config,
            questions: config.questions.map((item) => ({
                ...item,
                questionText: "Corrected spelling",
                textChangeIsSemantic: false,
            })),
        }));
        expect(
            await save({
                questionSlugId: question.slugId,
                expectedQuestionSemanticVersion: 1,
                knownSurveyRevision: 1,
                answer: {
                    questionType: "choice",
                    optionSlugIds: [first.slugId],
                },
            }),
        ).toMatchObject({
            success: true,
            currentRevision: 2,
            savedQuestion: {
                questionText: "Corrected spelling",
                currentSemanticVersion: 1,
            },
        });
    });

    it("returns updated constraints instead of repeating validation errors after an annotation field is disabled", async () => {
        await configure({ allowsText: true });
        const { question, first } = await firstQuestion();
        await editSurvey((config) => ({
            ...config,
            questions: config.questions.map((item) =>
                item.questionType === "choice"
                    ? {
                          ...item,
                          options: item.options.map((option) => ({
                              ...option,
                              allowsText: false,
                          })),
                      }
                    : item,
            ),
        }));
        const result = await save({
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: 1,
            knownSurveyRevision: 1,
            answer: {
                questionType: "choice",
                optionSlugIds: [first.slugId],
                optionTextValues: { [first.slugId]: "Old field draft" },
            },
        });
        expect(result).toMatchObject({
            success: false,
            reason: "survey_changed",
            recovery: { kind: "survey", form: { currentRevision: 2 } },
        });
        expect((await loadState()).response).toBeUndefined();
    });

    it("returns the surviving question instead of a 404 when the cached question was removed", async () => {
        await configure({ questionCount: 2 });
        const { question, first } = await firstQuestion();
        await editSurvey((config) => ({
            ...config,
            questions: config.questions.filter(
                (item) => item.questionSlugId !== question.slugId,
            ),
        }));
        const result = await save({
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: 1,
            knownSurveyRevision: 1,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        expect(result.success).toBe(false);
        if (
            result.success ||
            result.reason !== "survey_changed" ||
            result.recovery.kind !== "survey"
        )
            throw new Error("Expected a recovery form");
        expect(result.recovery.form.questions).toHaveLength(1);
        expect(result.recovery.routeResolution).toEqual({
            kind: "question",
            questionSlugId: result.recovery.form.questions[0]?.questionSlugId,
        });
        expect((await loadState()).response).toBeUndefined();
    });

    it("returns a no-survey recovery when the questionnaire was removed", async () => {
        await configure();
        const { question, first } = await firstQuestion();
        await editSurvey(() => null);
        const result = await save({
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: 1,
            knownSurveyRevision: 1,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        expect(Dto.surveyAnswerSaveResponse.parse(result)).toMatchObject({
            success: false,
            reason: "survey_changed",
            participationStatus: { status: "ready" },
            recovery: {
                kind: "no_survey",
                routeResolution: { kind: "none" },
                surveyGate: { hasSurvey: false },
            },
        });
        expect((await loadState()).response).toBeUndefined();
    });

    it("identifies a recreated questionnaire even when its revision resets", async () => {
        await configure();
        const { question, first } = await firstQuestion();
        await editSurvey((config) => ({
            ...config,
            questions: config.questions.map((item) => ({
                ...item,
                questionText: "Cosmetic edit",
                textChangeIsSemantic: false,
            })),
        }));
        const original = (await loadState()).activeSurveyConfig;
        if (original === undefined) throw new Error("Missing original config");
        await editSurvey(() => null);
        await configure();
        const result = await save({
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: 1,
            knownSurveyRevision: original.currentRevision,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        if (
            result.success ||
            result.reason !== "survey_changed" ||
            result.recovery.kind !== "survey"
        )
            throw new Error("Expected recreated survey recovery");
        expect(result.recovery.form.currentRevision).toBe(1);
        expect(result.recovery.form.surveyConfigId).toBeGreaterThan(
            original.id,
        );
    });

    it("waits for an author edit to commit before validating the submitted version", async () => {
        const {
            setSurveyConfigForConversation,
            getSurveyConfigForConversation,
        } = await surveyModulePromise;
        await configure();
        const { question, first } = await firstQuestion();
        let notifyEdited = () => {};
        const edited = new Promise<void>((resolve) => {
            notifyEdited = resolve;
        });
        let releaseEdit = () => {};
        const release = new Promise<void>((resolve) => {
            releaseEdit = resolve;
        });
        const editing = db.transaction(async (tx) => {
            await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(eq(conversationTable.id, conversationId))
                .for("update");
            const config = await getSurveyConfigForConversation({
                db: tx,
                conversationId,
            });
            if (config === undefined) throw new Error("Missing fixture config");
            await setSurveyConfigForConversation({
                db: tx,
                conversationSlugId,
                conversationId,
                surveyConfig: {
                    ...config,
                    questions: config.questions.map((item) => ({
                        ...item,
                        questionText: "Concurrent edit",
                        textChangeIsSemantic: true,
                    })),
                },
                now,
                sourceLanguageMetadata,
            });
            notifyEdited();
            await release;
        });
        await edited;
        queries.length = 0;
        const saving = save({
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: 1,
            knownSurveyRevision: 1,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        try {
            await vi.waitFor(() =>
                expect(
                    queries.some(
                        (query) =>
                            query.includes('from "conversation"') &&
                            query.includes("for key share"),
                    ),
                ).toBe(true),
            );
        } finally {
            releaseEdit();
        }
        await editing;
        expect(await saving).toMatchObject({
            success: false,
            reason: "survey_changed",
            recovery: { kind: "survey", form: { currentRevision: 2 } },
        });
        expect((await loadState()).answersByQuestionId.size).toBe(0);
    });

    async function firstQuestion() {
        const state = await loadState();
        const question = state.activeSurveyConfig?.questions[0];
        const [first, other] = question?.options ?? [];
        if (
            question === undefined ||
            first === undefined ||
            other === undefined
        )
            throw new Error("Missing fixture question or options");
        return { question, first, other };
    }

    it("lets another participant finish while the first participant's transaction is still open", async () => {
        const { saveSurveyAnswer } = await surveyModulePromise;
        await configure();
        const { question, first } = await firstQuestion();
        const secondParticipant = "00000000-0000-4000-8000-000000000002";
        await db
            .insert(userTable)
            .values({ id: secondParticipant, username: "second-surveyor" });
        participationCheck.mockImplementation(
            ({ didWrite }: { didWrite: string }) =>
                Promise.resolve({
                    success: true,
                    participantId:
                        didWrite === "did:test:second"
                            ? secondParticipant
                            : participantId,
                    conversationId,
                    conversationType: "polis",
                    rankingMode: null,
                }),
        );
        let announceFirst = () => {};
        const firstStarted = new Promise<void>((resolve) => {
            announceFirst = resolve;
        });
        let releaseFirst = () => {};
        const held = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });
        const request = {
            db,
            conversationSlugId,
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: question.currentSemanticVersion,
            knownSurveyRevision: 1,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
            didWrite: "did:test:first",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: async () => {
                announceFirst();
                await held;
                return undefined;
            },
        } satisfies Parameters<typeof saveSurveyAnswer>[0];
        const firstSave = saveSurveyAnswer(request);
        await firstStarted;
        let secondFinished = false;
        const secondSave = (async () => {
            const result = await saveSurveyAnswer({
                ...request,
                didWrite: "did:test:second",
                getEmailUpdateOnboardingAction: async ({ database }) => {
                    // Participant KEY SHARE locks must remain compatible with
                    // the scheduler's NO KEY UPDATE while another write is open.
                    await database
                        .select({ id: conversationTable.id })
                        .from(conversationTable)
                        .where(eq(conversationTable.id, conversationId))
                        .for("no key update");
                    return undefined;
                },
            });
            secondFinished = true;
            return result;
        })();
        try {
            await vi.waitFor(() => expect(secondFinished).toBe(true));
        } finally {
            releaseFirst();
        }
        expect((await firstSave).success).toBe(true);
        expect((await secondSave).success).toBe(true);
        expect(await db.select().from(surveyResponseTable)).toHaveLength(2);
    });

    it("serializes simultaneous first saves and derives completion without a second survey read", async () => {
        const { deriveSurveyGate } = await surveyModulePromise;
        await configure({ questionCount: 2, allowsText: true });
        const state = await loadState();
        const questions = state.activeSurveyConfig?.questions ?? [];
        expect(questions).toHaveLength(2);
        queries.length = 0;
        await Promise.all(
            questions.map(async (question) => {
                const [option] = question.options;
                if (option === undefined)
                    throw new Error("Missing fixture option");
                return await save({
                    questionSlugId: question.slugId,
                    expectedQuestionSemanticVersion:
                        question.currentSemanticVersion,
                    knownSurveyRevision: 1,
                    answer: {
                        questionType: "choice",
                        optionSlugIds: [option.slugId],
                        optionTextValues: {
                            [option.slugId]: question.questionText,
                        },
                    },
                });
            }),
        );
        expect(
            queries.filter((query) => query.includes('from "survey_config"')),
        ).toHaveLength(2);
        expect(await db.select().from(surveyResponseTable)).toHaveLength(1);
        const completed = await loadState();
        expect(completed.answersByQuestionId.size).toBe(2);
        expect(
            deriveSurveyGate({ surveyState: completed, participantId }).status,
        ).toBe("complete_valid");
        for (const question of questions) {
            const [option] = question.options;
            if (option === undefined) throw new Error("Missing fixture option");
            expect(
                completed.answersByQuestionId.get(question.id)
                    ?.optionTextValues,
            ).toEqual({
                [option.slugId]: {
                    textValueHtml: `<p>${question.questionText}</p>`,
                },
            });
        }
    });

    it("keeps enabled text fields when a legacy config edit omits the new flag", async () => {
        const {
            getSurveyConfigForConversation,
            setSurveyConfigForConversation,
        } = await surveyModulePromise;
        await configure({ allowsText: true });
        const config = await getSurveyConfigForConversation({
            db,
            conversationId,
        });
        if (config === undefined) throw new Error("Missing fixture config");
        const legacyConfig: SurveyConfig = {
            ...config,
            questions: config.questions.map((question) =>
                question.questionType === "choice"
                    ? {
                          ...question,
                          options: question.options.map((option) => ({
                              optionSlugId: option.optionSlugId,
                              optionText: `${option.optionText}!`,
                              displayOrder: option.displayOrder,
                          })),
                      }
                    : question,
            ),
        };
        await db.transaction(
            async (tx) =>
                await setSurveyConfigForConversation({
                    db: tx,
                    conversationSlugId,
                    conversationId,
                    surveyConfig: legacyConfig,
                    now,
                    sourceLanguageMetadata,
                }),
        );
        expect(
            (await loadState()).activeSurveyConfig?.questions.every(
                (question) =>
                    question.options.every((option) => option.allowsText),
            ),
        ).toBe(true);
    });

    it("updates annotation text in place without invalidating ranking scores, while selection edits still invalidate them", async () => {
        const [rankingConfig] = await db
            .insert(rankingConversationConfigTable)
            .values({ rankingMode: "bws" })
            .returning();
        if (rankingConfig === undefined)
            throw new Error("Missing fixture ranking config");
        await db
            .update(conversationTable)
            .set({
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
                polisConfigId: null,
                rankingConfigId: rankingConfig.id,
            })
            .where(eq(conversationTable.id, conversationId));
        participationCheck.mockResolvedValue({
            success: true,
            participantId,
            conversationId,
            conversationType: "prioritizing",
            prioritizationType: "comparisons",
            rankingMode: "bws",
        });
        await configure({ allowsText: true });
        const { question, first, other } = await firstQuestion();
        const answer = {
            questionType: "choice",
            optionSlugIds: [other.slugId],
            optionTextValues: { [other.slugId]: "Cargo bike" },
        } satisfies SurveyAnswerSubmission;
        await save({ questionSlugId: question.slugId, answer });
        const selectionsBefore = await db
            .select()
            .from(surveyAnswerOptionTable)
            .where(isNull(surveyAnswerOptionTable.deletedAt));
        const [before] = await db
            .select()
            .from(rankingConversationConfigTable)
            .where(eq(rankingConversationConfigTable.id, rankingConfig.id));
        await save({
            questionSlugId: question.slugId,
            answer: {
                ...answer,
                optionTextValues: { [other.slugId]: "Tricycle" },
            },
        });
        const [after] = await db
            .select()
            .from(rankingConversationConfigTable)
            .where(eq(rankingConversationConfigTable.id, rankingConfig.id));
        expect(after?.scoringInputRevision).toBe(before?.scoringInputRevision);
        expect(after?.scoringInvalidationRevision).toBe(
            before?.scoringInvalidationRevision,
        );
        const selectionsAfter = await db
            .select()
            .from(surveyAnswerOptionTable)
            .where(isNull(surveyAnswerOptionTable.deletedAt));
        expect(selectionsAfter.map((selection) => selection.id)).toEqual(
            selectionsBefore.map((selection) => selection.id),
        );
        expect(selectionsAfter[0]?.textValuePlainText).toBe("Tricycle");
        await save({
            questionSlugId: question.slugId,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        const [changed] = await db
            .select()
            .from(rankingConversationConfigTable)
            .where(eq(rankingConversationConfigTable.id, rankingConfig.id));
        expect(changed?.scoringInputRevision).toBeGreaterThan(
            after?.scoringInputRevision ?? 0,
        );
    });

    it("preserves the newest text across a concurrent legacy save", async () => {
        await configure({ allowsText: true });
        const { question, other } = await firstQuestion();
        const answer = {
            questionType: "choice",
            optionSlugIds: [other.slugId],
        } satisfies SurveyAnswerSubmission;
        await save({
            questionSlugId: question.slugId,
            answer: {
                ...answer,
                optionTextValues: { [other.slugId]: "Old text" },
            },
        });
        await Promise.all([
            save({
                questionSlugId: question.slugId,
                answer: {
                    ...answer,
                    optionTextValues: { [other.slugId]: "Newest text" },
                },
            }),
            save({ questionSlugId: question.slugId, answer }),
        ]);
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toEqual({ [other.slugId]: { textValueHtml: "<p>Newest text</p>" } });
    });

    it.each([
        { questionCount: 1, maxSelections: 1 },
        { questionCount: 3, maxSelections: 1 },
        { questionCount: 1, maxSelections: 2 },
        { questionCount: 3, maxSelections: 2 },
    ])(
        "edits a published $questionCount-question survey with $maxSelections selections while preserving IDs, answers, and completion",
        async ({ questionCount, maxSelections }) => {
            const {
                getSurveyConfigForConversation,
                setSurveyConfigForConversation,
                deriveSurveyGate,
            } = await surveyModulePromise;
            await configure({ questionCount, maxSelections });
            const before = await loadState();
            for (const question of before.activeSurveyConfig?.questions ?? []) {
                const [option] = question.options;
                if (option === undefined)
                    throw new Error("Missing fixture option");
                await save({
                    questionSlugId: question.slugId,
                    answer: {
                        questionType: "choice",
                        optionSlugIds:
                            maxSelections === 1
                                ? [option.slugId]
                                : question.options.map(
                                      (selectedOption) => selectedOption.slugId,
                                  ),
                    },
                });
            }
            const completed = await loadState();
            const config = await getSurveyConfigForConversation({
                db,
                conversationId,
            });
            if (config === undefined) throw new Error("Missing fixture survey");
            for (const question of config.questions) {
                if (question.questionType === "choice") {
                    for (const option of question.options)
                        option.allowsText = true;
                }
            }
            const effect = await db.transaction(
                async (tx) =>
                    await setSurveyConfigForConversation({
                        db: tx,
                        conversationSlugId,
                        conversationId,
                        surveyConfig: config,
                        now,
                        sourceLanguageMetadata,
                    }),
            );
            expect(effect.didRequiredQuestionSemanticChange).toBe(false);
            const edited = await loadState();
            expect(
                deriveSurveyGate({ surveyState: edited, participantId }).status,
            ).toBe("complete_valid");
            expect(edited.response?.completedAt).toEqual(
                completed.response?.completedAt,
            );
            expect(edited.answersByQuestionId).toEqual(
                completed.answersByQuestionId,
            );
            expect(
                edited.activeSurveyConfig?.questions.map((question) => ({
                    id: question.id,
                    slugId: question.slugId,
                    version: question.currentSemanticVersion,
                    options: question.options.map((option) => ({
                        id: option.id,
                        slugId: option.slugId,
                    })),
                })),
            ).toEqual(
                before.activeSurveyConfig?.questions.map((question) => ({
                    id: question.id,
                    slugId: question.slugId,
                    version: question.currentSemanticVersion,
                    options: question.options.map((option) => ({
                        id: option.id,
                        slugId: option.slugId,
                    })),
                })),
            );
            expect(
                edited.activeSurveyConfig?.questions.every((question) =>
                    question.options.every((option) => option.allowsText),
                ),
            ).toBe(true);
        },
    );

    it("round-trips separate multi-choice texts, text-only edits, legacy payloads, and explicit clearing", async () => {
        await configure({ allowsText: true, maxSelections: 2 });
        const { question, first, other } = await firstQuestion();
        const optionSlugIds = [first.slugId, other.slugId];
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds,
                optionTextValues: {
                    [first.slugId]: " Electric ",
                    [other.slugId]: 'Cargo bike, "family"\n<literal text>',
                },
            },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toEqual({
            [first.slugId]: { textValueHtml: "<p>Electric</p>" },
            [other.slugId]: {
                textValueHtml:
                    '<p>Cargo bike, "family"<br />&lt;literal text&gt;</p>',
            },
        });
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds,
                optionTextValues: {
                    [first.slugId]: "Electric",
                    [other.slugId]: "Tricycle",
                },
            },
        });
        await save({
            questionSlugId: question.slugId,
            answer: { questionType: "choice", optionSlugIds },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toEqual({
            [first.slugId]: { textValueHtml: "<p>Electric</p>" },
            [other.slugId]: { textValueHtml: "<p>Tricycle</p>" },
        });
        const result = await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds,
                optionTextValues: {},
            },
        });
        expect(result).toMatchObject({
            success: true,
            surveyGate: { status: "complete_valid" },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toBeUndefined();
    });

    it("sanitizes and round-trips formatted option answers with derived plain text", async () => {
        await configure({ allowsText: true });
        const { question, other } = await firstQuestion();
        const answer = {
            questionType: "choice",
            optionSlugIds: [other.slugId],
            optionTextValues: {
                [other.slugId]: {
                    textValueHtml:
                        '<p onclick="alert(1)"><strong>Cargo\u202E bike</strong></p><script>alert(1)</script><p></p><p></p><ul><li><p>Family</p></li></ul>',
                },
            },
        } satisfies SurveyAnswerSubmission;
        await save({ questionSlugId: question.slugId, answer });
        const html =
            "<p><strong>Cargo bike</strong></p><p></p><ul><li><p>Family</p></li></ul>";
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toEqual({
            [other.slugId]: { textValueHtml: html },
        });
        const [stored] = await db
            .select()
            .from(surveyAnswerOptionTable)
            .where(isNull(surveyAnswerOptionTable.deletedAt));
        expect(stored).toMatchObject({
            textValueHtml: html,
            textValuePlainText: "Cargo bike\n\n- Family",
        });

        // Formatting-only edits must be persisted even when the derived text is unchanged.
        await save({
            questionSlugId: question.slugId,
            answer: {
                ...answer,
                optionTextValues: {
                    [other.slugId]: {
                        textValueHtml:
                            "<p><em>Cargo bike</em></p><ul><li><p>Family</p></li></ul>",
                    },
                },
            },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toEqual({
            [other.slugId]: {
                textValueHtml:
                    "<p><em>Cargo bike</em></p><ul><li><p>Family</p></li></ul>",
            },
        });
        await save({
            questionSlugId: question.slugId,
            answer: {
                ...answer,
                optionTextValues: {
                    [other.slugId]: { textValueHtml: "<p><br></p>" },
                },
            },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toBeUndefined();
        const [cleared] = await db
            .select()
            .from(surveyAnswerOptionTable)
            .where(isNull(surveyAnswerOptionTable.deletedAt));
        expect(cleared).toMatchObject({
            textValueHtml: null,
            textValuePlainText: null,
        });
    });

    it.each([
        {
            plainText: '<literal> & "quotes"\r\nNext\rLast\nEnd',
            html: '<p>&lt;literal&gt; &amp; "quotes"<br>Next<br>Last<br>End</p>',
        },
        {
            plainText: "&" + "\u0301".repeat(8_191),
            html: "<p>&amp;" + "\u0301".repeat(8_191) + "</p>",
        },
    ])(
        "backfills legacy rows before enforcing paired content, preserving rich text and tombstones",
        async ({ plainText, html }) => {
            await configure({ allowsText: true, maxSelections: 2 });
            const { question, first, other } = await firstQuestion();
            await save({
                questionSlugId: question.slugId,
                answer: {
                    questionType: "choice",
                    optionSlugIds: [first.slugId, other.slugId],
                    optionTextValues: {
                        [first.slugId]: {
                            textValueHtml:
                                "<p><strong>Already formatted</strong></p>",
                        },
                        [other.slugId]: "Legacy text",
                    },
                },
            });
            // Recreate the expanded schema and legacy data, then run the actual migration files.
            await db.execute(
                sql`ALTER TABLE survey_answer_option DROP CONSTRAINT survey_answer_option_text_pair_check`,
            );
            try {
                await db.execute(
                    sql.raw(
                        readFileSync(
                            new URL(
                                "../database/flyway/V0107__steep_skreet.sql",
                                import.meta.url,
                            ),
                            "utf8",
                        ),
                    ),
                );
                await db
                    .update(surveyAnswerOptionTable)
                    .set({
                        textValueHtml: null,
                        textValuePlainText: plainText,
                        deletedAt: now,
                    })
                    .where(
                        eq(
                            surveyAnswerOptionTable.surveyQuestionOptionId,
                            other.id,
                        ),
                    );
                await db.execute(
                    sql.raw(
                        readFileSync(
                            new URL(
                                "../database/flyway/V0107.0.1__petite_mesmero.sql",
                                import.meta.url,
                            ),
                            "utf8",
                        ),
                    ),
                );
                await db.execute(
                    sql.raw(
                        readFileSync(
                            new URL(
                                "../database/flyway/V0107.1__backfill_survey_option_answer_html.sql",
                                import.meta.url,
                            ),
                            "utf8",
                        ),
                    ),
                );
            } finally {
                await db.execute(
                    sql.raw(
                        readFileSync(
                            new URL(
                                "../database/flyway/V0108__mature_next_avengers.sql",
                                import.meta.url,
                            ),
                            "utf8",
                        ),
                    ),
                );
            }
            const rows = await db.select().from(surveyAnswerOptionTable);
            expect(
                rows.find((row) => row.surveyQuestionOptionId === first.id),
            ).toMatchObject({
                textValueHtml: "<p><strong>Already formatted</strong></p>",
                textValuePlainText: "Already formatted",
                deletedAt: null,
            });
            expect(
                rows.find((row) => row.surveyQuestionOptionId === other.id),
            ).toMatchObject({
                textValueHtml: html,
                textValuePlainText: plainText,
                deletedAt: now,
            });
        },
    );

    it("round-trips valid legacy Unicode whose escaped HTML exceeds the generic rich-text limit", async () => {
        await configure({ allowsText: true });
        const { question, other } = await firstQuestion();
        const text = "&" + "\u0301".repeat(8_191);
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds: [other.slugId],
                optionTextValues: { [other.slugId]: text },
            },
        });
        const state = await loadState();
        expect(
            state.answersByQuestionId.get(question.id)?.optionTextValues,
        ).toEqual({
            [other.slugId]: {
                textValueHtml: "<p>&amp;" + "\u0301".repeat(8_191) + "</p>",
            },
        });
        const { deriveSurveyGate } = await surveyModulePromise;
        expect(
            deriveSurveyGate({ surveyState: state, participantId }).status,
        ).toBe("complete_valid");
    });

    it("rejects incomplete content pairs and oversized HTML in the database", async () => {
        await configure({ allowsText: true });
        const { question, other } = await firstQuestion();
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds: [other.slugId],
                optionTextValues: {
                    [other.slugId]: { textValueHtml: "<p>Valid</p>" },
                },
            },
        });
        for (const invalidContent of [
            { textValueHtml: null },
            { textValuePlainText: null },
            { textValueHtml: "é".repeat(MAX_BYTES_SURVEY_OPTION_HTML) },
        ]) {
            await expect(
                db
                    .update(surveyAnswerOptionTable)
                    .set(invalidContent)
                    .where(
                        eq(
                            surveyAnswerOptionTable.surveyQuestionOptionId,
                            other.id,
                        ),
                    ),
            ).rejects.toMatchObject({ cause: { code: "23514" } });
        }
    });

    it("preserves collected text after disabling the field, but rejects new text on it", async () => {
        const {
            getSurveyConfigForConversation,
            setSurveyConfigForConversation,
            deriveSurveyGate,
        } = await surveyModulePromise;
        await configure({ allowsText: true });
        const { question, other } = await firstQuestion();
        const answer = {
            questionType: "choice",
            optionSlugIds: [other.slugId],
            optionTextValues: { [other.slugId]: "Cargo bike" },
        } satisfies SurveyAnswerSubmission;
        await save({ questionSlugId: question.slugId, answer });
        const config = await getSurveyConfigForConversation({
            db,
            conversationId,
        });
        if (config === undefined) throw new Error("Missing fixture config");
        for (const item of config.questions) {
            if (item.questionType === "choice")
                for (const option of item.options) option.allowsText = false;
        }
        await db.transaction(
            async (tx) =>
                await setSurveyConfigForConversation({
                    db: tx,
                    conversationSlugId,
                    conversationId,
                    surveyConfig: config,
                    now,
                    sourceLanguageMetadata,
                }),
        );
        await save({ questionSlugId: question.slugId, answer });
        const state = await loadState();
        expect(
            deriveSurveyGate({ surveyState: state, participantId }).status,
        ).toBe("complete_valid");
        expect(
            state.answersByQuestionId.get(question.id)?.optionTextValues?.[
                other.slugId
            ],
        ).toEqual({ textValueHtml: "<p>Cargo bike</p>" });
        await expect(
            save({
                questionSlugId: question.slugId,
                answer: {
                    ...answer,
                    optionTextValues: { [other.slugId]: "New text" },
                },
            }),
        ).rejects.toThrow("does not allow text");
    });

    it.each([false, true])(
        "returns writer-owned restart routing after withdrawal (optional=%s)",
        async (isOptional) => {
            const { withdrawSurveyResponse } = await surveyModulePromise;
            await configure({ isOptional });
            const { question, first } = await firstQuestion();
            const saved = await save({
                questionSlugId: question.slugId,
                answer: {
                    questionType: "choice",
                    optionSlugIds: [first.slugId],
                },
            });
            if (!saved.success)
                throw new Error("Missing saved survey response");
            const selectReplica = vi.fn(() => db);
            const request = {
                db: withReplicas(db, [db], selectReplica),
                expectedForm: {
                    surveyConfigId: saved.surveyConfigId,
                    currentRevision: saved.currentRevision,
                },
                conversationSlugId,
                didWrite: "did:test:survey",
                userAgent: "Vitest",
                now,
                currentDisplayLanguage: "en",
                skipEmailUpdateConsent: false,
                getEmailUpdateOnboardingAction: () =>
                    Promise.resolve(undefined),
            } satisfies Parameters<typeof withdrawSurveyResponse>[0];

            const result = await withdrawSurveyResponse(request);

            expect(
                Dto.surveyResponseWithdrawResponse.parse(result),
            ).toMatchObject({
                success: true,
                participationStatus: isOptional
                    ? { status: "ready" }
                    : {
                          status: "onboarding_required",
                          nextStep: {
                              kind: "survey",
                              routeResolution: {
                                  kind: "question",
                                  questionSlugId: question.slugId,
                              },
                          },
                      },
                recovery: {
                    kind: "survey",
                    form: {
                        surveyGate: {
                            hasSurvey: true,
                            isOptional,
                            canParticipate: isOptional,
                            status: "not_started",
                        },
                    },
                    routeResolution: {
                        kind: "question",
                        questionSlugId: question.slugId,
                    },
                },
            });
            expect(selectReplica).not.toHaveBeenCalled();
            const state = await loadState();
            expect(state.answersByQuestionId.size).toBe(0);
            expect(state.response?.withdrawnAt).toEqual(now);
            expect(await withdrawSurveyResponse(request)).toEqual(result);
            expect(selectReplica).not.toHaveBeenCalled();
        },
    );

    it("preserves the response when withdrawal was confirmed before a survey became required", async () => {
        const { withdrawSurveyResponse } = await surveyModulePromise;
        await configure({ isOptional: true });
        const { question, first } = await firstQuestion();
        const saved = await save({
            questionSlugId: question.slugId,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        if (!saved.success) throw new Error("Missing saved survey response");
        await editSurvey((config) => ({ ...config, isOptional: false }));
        await expect(
            withdrawSurveyResponse({
                db,
                conversationSlugId,
                didWrite: "did:test:survey",
                userAgent: "Vitest",
                now,
                currentDisplayLanguage: "en",
                skipEmailUpdateConsent: false,
                getEmailUpdateOnboardingAction: async () => undefined,
                expectedForm: {
                    surveyConfigId: saved.surveyConfigId,
                    currentRevision: saved.currentRevision,
                },
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
        const state = await loadState();
        expect(state.response?.withdrawnAt).toBeNull();
        expect(
            state.answersByQuestionId.get(question.id)?.optionSlugIds,
        ).toEqual([first.slugId]);
    });

    it("returns eligibility from the existing answer transaction without a replica reread", async () => {
        const { saveSurveyAnswer } = await surveyModulePromise;
        await configure();
        const { question, first } = await firstQuestion();
        const selectReplica = vi.fn(() => db);
        const getEmailUpdateOnboardingAction = vi.fn<
            Parameters<
                typeof saveSurveyAnswer
            >[0]["getEmailUpdateOnboardingAction"]
        >(async ({ database }) => {
            const answers = await database
                .select({ id: surveyAnswerTable.id })
                .from(surveyAnswerTable)
                .where(eq(surveyAnswerTable.surveyQuestionId, question.id));
            expect(answers).toHaveLength(1);
            return undefined;
        });
        const result = await saveSurveyAnswer({
            db: withReplicas(db, [db], selectReplica),
            conversationSlugId,
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: question.currentSemanticVersion,
            knownSurveyRevision: 1,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
            didWrite: "did:test:survey",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction,
        });
        expect(result).toMatchObject({
            success: true,
            participationStatus: { status: "ready" },
        });
        expect(getEmailUpdateOnboardingAction).toHaveBeenCalledOnce();
        expect(selectReplica).not.toHaveBeenCalled();
    });

    it("returns remaining email consent in the survey write result", async () => {
        const { saveSurveyAnswer } = await surveyModulePromise;
        await configure();
        const { question, first } = await firstQuestion();
        const result = await saveSurveyAnswer({
            db,
            conversationSlugId,
            questionSlugId: question.slugId,
            expectedQuestionSemanticVersion: question.currentSemanticVersion,
            knownSurveyRevision: 1,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
            didWrite: "did:test:survey",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: async () => ({
                operation: "set_conversation_preference",
                conversationSlugId,
                initialEnabled: true,
            }),
        });
        expect(result).toMatchObject({
            success: true,
            participationStatus: {
                status: "onboarding_required",
                nextStep: {
                    kind: "email_updates",
                    action: {
                        operation: "set_conversation_preference",
                        conversationSlugId,
                        initialEnabled: true,
                    },
                },
            },
        });
    });

    it("withdraws retained answers and annotations even after the author removes the survey", async () => {
        const { withdrawSurveyResponse } = await surveyModulePromise;
        await configure({ allowsText: true });
        const { question, first } = await firstQuestion();
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds: [first.slugId],
                optionTextValues: { [first.slugId]: "Private annotation" },
            },
        });
        await editSurvey(() => null);
        const result = await withdrawSurveyResponse({
            db,
            conversationSlugId,
            didWrite: "did:test:survey",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: () => Promise.resolve(undefined),
        });
        expect(result).toMatchObject({
            success: true,
            recovery: { kind: "no_survey" },
        });
        expect(
            await db
                .select()
                .from(surveyAnswerTable)
                .where(isNull(surveyAnswerTable.deletedAt)),
        ).toHaveLength(0);
        expect(
            await db
                .select()
                .from(surveyAnswerOptionTable)
                .where(isNull(surveyAnswerOptionTable.deletedAt)),
        ).toHaveLength(0);
        expect(
            await db
                .select({ withdrawnAt: surveyResponseTable.withdrawnAt })
                .from(surveyResponseTable),
        ).toEqual([{ withdrawnAt: now }]);
    });

    it("returns restart routing from the writer when no response exists", async () => {
        const { withdrawSurveyResponse } = await surveyModulePromise;
        await configure();
        const { question } = await firstQuestion();
        const selectReplica = vi.fn(() => db);

        const result = await withdrawSurveyResponse({
            db: withReplicas(db, [db], selectReplica),
            conversationSlugId,
            didWrite: "did:test:survey",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: () => Promise.resolve(undefined),
        });

        expect(Dto.surveyResponseWithdrawResponse.parse(result)).toMatchObject({
            success: true,
            participationStatus: {
                status: "onboarding_required",
                nextStep: {
                    kind: "survey",
                    routeResolution: {
                        kind: "question",
                        questionSlugId: question.slugId,
                    },
                },
            },
            recovery: {
                kind: "survey",
                form: {
                    surveyGate: {
                        hasSurvey: true,
                        isOptional: false,
                        canParticipate: false,
                        status: "not_started",
                    },
                },
                routeResolution: {
                    kind: "question",
                    questionSlugId: question.slugId,
                },
            },
        });
        expect(selectReplica).not.toHaveBeenCalled();
        expect(await db.select().from(surveyResponseTable)).toHaveLength(0);
    });

    it("soft-deletes accompanying text on deselection and withdrawal", async () => {
        const { withdrawSurveyResponse } = await surveyModulePromise;
        await configure({ allowsText: true });
        const { question, first, other } = await firstQuestion();
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds: [other.slugId],
                optionTextValues: { [other.slugId]: "Cargo bike" },
            },
        });
        await save({
            questionSlugId: question.slugId,
            answer: { questionType: "choice", optionSlugIds: [first.slugId] },
        });
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionTextValues,
        ).toBeUndefined();
        expect(
            await db
                .select()
                .from(surveyAnswerOptionTable)
                .where(
                    and(
                        eq(
                            surveyAnswerOptionTable.surveyQuestionOptionId,
                            other.id,
                        ),
                        isNull(surveyAnswerOptionTable.deletedAt),
                    ),
                ),
        ).toHaveLength(0);
        await withdrawSurveyResponse({
            db,
            conversationSlugId,
            didWrite: "did:test:survey",
            userAgent: "Vitest",
            now,
            currentDisplayLanguage: "en",
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: () => Promise.resolve(undefined),
        });
        expect((await loadState()).answersByQuestionId.size).toBe(0);
        expect(
            await db
                .select()
                .from(surveyAnswerOptionTable)
                .where(isNull(surveyAnswerOptionTable.deletedAt)),
        ).toHaveLength(0);
        expect(
            await db
                .select()
                .from(surveyAnswerTable)
                .where(isNull(surveyAnswerTable.deletedAt)),
        ).toHaveLength(0);
    });

    it("rejects unselected text and text over the limit without changing a saved answer", async () => {
        await configure({ allowsText: true });
        const { question, first, other } = await firstQuestion();
        const answer = {
            questionType: "choice",
            optionSlugIds: [first.slugId],
        } satisfies SurveyAnswerSubmission;
        await save({ questionSlugId: question.slugId, answer });
        await expect(
            save({
                questionSlugId: question.slugId,
                answer: {
                    ...answer,
                    optionTextValues: { [other.slugId]: "Unselected" },
                },
            }),
        ).rejects.toThrow("Invalid survey answer");
        await expect(
            save({
                questionSlugId: question.slugId,
                answer: {
                    ...answer,
                    optionTextValues: { [first.slugId]: "x".repeat(301) },
                },
            }),
        ).rejects.toThrow("Invalid survey answer");
        expect(
            (await loadState()).answersByQuestionId.get(question.id)
                ?.optionSlugIds,
        ).toEqual([first.slugId]);
    });

    it("loads accompanying text from persisted selections into the owner export", async () => {
        const { buildSurveyParticipantResponseRows, loadSurveyExportContext } =
            await exportModulePromise;
        await configure({ allowsText: true });
        const { question, other } = await firstQuestion();
        await save({
            questionSlugId: question.slugId,
            answer: {
                questionType: "choice",
                optionSlugIds: [other.slugId],
                optionTextValues: { [other.slugId]: "Cargo bike" },
            },
        });
        const [conversation] = await db
            .select({ currentContentId: conversationTable.currentContentId })
            .from(conversationTable)
            .where(eq(conversationTable.id, conversationId));
        if (
            conversation?.currentContentId === null ||
            conversation?.currentContentId === undefined
        )
            throw new Error("Missing fixture conversation content");
        const [opinion] = await db
            .insert(opinionTable)
            .values({
                slugId: "opinion1",
                authorId: participantId,
                conversationId,
            })
            .returning();
        if (opinion === undefined) throw new Error("Missing fixture opinion");
        const [opinionContent] = await db
            .insert(opinionContentTable)
            .values({
                opinionId: opinion.id,
                conversationContentId: conversation.currentContentId,
                content: "Test statement",
                contentPlainText: "Test statement",
            })
            .returning();
        if (opinionContent === undefined)
            throw new Error("Missing fixture opinion content");
        await db
            .update(opinionTable)
            .set({ currentContentId: opinionContent.id })
            .where(eq(opinionTable.id, opinion.id));
        const [vote] = await db
            .insert(voteTable)
            .values({ authorId: participantId, opinionId: opinion.id })
            .returning();
        if (vote === undefined) throw new Error("Missing fixture vote");
        const [voteContent] = await db
            .insert(voteContentTable)
            .values({
                voteId: vote.id,
                opinionContentId: opinionContent.id,
                vote: "agree",
            })
            .returning();
        if (voteContent === undefined)
            throw new Error("Missing fixture vote content");
        await db
            .update(voteTable)
            .set({ currentContentId: voteContent.id })
            .where(eq(voteTable.id, vote.id));
        const context = await loadSurveyExportContext({
            db,
            conversationId,
            includeClusterMemberships: false,
            includeOptionText: true,
        });
        expect(
            buildSurveyParticipantResponseRows({
                context,
                participantMap: createExportParticipantMap(),
            }),
        ).toMatchObject([
            {
                "participant-id": 0,
                "question-id": 0,
                "option-id": 1,
                "answer-text-plain": "Cargo bike",
                "answer-text-html": "<p>Cargo bike</p>",
            },
        ]);
        queries.length = 0;
        const publicContext = await loadSurveyExportContext({
            db,
            conversationId,
            includeClusterMemberships: false,
        });
        const optionQueries = queries.filter((query) =>
            query.includes('from "survey_answer_option"'),
        );
        expect(optionQueries).toHaveLength(1);
        expect(
            optionQueries.every(
                (query) => !query.includes('"text_value_plain_text"'),
            ),
        ).toBe(true);
        expect(
            publicContext.participantStates[0]?.surveyState.answersByQuestionId.get(
                question.id,
            )?.optionTextValues,
        ).toBeUndefined();
    });
});
