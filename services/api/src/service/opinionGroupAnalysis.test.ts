import { describe, expect, it } from "vitest";
import {
    selectLatestOpinionGroupResultForDisplay,
    type LatestOpinionGroupResultRow,
} from "./opinionGroupAnalysis.js";

function resultRow(
    overrides: Partial<LatestOpinionGroupResultRow>,
): LatestOpinionGroupResultRow {
    return {
        conversationId: 1,
        aiLabelingEnabled: true,
        viewSnapshotId: 10,
        surveyAggregateSnapshotId: null,
        participantCount: 57,
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
