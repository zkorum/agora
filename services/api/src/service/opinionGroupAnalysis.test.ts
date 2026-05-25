import { describe, expect, it } from "vitest";
import {
    buildAnalysisViewOptions,
    selectLatestOpinionGroupResultForDisplay,
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

describe("selectLatestOpinionGroupResultForDisplay", () => {
    it("waits on latest pending labels when AI generation is expected", () => {
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

        expect(selected?.latestResult.viewSnapshotId).toBe(1);
        expect(selected?.latestResult.snapshotId).toBe(100);
        expect(selected?.useSystemDescriptions).toBe(true);
    });

    it("does not wait on pending labels when AI generation is not expected", () => {
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
        expect(selected?.useSystemDescriptions).toBe(false);
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

    it("shows latest analysis without system descriptions after English fallback", () => {
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
        expect(selected?.useSystemDescriptions).toBe(false);
    });

    it("waits on pending translations when translation is expected", () => {
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

        expect(selected?.latestResult.viewSnapshotId).toBe(1);
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

        const systemDefault = options.find(
            (option) => option.view === "system_default",
        );
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
            resolvesToView: "system_default",
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
                candidate({ candidateId: 22, groupCount: 2, selectionScore: 0.4 }),
                systemCandidate,
                candidate({ candidateId: 44, groupCount: 4, selectionScore: 0.8 }),
            ],
            systemCandidate,
        });

        expect(options.map((option) => option.view)).toEqual([
            "facilitator_preference",
            "system_default",
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
