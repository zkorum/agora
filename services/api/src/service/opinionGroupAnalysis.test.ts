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
    shouldFallbackToAuto,
    type SnapshotCandidateOption,
} from "./opinionGroupAnalysis.js";

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
