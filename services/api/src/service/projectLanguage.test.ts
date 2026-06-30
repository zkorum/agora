import { describe, expect, it } from "vitest";
import {
    getAutoProvisionedDefaultLanguage,
    getImplicitDefaultDisplayLanguage,
    resolveOrganizationLocalizationRow,
} from "./projectLanguage.js";
import { resolvePreferredContentLanguage } from "./contentLanguagePreference.js";

describe("resolvePreferredContentLanguage", () => {
    it("uses the first configured language from the display fallback chain", () => {
        expect(
            resolvePreferredContentLanguage({
                displayLanguage: "ky",
                defaultContentLanguage: "en",
                configuredContentLanguages: ["ru", "en"],
            }).preferredContentLanguage,
        ).toBe("ru");
    });

    it("falls back between Chinese scripts before using English", () => {
        expect(
            resolvePreferredContentLanguage({
                displayLanguage: "zh-Hant",
                defaultContentLanguage: "en",
                configuredContentLanguages: ["zh-Hans", "en"],
            }).preferredContentLanguage,
        ).toBe("zh-Hans");

        expect(
            resolvePreferredContentLanguage({
                displayLanguage: "zh-Hans",
                defaultContentLanguage: "en",
                configuredContentLanguages: ["zh-Hant", "en"],
            }).preferredContentLanguage,
        ).toBe("zh-Hant");
    });

    it("uses the content default when no display fallback is configured", () => {
        expect(
            resolvePreferredContentLanguage({
                displayLanguage: "fr",
                defaultContentLanguage: "ky",
                configuredContentLanguages: ["ky", "ru"],
            }).preferredContentLanguage,
        ).toBe("ky");
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
