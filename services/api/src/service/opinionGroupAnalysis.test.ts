import { describe, expect, it } from "vitest";
import {
    buildAnalysisDescriptionReadiness,
    isDescriptionReadinessFreshForExpectedLocales,
    shouldUseSystemDescriptions,
} from "./analysisDescriptionReadiness.js";
import {
    buildAnalysisViewOptions,
    getCanonicalAnalysisView,
    getDisplayableGroupCounts,
    getRequestedAnalysisView,
    selectLatestOpinionGroupResultForDisplay,
    shouldFallbackToAuto,
    type LatestOpinionGroupResultRow,
    type SnapshotCandidateOption,
} from "./opinionGroupAnalysis.js";

function resultRow(
    overrides: Partial<LatestOpinionGroupResultRow>,
): LatestOpinionGroupResultRow {
    return {
        conversationId: 1,
        authorId: "user-1",
        organizationId: null,
        preferredOpinionGroupCount: null,
        variantsEnabled: false,
        aiLabelingEnabled: true,
        viewSnapshotId: 10,
        surveyAggregateSnapshotId: null,
        participantCount: 57,
        opinionCount: 12,
        voteCount: 34,
        totalOpinionCount: 15,
        totalVoteCount: 40,
        totalParticipantCount: 60,
        moderatedOpinionCount: 2,
        hiddenOpinionCount: 1,
        isClosed: false,
        snapshotId: 20,
        resultId: 30,
        outcome: "success",
        englishLocaleStatus: "ready",
        englishAiGenerationExpected: true,
        requestedLocaleStatus: "ready",
        requestedTranslationExpected: true,
        ...overrides,
    };
}

function candidate(
    overrides: Partial<SnapshotCandidateOption>,
): SnapshotCandidateOption {
    return {
        candidateId: 1,
        groupCount: 2,
        selectionScore: 0.8,
        silhouetteScore: 0.7,
        balanceScore: 0.9,
        ...overrides,
    };
}

function select({
    rows,
    displayLanguage = "en",
}: {
    rows: LatestOpinionGroupResultRow[];
    displayLanguage?: string;
}) {
    return selectLatestOpinionGroupResultForDisplay({
        rows,
        displayLanguage,
    });
}

describe("analysis view snapshot defaults", () => {
    it("defaults omitted view to facilitator preference", () => {
        expect(
            getRequestedAnalysisView({
                analysisView: undefined,
            }),
        ).toBe("facilitator_preference");
    });

    it("preserves explicit requests before canonical snapshot fallback", () => {
        expect(
            getRequestedAnalysisView({
                analysisView: "3",
            }),
        ).toBe("3");
    });

    it("canonicalizes every non-auto view to auto when variants are disabled", () => {
        expect(
            getCanonicalAnalysisView({
                requestedView: "facilitator_preference",
                variantsEnabled: false,
            }),
        ).toBe("auto");
        expect(
            getCanonicalAnalysisView({
                requestedView: "3",
                variantsEnabled: false,
            }),
        ).toBe("auto");
        expect(
            shouldFallbackToAuto({
                requestedView: "facilitator_preference",
                variantsEnabled: false,
            }),
        ).toBe(true);
        expect(
            shouldFallbackToAuto({
                requestedView: "auto",
                variantsEnabled: false,
            }),
        ).toBe(false);
    });
});

describe("selectLatestOpinionGroupResultForDisplay", () => {
    it("uses latest analysis while English labels are pending", () => {
        const latestPending = resultRow({
            viewSnapshotId: 2,
            snapshotId: 200,
            englishLocaleStatus: "pending",
            requestedLocaleStatus: "pending",
        });
        const olderReady = resultRow({
            viewSnapshotId: 1,
            snapshotId: 100,
        });

        const selected = select({ rows: [latestPending, olderReady] });

        expect(selected?.latestResult.viewSnapshotId).toBe(2);
        expect(selected?.latestResult.snapshotId).toBe(200);
        expect(selected?.useSystemDescriptions).toBe(false);
        expect(selected?.descriptionReadiness.state).toBe("english_pending");
    });

    it("uses latest analysis when AI generation is not expected", () => {
        const selected = select({
            rows: [
                resultRow({
                    viewSnapshotId: 2,
                    englishLocaleStatus: "pending",
                    englishAiGenerationExpected: false,
                    requestedLocaleStatus: "pending",
                }),
                resultRow({ viewSnapshotId: 1 }),
            ],
        });

        expect(selected?.latestResult.viewSnapshotId).toBe(2);
        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("reports requested locale readiness separately from English readiness", () => {
        const selected = select({
            rows: [
                resultRow({
                    englishLocaleStatus: "ready",
                    requestedLocaleStatus: "pending",
                    requestedTranslationExpected: true,
                }),
            ],
            displayLanguage: "fr",
        });

        expect(selected?.useSystemDescriptions).toBe(true);
        expect(selected?.descriptionReadiness.state).toBe("requested_pending");
        expect(selected?.descriptionReadiness.shouldRetry).toBe(true);
    });

    it("does not wait on labels when conversation AI labeling is disabled", () => {
        const selected = select({
            rows: [
                resultRow({
                    aiLabelingEnabled: false,
                    englishLocaleStatus: "pending",
                    requestedLocaleStatus: "pending",
                }),
            ],
        });

        expect(selected?.latestResult.viewSnapshotId).toBe(10);
        expect(selected?.useSystemDescriptions).toBe(false);
    });

    it("uses system descriptions when latest English labels are ready", () => {
        const selected = select({ rows: [resultRow({})] });

        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("uses available system descriptions after English fallback", () => {
        const selected = select({
            rows: [
                resultRow({
                    viewSnapshotId: 2,
                    englishLocaleStatus: "fallback",
                    requestedLocaleStatus: "fallback",
                }),
                resultRow({ viewSnapshotId: 1 }),
            ],
        });

        expect(selected?.latestResult.viewSnapshotId).toBe(2);
        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("uses English labels while translations are pending", () => {
        const selected = select({
            rows: [
                resultRow({
                    viewSnapshotId: 2,
                    englishLocaleStatus: "ready",
                    requestedLocaleStatus: "pending",
                }),
                resultRow({ viewSnapshotId: 1 }),
            ],
            displayLanguage: "fr",
        });

        expect(selected?.latestResult.viewSnapshotId).toBe(2);
        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("uses English labels while translation is pending if translation is not expected", () => {
        const selected = select({
            rows: [
                resultRow({
                    viewSnapshotId: 2,
                    englishLocaleStatus: "ready",
                    requestedLocaleStatus: "pending",
                    requestedTranslationExpected: false,
                }),
                resultRow({ viewSnapshotId: 1 }),
            ],
            displayLanguage: "fr",
        });

        expect(selected?.latestResult.viewSnapshotId).toBe(2);
        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("uses English labels after translation fallback", () => {
        const selected = select({
            rows: [
                resultRow({
                    viewSnapshotId: 2,
                    englishLocaleStatus: "ready",
                    requestedLocaleStatus: "fallback",
                }),
                resultRow({ viewSnapshotId: 1 }),
            ],
            displayLanguage: "fr",
        });

        expect(selected?.latestResult.viewSnapshotId).toBe(2);
        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("does not fall back to stale successful analysis when latest is insufficient", () => {
        const selected = select({
            rows: [
                resultRow({ outcome: "insufficient_data", viewSnapshotId: 2 }),
                resultRow({ outcome: "success", viewSnapshotId: 1 }),
            ],
        });

        expect(selected).toBeUndefined();
    });
});

describe("analysis description readiness", () => {
    it("does not retry when AI labeling is disabled", () => {
        const readiness = buildAnalysisDescriptionReadiness({
            aiLabelingEnabled: false,
            requestedLocale: "fr",
            englishStatus: "pending",
            englishExpected: true,
            requestedStatus: "pending",
            requestedExpected: true,
        });

        expect(readiness.state).toBe("disabled");
        expect(readiness.shouldRetry).toBe(false);
        expect(
            shouldUseSystemDescriptions({
                aiLabelingEnabled: false,
                requestedLocale: "fr",
                englishStatus: "ready",
                englishExpected: true,
                requestedStatus: "ready",
                requestedExpected: true,
            }),
        ).toBe(false);
    });

    it("only blocks system descriptions while expected English labels are pending", () => {
        expect(
            shouldUseSystemDescriptions({
                aiLabelingEnabled: true,
                requestedLocale: "fr",
                englishStatus: "pending",
                englishExpected: true,
                requestedStatus: "pending",
                requestedExpected: true,
            }),
        ).toBe(false);
        expect(
            shouldUseSystemDescriptions({
                aiLabelingEnabled: true,
                requestedLocale: "fr",
                englishStatus: "pending",
                englishExpected: false,
                requestedStatus: "pending",
                requestedExpected: true,
            }),
        ).toBe(true);
    });

    it("checks expected locale freshness without treating unrelated locales as stale", () => {
        const readiness = buildAnalysisDescriptionReadiness({
            aiLabelingEnabled: true,
            requestedLocale: "fr",
            englishStatus: "ready",
            englishExpected: true,
            requestedStatus: "pending",
            requestedExpected: true,
        });

        expect(
            isDescriptionReadinessFreshForExpectedLocales({
                readiness,
                expectedLocales: ["fr"],
            }),
        ).toBe(false);
        expect(
            isDescriptionReadinessFreshForExpectedLocales({
                readiness,
                expectedLocales: ["es"],
            }),
        ).toBe(true);
    });
});

describe("buildAnalysisViewOptions", () => {
    it("keeps premium variants visible but locked when variants are disabled", () => {
        const systemCandidate = candidate({
            candidateId: 11,
            groupCount: 2,
        });

        const options = buildAnalysisViewOptions({
            variantsEnabled: false,
            preferredGroupCount: 4,
            candidates: [
                systemCandidate,
                candidate({ candidateId: 44, groupCount: 4 }),
            ],
            systemCandidate,
        });

        const systemDefault = options.find((option) => option.view === "auto");
        const facilitatorPreference = options.find(
            (option) => option.view === "facilitator_preference",
        );
        const fixedOptions = options.filter((option) =>
            ["2", "3", "4", "5", "6"].includes(option.view),
        );

        expect(systemDefault).toMatchObject({
            status: "recommended",
            candidate: {
                groupCount: 2,
                assessment: {
                    selectionScore: 0.8,
                },
            },
        });
        expect(facilitatorPreference).toMatchObject({
            status: "locked",
            reason: "analysis_variants_not_available",
            resolvesToView: "auto",
        });
        expect(fixedOptions).toHaveLength(5);
        expect(fixedOptions.every((option) => option.status === "locked")).toBe(
            true,
        );
    });

    it("marks unavailable fixed group counts as unavailable when variants are enabled", () => {
        const systemCandidate = candidate({
            candidateId: 22,
            groupCount: 2,
        });

        const options = buildAnalysisViewOptions({
            variantsEnabled: true,
            preferredGroupCount: null,
            candidates: [systemCandidate],
            systemCandidate,
        });

        expect(options.find((option) => option.view === "2")).toMatchObject({
            status: "recommended",
            candidate: {
                candidateId: 22,
            },
        });
        expect(options.find((option) => option.view === "3")).toMatchObject({
            status: "unavailable",
            groupCount: 3,
            reason: "fixed_group_count_unavailable",
        });
    });

    it("keeps defaults pinned and fixed group counts numeric", () => {
        const systemCandidate = candidate({
            candidateId: 33,
            groupCount: 3,
            selectionScore: 0.95,
        });

        const options = buildAnalysisViewOptions({
            variantsEnabled: true,
            preferredGroupCount: 4,
            candidates: [
                candidate({
                    candidateId: 22,
                    groupCount: 2,
                    selectionScore: 0.4,
                }),
                systemCandidate,
                candidate({
                    candidateId: 44,
                    groupCount: 4,
                    selectionScore: 0.8,
                }),
            ],
            systemCandidate,
        });

        expect(options.map((option) => option.view)).toEqual([
            "facilitator_preference",
            "auto",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]);
        expect(options[0]).toMatchObject({
            view: "facilitator_preference",
            status: "available",
            resolvesToView: "4",
            candidate: {
                groupCount: 4,
                assessment: {
                    selectionScore: 0.8,
                },
            },
        });
    });

    it("keeps facilitator preference pointing to preferred count when unavailable", () => {
        const systemCandidate = candidate({
            candidateId: 33,
            groupCount: 3,
            selectionScore: 0.95,
        });

        const options = buildAnalysisViewOptions({
            variantsEnabled: true,
            preferredGroupCount: 5,
            candidates: [systemCandidate],
            systemCandidate,
        });

        expect(
            options.find((option) => option.view === "facilitator_preference"),
        ).toMatchObject({
            view: "facilitator_preference",
            status: "unavailable",
            reason: "fixed_group_count_unavailable",
            groupCount: 5,
            resolvesToView: "5",
        });
    });

    it("uses discouraged only for candidate-backed options", () => {
        const discouragedCandidate = candidate({
            candidateId: 22,
            groupCount: 2,
            selectionScore: 0.4,
        });
        const systemCandidate = candidate({
            candidateId: 33,
            groupCount: 3,
            selectionScore: 0.8,
        });

        const options = buildAnalysisViewOptions({
            variantsEnabled: true,
            preferredGroupCount: null,
            candidates: [discouragedCandidate, systemCandidate],
            systemCandidate,
        });

        expect(options.find((option) => option.view === "2")).toMatchObject({
            status: "discouraged",
            candidate: {
                candidateId: 22,
            },
        });
    });
});

describe("getDisplayableGroupCounts", () => {
    it("only includes selectable candidates", () => {
        expect(
            getDisplayableGroupCounts({
                candidates: [
                    candidate({ groupCount: 2, selectionScore: 0.8 }),
                    candidate({ groupCount: 3, selectionScore: null }),
                    candidate({ groupCount: 4, selectionScore: 0.6 }),
                ],
            }),
        ).toEqual([2, 4]);
    });
});
