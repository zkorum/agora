import { describe, expect, it, vi } from "vitest";
import { getProjectTranslationTargetLanguagePolicy } from "./translationLanguageSetting.js";
import {
    projectContentNeedsTranslationStatus,
    resolveProjectContentForDisplay,
    toProjectDisplayContent,
    toProjectPageActivity,
    type ProjectContentResolutionProject,
    type ProjectContentTranslationResolutionRow,
} from "./projectPage.js";

vi.mock("../app.js", () => ({
    config: {},
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const translationPolicy = getProjectTranslationTargetLanguagePolicy({
    languageSettings: {
        dynamicTranslationEnabled: true,
        defaultLanguageCode: "en",
        targetLanguageCodes: ["fr"],
    },
});

const baseProject = {
    projectContentPublicId: "00000000-0000-4000-8000-000000000001",
    projectTitle: "Source title",
    dynamicTranslationEnabled: true,
    subtitle: "Source subtitle",
    bodyHtml: "<p>Source body</p>",
    sourceLanguageCode: "en",
    sourceRawLanguageCode: "en",
    sourceLanguageProvider: null,
    sourceLanguageConfidence: null,
} satisfies ProjectContentResolutionProject;

type TestProjectActivityRow = Parameters<
    typeof toProjectPageActivity
>[0]["row"];

function createUnlistedActivityRow(): TestProjectActivityRow {
    return {
        conversationId: 1,
        conversationContentId: 2,
        conversationContentPublicId: "00000000-0000-4000-8000-000000000002",
        slugId: "unlisted-activity",
        isIndexed: false,
        isClosed: false,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        isEdited: false,
        conversationType: "polis",
        title: "Source activity",
        bodyPlainText: "Source activity body",
        sourceLanguageCode: "en",
        sourceRawLanguageCode: "en",
        languageSettingsSource: "conversation_override",
        dynamicTranslationEnabled: true,
    };
}

function resolveProjectContent({
    project = baseProject,
    translationRows = [],
    effectiveLanguageCode = "fr",
    additionalLanguageCodes = ["fr"],
    translationStatus,
}: {
    project?: ProjectContentResolutionProject;
    translationRows?: ProjectContentTranslationResolutionRow[];
    effectiveLanguageCode?: "en" | "fr" | "ru";
    additionalLanguageCodes?: ("en" | "fr" | "ru")[];
    translationStatus?: "not_requested" | "pending" | "running" | "failed";
} = {}) {
    return resolveProjectContentForDisplay({
        project,
        translationRows,
        effectiveLanguageCode,
        additionalLanguageCodes,
        translationStatus,
    });
}

function availableProjectContent(
    displayContent: ReturnType<typeof toProjectDisplayContent>,
) {
    if (displayContent.status !== "available") {
        throw new Error("Expected project display content to be available");
    }
    return displayContent;
}

describe("resolveProjectContentForDisplay", () => {
    it("does not let an English manual fallback override an exact French machine translation", () => {
        const resolved = resolveProjectContent({
            translationRows: [
                {
                    languageCode: "en",
                    title: "English manual fallback",
                    subtitle: null,
                    body: null,
                    sourceKind: "manual",
                    sourceLanguageCode: null,
                },
                {
                    languageCode: "fr",
                    title: "Traduction française",
                    subtitle: null,
                    body: null,
                    sourceKind: "machine",
                    sourceLanguageCode: "en",
                },
            ],
        });
        expect(resolved.localizedContent).toMatchObject({
            kind: "translatable",
            translation: { targetLanguageCode: "fr", status: "completed" },
            variants: { translated: { title: "Traduction française" } },
        });
    });

    it("does not substitute an English manual localization for unsupported French", () => {
        const project = {
            ...baseProject,
            sourceLanguageCode: "ky",
            sourceRawLanguageCode: "ky",
        } satisfies ProjectContentResolutionProject;
        const resolved = resolveProjectContent({
            project,
            effectiveLanguageCode: "fr",
            additionalLanguageCodes: ["en", "ru"],
            translationRows: [
                {
                    languageCode: "en",
                    title: "English localization",
                    subtitle: null,
                    body: null,
                    sourceKind: "manual",
                    sourceLanguageCode: null,
                },
            ],
        });

        expect(resolved.localizedContent).toMatchObject({
            kind: "original_only",
            variants: { original: { title: project.projectTitle } },
        });
        expect(resolved.translatedTitle).toBeUndefined();
    });

    it("returns source title, subtitle, and body as original content for the source language", () => {
        const resolved = resolveProjectContent({
            effectiveLanguageCode: "en",
            additionalLanguageCodes: ["fr"],
        });

        expect(resolved.originalTitle).toBe("Source title");
        expect(resolved.translatedTitle).toBeUndefined();
        expect(resolved.localizedContent).toEqual({
            kind: "original_only",
            sourceVersion: baseProject.projectContentPublicId,
            initialMode: "original",
            variants: {
                original: {
                    title: "Source title",
                    subtitle: "Source subtitle",
                    bodyHtml: "<p>Source body</p>",
                },
            },
        });
    });

    it("treats manual project localization as original-only localized title, subtitle, and body", () => {
        const resolved = resolveProjectContent({
            translationRows: [
                {
                    languageCode: "fr",
                    title: "Titre manuel",
                    subtitle: "Sous-titre manuel",
                    body: "<p>Corps manuel</p>",
                    sourceKind: "manual",
                    sourceLanguageCode: null,
                },
            ],
        });

        const displayContent = availableProjectContent(
            toProjectDisplayContent({
                content: resolved.localizedContent,
                translationAllowed: true,
                displayLanguage: "fr",
                spokenLanguages: [],
            }),
        );

        expect(resolved.originalTitle).toBe("Titre manuel");
        expect(resolved.translatedTitle).toBeUndefined();
        expect(displayContent.mode).toBe("original");
        expect(displayContent.content).toEqual({
            title: "Titre manuel",
            subtitle: "Sous-titre manuel",
            bodyHtml: "<p>Corps manuel</p>",
        });
        expect(displayContent.translationControl).toBeNull();
    });

    it("prefers manual localization over a machine row for the same language", () => {
        const resolved = resolveProjectContent({
            translationRows: [
                {
                    languageCode: "fr",
                    title: "Titre machine",
                    subtitle: "Sous-titre machine",
                    body: "<p>Corps machine</p>",
                    sourceKind: "machine",
                    sourceLanguageCode: "en",
                },
                {
                    languageCode: "fr",
                    title: "Titre manuel",
                    subtitle: "Sous-titre manuel",
                    body: "<p>Corps manuel</p>",
                    sourceKind: "manual",
                    sourceLanguageCode: null,
                },
            ],
        });

        expect(resolved.localizedContent.kind).toBe("original_only");
        expect(resolved.originalTitle).toBe("Titre manuel");
        expect(resolved.translatedTitle).toBeUndefined();
    });

    it("uses completed machine translation for translated display content", () => {
        const resolved = resolveProjectContent({
            translationRows: [
                {
                    languageCode: "fr",
                    title: "Titre machine",
                    subtitle: "Sous-titre machine",
                    body: "<p>Corps machine</p>",
                    sourceKind: "machine",
                    sourceLanguageCode: "en",
                },
            ],
        });

        const displayContent = availableProjectContent(
            toProjectDisplayContent({
                content: resolved.localizedContent,
                translationAllowed: true,
                displayLanguage: "fr",
                spokenLanguages: [],
            }),
        );

        expect(resolved.originalTitle).toBe("Source title");
        expect(resolved.translatedTitle).toBe("Titre machine");
        expect(displayContent.mode).toBe("translated");
        expect(displayContent.content).toEqual({
            title: "Titre machine",
            subtitle: "Sous-titre machine",
            bodyHtml: "<p>Corps machine</p>",
        });
        expect(displayContent.translationControl).toMatchObject({
            status: "completed",
            alternateMode: "original",
            canRequestAlternate: true,
        });
    });

    it("localizes translation source language labels for the display language", () => {
        const resolved = resolveProjectContent({
            project: {
                ...baseProject,
                sourceLanguageCode: "ky",
                sourceRawLanguageCode: "ky",
            },
            effectiveLanguageCode: "ru",
            additionalLanguageCodes: ["ru"],
            translationRows: [
                {
                    languageCode: "ru",
                    title: "Машинный заголовок",
                    subtitle: null,
                    body: null,
                    sourceKind: "machine",
                    sourceLanguageCode: "ky",
                },
            ],
        });

        const displayContent = availableProjectContent(
            toProjectDisplayContent({
                content: resolved.localizedContent,
                translationAllowed: true,
                displayLanguage: "ru",
                spokenLanguages: [],
            }),
        );

        expect(displayContent.translationControl).toMatchObject({
            sourceLanguageLabel: "киргизский",
        });
    });

    it("keeps source content first when the viewer understands the source language", () => {
        const resolved = resolveProjectContent({
            translationRows: [
                {
                    languageCode: "fr",
                    title: "Titre machine",
                    subtitle: "Sous-titre machine",
                    body: "<p>Corps machine</p>",
                    sourceKind: "machine",
                    sourceLanguageCode: "en",
                },
            ],
        });

        const displayContent = availableProjectContent(
            toProjectDisplayContent({
                content: resolved.localizedContent,
                translationAllowed: true,
                displayLanguage: "fr",
                spokenLanguages: ["en"],
            }),
        );

        expect(displayContent.mode).toBe("original");
        expect(displayContent.content.title).toBe("Source title");
        expect(displayContent.translationControl).toMatchObject({
            status: "completed",
            alternateMode: "translated",
            canRequestAlternate: true,
        });
    });

    it("returns original content with translation status when machine translation is missing", () => {
        const resolved = resolveProjectContent({
            translationStatus: "pending",
        });

        const displayContent = availableProjectContent(
            toProjectDisplayContent({
                content: resolved.localizedContent,
                translationAllowed: true,
                displayLanguage: "fr",
                spokenLanguages: [],
            }),
        );

        expect(resolved.localizedContent.kind).toBe("translatable");
        if (resolved.localizedContent.kind !== "translatable") {
            throw new Error("Expected translatable project content");
        }
        expect(resolved.localizedContent.translation.status).toBe("pending");
        expect(resolved.translatedTitle).toBeUndefined();
        expect(displayContent.mode).toBe("original");
        expect(displayContent.content.title).toBe("Source title");
        expect(displayContent.translationControl).toMatchObject({
            status: "pending",
            alternateMode: "translated",
            canRequestAlternate: true,
        });
    });

    it("falls back to original-only when missing translation status is not requested", () => {
        const resolved = resolveProjectContent();

        expect(resolved.localizedContent.kind).toBe("original_only");
        expect(resolved.originalTitle).toBe("Source title");
        expect(resolved.translatedTitle).toBeUndefined();
    });

    it("falls back to source content when the display language is not configured", () => {
        const resolved = resolveProjectContent({ additionalLanguageCodes: [] });

        expect(resolved.localizedContent.kind).toBe("original_only");
        expect(resolved.localizedContent.variants.original).toEqual({
            title: "Source title",
            subtitle: "Source subtitle",
            bodyHtml: "<p>Source body</p>",
        });
        expect(resolved.translatedTitle).toBeUndefined();
    });

    it("ignores stale machine rows whose source language no longer matches", () => {
        const resolved = resolveProjectContent({
            translationRows: [
                {
                    languageCode: "fr",
                    title: "Titre obsolète",
                    subtitle: null,
                    body: null,
                    sourceKind: "machine",
                    sourceLanguageCode: "ru",
                },
            ],
            translationStatus: "failed",
        });

        expect(resolved.localizedContent.kind).toBe("translatable");
        if (resolved.localizedContent.kind !== "translatable") {
            throw new Error("Expected translatable project content");
        }
        expect(resolved.localizedContent.variants).toEqual({
            original: {
                title: "Source title",
                subtitle: "Source subtitle",
                bodyHtml: "<p>Source body</p>",
            },
        });
        expect(resolved.localizedContent.translation.status).toBe("failed");
        expect(resolved.translatedTitle).toBeUndefined();
    });

    it("needs translation status only when machine translation is allowed and unresolved", () => {
        expect(
            projectContentNeedsTranslationStatus({
                project: baseProject,
                translationRows: [],
                effectiveLanguageCode: "fr",
                additionalLanguageCodes: ["fr"],
            }),
        ).toBe(true);

        expect(
            projectContentNeedsTranslationStatus({
                project: baseProject,
                translationRows: [
                    {
                        languageCode: "fr",
                        title: "Titre manuel",
                        subtitle: null,
                        body: null,
                        sourceKind: "manual",
                        sourceLanguageCode: null,
                    },
                ],
                effectiveLanguageCode: "fr",
                additionalLanguageCodes: ["fr"],
            }),
        ).toBe(false);

        expect(
            projectContentNeedsTranslationStatus({
                project: baseProject,
                translationRows: [
                    {
                        languageCode: "fr",
                        title: "Titre machine",
                        subtitle: null,
                        body: null,
                        sourceKind: "machine",
                        sourceLanguageCode: "en",
                    },
                ],
                effectiveLanguageCode: "fr",
                additionalLanguageCodes: ["fr"],
            }),
        ).toBe(false);

        expect(
            projectContentNeedsTranslationStatus({
                project: baseProject,
                translationRows: [],
                effectiveLanguageCode: "fr",
                additionalLanguageCodes: [],
            }),
        ).toBe(false);
    });
});

describe("toProjectPageActivity", () => {
    it.each([true, false])(
        "returns only the original for an unsupported target (indexed=%s)",
        (isIndexed) => {
            const row = { ...createUnlistedActivityRow(), isIndexed };
            const activity = toProjectPageActivity({
                row,
                translation: {
                    conversationContentId: 2,
                    displayLanguageCode: "fr",
                    translatedTitle: "Previously generated French",
                    translatedBody: null,
                    translatedBodyPlainText: null,
                    sourceLanguageCode: "en",
                },
                translationPolicy: getProjectTranslationTargetLanguagePolicy({
                    languageSettings: {
                        dynamicTranslationEnabled: true,
                        defaultLanguageCode: "en",
                        targetLanguageCodes: ["ru"],
                    },
                }),
                displayLanguage: "fr",
                counts: undefined,
            });

            expect(activity.displayContent).toMatchObject({
                status: "available",
                mode: "original",
                content: { title: row.title },
                translationControl: null,
            });
            expect(activity).not.toHaveProperty("alternateContent");
        },
    );

    it("cannot present an English translation or toggle under a French target", () => {
        const activity = toProjectPageActivity({
            row: { ...createUnlistedActivityRow(), isIndexed: true },
            translation: {
                conversationContentId: 2,
                displayLanguageCode: "en",
                translatedTitle: "Wrong target language",
                translatedBody: null,
                translatedBodyPlainText: null,
                sourceLanguageCode: "en",
            },
            translationPolicy,
            displayLanguage: "fr",
            counts: undefined,
        });

        expect(activity.displayContent).toMatchObject({
            status: "available",
            mode: "original",
            content: { title: "Source activity" },
            translationControl: null,
        });
    });

    it("displays completed translations for unlisted activities", () => {
        const row = createUnlistedActivityRow();
        const activity = toProjectPageActivity({
            row,
            translation: {
                conversationContentId: 2,
                displayLanguageCode: "fr",
                translatedTitle: "Activité traduite",
                translatedBody: "Corps traduit",
                translatedBodyPlainText: "Corps traduit",
                sourceLanguageCode: "en",
            },
            translationPolicy,
            displayLanguage: "fr",
            counts: undefined,
        });

        expect(activity).toMatchObject({
            isIndexed: false,
            displayContent: {
                status: "available",
                mode: "translated",
                content: {
                    title: "Activité traduite",
                    bodyPlainText: "Corps traduit",
                },
                translationControl: {
                    status: "completed",
                    alternateMode: "original",
                    canRequestAlternate: true,
                },
            },
            alternateContent: {
                mode: "original",
                content: {
                    title: "Source activity",
                    bodyPlainText: "Source activity body",
                },
            },
        });
        expect(activity).not.toHaveProperty("slugId");
    });

    it("hides the toggle when an unlisted activity has no alternate content", () => {
        const activity = toProjectPageActivity({
            row: createUnlistedActivityRow(),
            translation: undefined,
            translationPolicy,
            displayLanguage: "fr",
            counts: undefined,
        });

        if (activity.isIndexed) {
            throw new Error("Expected an unlisted project activity");
        }
        expect(activity.alternateContent).toBeUndefined();
        expect(activity.displayContent).toMatchObject({
            status: "available",
            mode: "original",
            content: {
                title: "Source activity",
                bodyPlainText: "Source activity body",
            },
            translationControl: null,
        });
    });
});
