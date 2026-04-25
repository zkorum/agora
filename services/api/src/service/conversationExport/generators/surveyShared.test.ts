import { describe, expect, it } from "vitest";
import { createExportParticipantMap } from "./participantMap.js";
import {
    buildSurveyAggregateRows,
    buildSurveyCompletionCounts,
    buildSurveyParticipantResponseRows,
    buildSurveyQuestionOptionRows,
    buildSurveyQuestionRows,
    type SurveyExportContext,
    type SurveyParticipantExportState,
} from "./surveyShared.js";
import {
    deriveSurveyGate,
    type ActiveSurveyConfigRecord,
    type StoredSurveyAnswer,
    type SurveyParticipantState,
} from "@/service/survey.js";

const surveyConfig: ActiveSurveyConfigRecord = {
    id: 1,
    currentRevision: 1,
    questions: [
        {
            id: 11,
            slugId: "qMono001",
            questionType: "choice",
            choiceDisplay: "auto",
            currentSemanticVersion: 1,
            displayOrder: 0,
            isRequired: true,
            questionText: "Where are you from?",
            constraints: {
                type: "choice",
                minSelections: 1,
                maxSelections: 1,
            },
            options: [
                {
                    id: 101,
                    slugId: "optYes01",
                    displayOrder: 0,
                    optionText: "Yes",
                },
                {
                    id: 102,
                    slugId: "optNo001",
                    displayOrder: 1,
                    optionText: "No",
                },
            ],
        },
        {
            id: 12,
            slugId: "qText001",
            questionType: "free_text",
            choiceDisplay: "auto",
            currentSemanticVersion: 1,
            displayOrder: 1,
            isRequired: false,
            questionText: "Anything else?",
            constraints: {
                type: "free_text",
                inputMode: "rich_text",
                minPlainTextLength: 0,
                maxPlainTextLength: 280,
                maxHtmlLength: 840,
            },
            options: [],
        },
    ],
};

function createSurveyParticipantExportState({
    participantId,
    responseId,
    answersByQuestionId,
    withdrawnAt = null,
}: {
    participantId: string;
    responseId: number;
    answersByQuestionId: SurveyParticipantState["answersByQuestionId"];
    withdrawnAt?: Date | null;
}): SurveyParticipantExportState {
    const surveyState: SurveyParticipantState = {
        activeSurveyConfig: surveyConfig,
        response: {
            id: responseId,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            completedAt:
                withdrawnAt === null
                    ? new Date("2026-01-01T00:00:10.000Z")
                    : null,
            withdrawnAt,
        },
        answersByQuestionId,
    };

    return {
        participantId,
        surveyState,
        surveyGate: deriveSurveyGate({ surveyState, participantId }),
    };
}

function createCompleteMonoChoiceState({
    participantId,
    responseId,
    optionSlugId,
    freeTextHtml,
}: {
    participantId: string;
    responseId: number;
    optionSlugId: string;
    freeTextHtml?: string;
}): SurveyParticipantExportState {
    const answersByQuestionId = new Map<number, StoredSurveyAnswer>([
        [
            11,
            {
                answerId: responseId * 10 + 1,
                answeredQuestionSemanticVersion: 1,
                textValueHtml: null,
                optionSlugIds: [optionSlugId],
            },
        ],
    ]);

    if (freeTextHtml !== undefined) {
        answersByQuestionId.set(12, {
            answerId: responseId * 10 + 2,
            answeredQuestionSemanticVersion: 1,
            textValueHtml: freeTextHtml,
            optionSlugIds: [],
        });
    }

    return createSurveyParticipantExportState({
        participantId,
        responseId,
        answersByQuestionId,
    });
}

describe("buildSurveyParticipantResponseRows", () => {
    it("exports question and option metadata with explicit order columns", () => {
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set(),
            participantStates: [],
            clusterMembershipByParticipantId: new Map(),
        };

        expect(buildSurveyQuestionRows({ context })).toEqual([
            {
                "question-id": 0,
                "question-slug-id": "qMono001",
                "question-order": 1,
                "question-type": "choice",
                "question-text": "Where are you from?",
                "is-required": 1,
                "question-semantic-version": 1,
            },
            {
                "question-id": 1,
                "question-slug-id": "qText001",
                "question-order": 2,
                "question-type": "free_text",
                "question-text": "Anything else?",
                "is-required": 0,
                "question-semantic-version": 1,
            },
        ]);
        expect(buildSurveyQuestionOptionRows({ context })).toEqual([
            {
                "option-id": 0,
                "option-slug-id": "optYes01",
                "question-id": 0,
                "option-order": 1,
                "option-text": "Yes",
            },
            {
                "option-id": 1,
                "option-slug-id": "optNo001",
                "question-id": 0,
                "option-order": 2,
                "option-text": "No",
            },
        ]);
    });

    it("exports per-question participant rows with shared export-scoped IDs", () => {
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set(["user-1", "user-2"]),
            participantStates: [
                createCompleteMonoChoiceState({
                    participantId: "user-1",
                    responseId: 1,
                    optionSlugId: "optYes01",
                    freeTextHtml: "<p>Hello world</p>",
                }),
                createSurveyParticipantExportState({
                    participantId: "user-2",
                    responseId: 2,
                    answersByQuestionId: new Map(),
                    withdrawnAt: new Date("2026-01-01T00:00:20.000Z"),
                }),
            ],
            clusterMembershipByParticipantId: new Map(),
        };

        const rows = buildSurveyParticipantResponseRows({
            context,
            participantMap: createExportParticipantMap(),
        });

        expect(rows).toHaveLength(2);
        expect(rows[0]["participant-id"]).toBe(0);
        expect(rows[0]["question-id"]).toBe(0);
        expect(rows[0]["option-id"]).toBe(0);
        expect(rows[1]["participant-id"]).toBe(0);
        expect(rows[1]["question-id"]).toBe(1);
        expect(rows[1]["answer-text-plain"]).toBe("Hello world");
    });
});

describe("buildSurveyAggregateRows", () => {
    it("suppresses the whole overall question block when a small non-zero cell is present", () => {
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set([
                "user-1",
                "user-2",
                "user-3",
                "user-4",
                "user-5",
                "user-6",
                "user-7",
            ]),
            participantStates: [
                createCompleteMonoChoiceState({
                    participantId: "user-1",
                    responseId: 1,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-2",
                    responseId: 2,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-3",
                    responseId: 3,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-4",
                    responseId: 4,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-5",
                    responseId: 5,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-6",
                    responseId: 6,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-7",
                    responseId: 7,
                    optionSlugId: "optNo001",
                }),
            ],
            clusterMembershipByParticipantId: new Map(),
        };

        const rows = buildSurveyAggregateRows({
            context,
            includeSuppression: true,
        });

        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.scope === "overall")).toBe(true);
        expect(rows.every((row) => row.isSuppressed)).toBe(true);
        expect(rows.every((row) => row.count === undefined)).toBe(true);
        expect(rows.every((row) => row.percentage === undefined)).toBe(true);
        expect(
            rows.every(
                (row) => row.suppressionReason === "count_below_threshold",
            ),
        ).toBe(true);
    });

    it("includes unsuppressed cluster rows for full aggregates", () => {
        const participantStates = [
            createCompleteMonoChoiceState({
                participantId: "user-a1",
                responseId: 1,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a2",
                responseId: 2,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a3",
                responseId: 3,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a4",
                responseId: 4,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a5",
                responseId: 5,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b1",
                responseId: 6,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b2",
                responseId: 7,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b3",
                responseId: 8,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b4",
                responseId: 9,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b5",
                responseId: 10,
                optionSlugId: "optNo001",
            }),
        ];
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set(
                participantStates.map(
                    (participantState) => participantState.participantId,
                ),
            ),
            participantStates,
            clusterMembershipByParticipantId: new Map(
                participantStates.map((participantState) => [
                    participantState.participantId,
                    participantState.participantId.startsWith("user-a")
                        ? {
                              clusterId: "0",
                              clusterLabel: "Cluster 0",
                          }
                        : {
                              clusterId: "1",
                              clusterLabel: "Cluster 1",
                          },
                ]),
            ),
        };

        const rows = buildSurveyAggregateRows({
            context,
            includeSuppression: false,
        });

        expect(rows.some((row) => row.scope === "cluster")).toBe(true);
        expect(
            rows.some(
                (row) =>
                    row.scope === "cluster" &&
                    row.clusterId === "0" &&
                    row.optionId === "optYes01" &&
                    row.count === 5,
            ),
        ).toBe(true);
    });

    it("keeps a visible suppressed cluster block instead of removing it", () => {
        const participantStates = [
            createCompleteMonoChoiceState({
                participantId: "user-a1",
                responseId: 1,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a2",
                responseId: 2,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a3",
                responseId: 3,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a4",
                responseId: 4,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a5",
                responseId: 5,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a6",
                responseId: 6,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b1",
                responseId: 7,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b2",
                responseId: 8,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b3",
                responseId: 9,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b4",
                responseId: 10,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b5",
                responseId: 11,
                optionSlugId: "optNo001",
            }),
        ];
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set(
                participantStates.map(
                    (participantState) => participantState.participantId,
                ),
            ),
            participantStates,
            clusterMembershipByParticipantId: new Map(
                participantStates.map((participantState) => [
                    participantState.participantId,
                    participantState.participantId.startsWith("user-a")
                        ? {
                              clusterId: "0",
                              clusterLabel: "Cluster 0",
                          }
                        : {
                              clusterId: "1",
                              clusterLabel: "Cluster 1",
                          },
                ]),
            ),
        };

        const rows = buildSurveyAggregateRows({
            context,
            includeSuppression: true,
        });

        const suppressedClusterRows = rows.filter(
            (row) => row.scope === "cluster" && row.clusterId === "0",
        );
        const visibleClusterRows = rows.filter(
            (row) => row.scope === "cluster" && row.clusterId === "1",
        );

        expect(suppressedClusterRows).toHaveLength(2);
        expect(
            suppressedClusterRows.every((row) => row.isSuppressed),
        ).toBe(true);
        expect(
            suppressedClusterRows.every((row) => row.count === undefined),
        ).toBe(true);
        expect(
            suppressedClusterRows.every(
                (row) =>
                    row.suppressionReason === "cluster_deductive_disclosure",
            ),
        ).toBe(true);
        expect(visibleClusterRows).toHaveLength(2);
        expect(visibleClusterRows.every((row) => !row.isSuppressed)).toBe(true);
    });

    it("does not suppress zero-count options in public aggregates", () => {
        const participantStates = [
            createCompleteMonoChoiceState({
                participantId: "user-a1",
                responseId: 1,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a2",
                responseId: 2,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a3",
                responseId: 3,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a4",
                responseId: 4,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-a5",
                responseId: 5,
                optionSlugId: "optYes01",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b1",
                responseId: 6,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b2",
                responseId: 7,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b3",
                responseId: 8,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b4",
                responseId: 9,
                optionSlugId: "optNo001",
            }),
            createCompleteMonoChoiceState({
                participantId: "user-b5",
                responseId: 10,
                optionSlugId: "optNo001",
            }),
        ];
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set(
                participantStates.map(
                    (participantState) => participantState.participantId,
                ),
            ),
            participantStates,
            clusterMembershipByParticipantId: new Map(
                participantStates.map((participantState) => [
                    participantState.participantId,
                    participantState.participantId.startsWith("user-a")
                        ? {
                              clusterId: "0",
                              clusterLabel: "Cluster 0",
                          }
                        : {
                              clusterId: "1",
                              clusterLabel: "Cluster 1",
                          },
                ]),
            ),
        };

        const rows = buildSurveyAggregateRows({
            context,
            includeSuppression: true,
        });

        expect(
            rows.some(
                (row) =>
                    row.scope === "overall" &&
                    row.optionId === "optYes01" &&
                    row.count === 5 &&
                    !row.isSuppressed,
            ),
        ).toBe(true);
        expect(
            rows.some(
                (row) =>
                    row.scope === "overall" &&
                    row.optionId === "optNo001" &&
                    row.count === 5 &&
                    !row.isSuppressed,
            ),
        ).toBe(true);
        expect(
            rows.some(
                (row) =>
                    row.scope === "cluster" &&
                    row.clusterId === "0" &&
                    row.optionId === "optNo001" &&
                    row.count === 0 &&
                    !row.isSuppressed,
            ),
        ).toBe(true);
        expect(
            rows.some(
                (row) =>
                    row.scope === "cluster" &&
                    row.clusterId === "1" &&
                    row.optionId === "optYes01" &&
                    row.count === 0 &&
                    !row.isSuppressed,
            ),
        ).toBe(true);

        const zeroOverallContext: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set([
                "user-z1",
                "user-z2",
                "user-z3",
                "user-z4",
                "user-z5",
            ]),
            participantStates: [
                createCompleteMonoChoiceState({
                    participantId: "user-z1",
                    responseId: 11,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-z2",
                    responseId: 12,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-z3",
                    responseId: 13,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-z4",
                    responseId: 14,
                    optionSlugId: "optYes01",
                }),
                createCompleteMonoChoiceState({
                    participantId: "user-z5",
                    responseId: 15,
                    optionSlugId: "optYes01",
                }),
            ],
            clusterMembershipByParticipantId: new Map(),
        };

        const zeroOverallRows = buildSurveyAggregateRows({
            context: zeroOverallContext,
            includeSuppression: true,
        });

        expect(
            zeroOverallRows.some(
                (row) =>
                    row.scope === "overall" &&
                    row.optionId === "optNo001" &&
                    row.count === 0 &&
                    !row.isSuppressed,
            ),
        ).toBe(true);
    });
});

describe("buildSurveyCompletionCounts", () => {
    it("folds withdrawn responses into not started counts", () => {
        const context: SurveyExportContext = {
            activeSurveyConfig: surveyConfig,
            participantIds: new Set([
                "user-1",
                "user-2",
                "user-3",
                "user-4",
                "user-5",
            ]),
            participantStates: [
                createCompleteMonoChoiceState({
                    participantId: "user-1",
                    responseId: 1,
                    optionSlugId: "optYes01",
                }),
                createSurveyParticipantExportState({
                    participantId: "user-2",
                    responseId: 2,
                    answersByQuestionId: new Map([
                        [
                            11,
                            {
                                answerId: 21,
                                answeredQuestionSemanticVersion: 0,
                                textValueHtml: null,
                                optionSlugIds: ["optYes01"],
                            },
                        ],
                    ]),
                }),
                createSurveyParticipantExportState({
                    participantId: "user-3",
                    responseId: 3,
                    answersByQuestionId: new Map(),
                }),
                createSurveyParticipantExportState({
                    participantId: "user-4",
                    responseId: 4,
                    answersByQuestionId: new Map(),
                    withdrawnAt: new Date("2026-01-01T00:00:20.000Z"),
                }),
            ],
            clusterMembershipByParticipantId: new Map(),
        };

        expect(buildSurveyCompletionCounts({ context })).toEqual({
            total: 5,
            completeValid: 1,
            needsUpdate: 1,
            notStarted: 3,
            inProgress: 0,
        });
    });
});
