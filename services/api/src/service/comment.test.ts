import { describe, expect, it } from "vitest";
import {
    buildAnalysisOpinionContent,
    isPersonalNonSeedOpinionByViewer,
} from "./comment.js";

type SnapshotOpinionRow = Parameters<
    typeof buildAnalysisOpinionContent
>[0]["row"];

const displayContentPreferences: Parameters<
    typeof buildAnalysisOpinionContent
>[0]["displayContentPreferences"] = {
    displayLanguage: "en",
    targetLanguage: "fr",
    spokenLanguages: ["en"],
    translationAllowed: true,
};

function snapshotOpinionRow(
    overrides: Partial<SnapshotOpinionRow> = {},
): SnapshotOpinionRow {
    return {
        analysisSnapshotOpinionId: 1,
        opinionId: 2,
        opinionContentId: 3,
        contentPublicId: "00000000-0000-4000-8000-000000000001",
        opinionSlugId: "statement-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        opinion: "SECRET ORIGINAL",
        sourceLanguageCode: "en",
        sourceRawLanguageCode: "en",
        sourceLanguageProvider: "lingua",
        sourceLanguageConfidence: 1,
        translatedContent: "SECRET TRANSLATION",
        translationSourceLanguageCode: "en",
        translationWorkStatus: "completed",
        authorId: "user-1",
        username: "alice",
        isSeed: false,
        currentContentId: 3,
        numAgrees: 4,
        numDisagrees: 2,
        numPasses: 1,
        groupAwareConsensusAgree: 0.8,
        groupAwareConsensusDisagree: 0.2,
        divisiveScore: 0.1,
        moderationAction: null,
        moderationExplanation: null,
        moderationReason: null,
        moderationCreatedAt: null,
        moderationUpdatedAt: null,
        ...overrides,
    };
}

describe("opinion translation visibility", () => {
    it("detects personal non-seed opinions written by the viewer", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: "user-1",
                isSeed: false,
            }),
        ).toBe(true);
    });

    it("does not treat seed opinions as personal viewer opinions", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: "user-1",
                isSeed: true,
            }),
        ).toBe(false);
    });

    it("does not match opinions from other viewers", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: "user-2",
                isSeed: false,
            }),
        ).toBe(false);
    });

    it("does not match anonymous viewers", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: undefined,
                isSeed: false,
            }),
        ).toBe(false);
    });
});

describe("checkpoint opinion content projection", () => {
    it("returns no content, translation, or moderation details when hidden", () => {
        const content = buildAnalysisOpinionContent({
            row: snapshotOpinionRow({
                moderationAction: "hide",
                moderationReason: "illegal",
                moderationExplanation: "SECRET EXPLANATION",
                moderationCreatedAt: new Date("2026-01-02T00:00:00.000Z"),
                moderationUpdatedAt: new Date("2026-01-02T00:00:00.000Z"),
            }),
            displayContentPreferences,
            viewerUserId: undefined,
        });

        expect(content).toEqual({
            status: "redacted",
            reason: "hidden_by_moderation",
        });
        expect(JSON.stringify(content)).not.toContain("SECRET");
    });

    it("returns no historical content or translation when deleted", () => {
        const content = buildAnalysisOpinionContent({
            row: snapshotOpinionRow({ currentContentId: null }),
            displayContentPreferences,
            viewerUserId: undefined,
        });

        expect(content).toEqual({
            status: "redacted",
            reason: "statement_deleted",
        });
        expect(JSON.stringify(content)).not.toContain("SECRET");
    });

    it("keeps moved content and its public moderation context visible", () => {
        const content = buildAnalysisOpinionContent({
            row: snapshotOpinionRow({
                moderationAction: "move",
                moderationReason: "spam",
                moderationExplanation: "Off-topic promotion",
                moderationCreatedAt: new Date("2026-01-02T00:00:00.000Z"),
                moderationUpdatedAt: new Date("2026-01-02T00:00:00.000Z"),
            }),
            displayContentPreferences,
            viewerUserId: undefined,
        });

        expect(content).toMatchObject({
            status: "visible",
            html: "SECRET ORIGINAL",
            moderation: {
                status: "moderated",
                action: "move",
                reason: "spam",
                explanation: "Off-topic promotion",
            },
        });
    });
});
