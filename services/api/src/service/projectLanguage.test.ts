import { describe, expect, it } from "vitest";
import {
    getAutoProvisionedDefaultLanguage,
    getImplicitDefaultDisplayLanguage,
    resolveEffectiveProjectDisplayLanguage,
    resolveOrganizationLocalizationRow,
} from "./projectLanguage.js";

describe("resolveEffectiveProjectDisplayLanguage", () => {
    it("uses stored project language when supported", () => {
        expect(
            resolveEffectiveProjectDisplayLanguage({
                projectSupportedDisplayLanguages: {
                    defaultLanguageCode: "ky",
                    additionalLanguageCodes: ["ru"],
                },
                storedProjectDisplayLanguage: "ru",
                storedUserDisplayLanguage: "en",
                currentDisplayLanguage: "fr",
            }).effectiveProjectDisplayLanguage,
        ).toBe("ru");
    });

    it("uses current display language for first visit without storing a project preference", () => {
        expect(
            resolveEffectiveProjectDisplayLanguage({
                projectSupportedDisplayLanguages: {
                    defaultLanguageCode: "ky",
                    additionalLanguageCodes: ["ru"],
                },
                storedProjectDisplayLanguage: undefined,
                storedUserDisplayLanguage: undefined,
                currentDisplayLanguage: "ru",
            }),
        ).toEqual({
            selectedProjectDisplayLanguage: undefined,
            effectiveProjectDisplayLanguage: "ru",
        });
    });

    it("falls back to project default when user language candidates are unsupported", () => {
        expect(
            resolveEffectiveProjectDisplayLanguage({
                projectSupportedDisplayLanguages: {
                    defaultLanguageCode: "ky",
                    additionalLanguageCodes: ["ru"],
                },
                storedProjectDisplayLanguage: "en",
                storedUserDisplayLanguage: "fr",
                currentDisplayLanguage: "ja",
            }).effectiveProjectDisplayLanguage,
        ).toBe("ky");
    });

    it("falls back between Chinese scripts before using project default", () => {
        expect(
            resolveEffectiveProjectDisplayLanguage({
                projectSupportedDisplayLanguages: {
                    defaultLanguageCode: "en",
                    additionalLanguageCodes: ["zh-Hans"],
                },
                storedProjectDisplayLanguage: undefined,
                storedUserDisplayLanguage: undefined,
                currentDisplayLanguage: "zh-Hant",
            }).effectiveProjectDisplayLanguage,
        ).toBe("zh-Hans");

        expect(
            resolveEffectiveProjectDisplayLanguage({
                projectSupportedDisplayLanguages: {
                    defaultLanguageCode: "en",
                    additionalLanguageCodes: ["zh-Hant"],
                },
                storedProjectDisplayLanguage: undefined,
                storedUserDisplayLanguage: undefined,
                currentDisplayLanguage: "zh-Hans",
            }).effectiveProjectDisplayLanguage,
        ).toBe("zh-Hant");
    });
});

describe("getAutoProvisionedDefaultLanguage", () => {
    it("uses stored user display language before current display language", () => {
        expect(
            getAutoProvisionedDefaultLanguage({
                storedUserDisplayLanguage: "fr",
                currentDisplayLanguage: "ru",
            }),
        ).toBe("fr");
    });

    it("uses the implicit fallback when no explicit signal exists", () => {
        expect(
            getAutoProvisionedDefaultLanguage({
                storedUserDisplayLanguage: undefined,
                currentDisplayLanguage: undefined,
            }),
        ).toBe(getImplicitDefaultDisplayLanguage());
    });
});

describe("resolveOrganizationLocalizationRow", () => {
    const defaultRow = {
        languageCode: "ky",
        displayName: "Кыргыз уюму",
        description: "",
        websiteUrl: null,
        imagePath: null,
        isFullImagePath: false,
    } as const;

    it("uses the exact localization row as a complete row", () => {
        const russianRow = {
            languageCode: "ru",
            displayName: "Русская организация",
            description: "Описание",
            websiteUrl: "https://example.org/ru",
            imagePath: null,
            isFullImagePath: false,
        } as const;

        expect(
            resolveOrganizationLocalizationRow({
                defaultRow,
                additionalRows: [russianRow],
                effectiveLanguageCode: "ru",
            }),
        ).toBe(russianRow);
    });

    it("falls back between Chinese script rows", () => {
        const simplifiedChineseRow = {
            languageCode: "zh-Hans",
            displayName: "组织",
            description: "",
            websiteUrl: null,
            imagePath: null,
            isFullImagePath: false,
        } as const;

        expect(
            resolveOrganizationLocalizationRow({
                defaultRow,
                additionalRows: [simplifiedChineseRow],
                effectiveLanguageCode: "zh-Hant",
            }),
        ).toBe(simplifiedChineseRow);
    });

    it("uses the default row when no language-chain row exists", () => {
        expect(
            resolveOrganizationLocalizationRow({
                defaultRow,
                additionalRows: [],
                effectiveLanguageCode: "fr",
            }),
        ).toBe(defaultRow);
    });
});
