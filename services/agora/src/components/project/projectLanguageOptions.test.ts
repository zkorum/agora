import { describe, expect, it } from "vitest";

import {
  buildProjectLanguageDisplayOptions,
  getConversationSourceDisplayLanguageCode,
  getConversationSupportedLanguageCodes,
  shouldTranslateProjectForConversation,
} from "./projectLanguageOptions";

const languageOptions = [
  {
    label: "English",
    value: "en",
    projectSupported: true,
    searchText: "English",
    shortLabel: "EN",
  },
  {
    label: "français",
    value: "fr",
    projectSupported: true,
    searchText: "français",
  },
  {
    label: "繁體中文",
    value: "zh-Hant",
    searchText: "繁體中文",
  },
  {
    label: "español",
    value: "es",
    searchText: "español",
  },
] as const;

describe("buildProjectLanguageDisplayOptions", () => {
  it("marks and promotes languages configured by the conversation", () => {
    const options = buildProjectLanguageDisplayOptions({
      languageOptions,
      conversationSupportedLanguageCodes: ["fr", "es"],
      projectSupportedCaption: "Supported by this project",
      conversationSupportedCaption: "Supported by this conversation",
    });

    expect(options).toEqual([
      {
        label: "English",
        value: "en",
        caption: "Supported by this project",
        projectSupported: true,
        searchText: "English",
        shortLabel: "EN",
      },
      {
        label: "français",
        value: "fr",
        caption: "Supported by this project",
        projectSupported: true,
        searchText: "français",
      },
      {
        label: "español",
        value: "es",
        caption: "Supported by this conversation",
        searchText: "español",
      },
      {
        label: "繁體中文",
        value: "zh-Hant",
        caption: undefined,
        searchText: "繁體中文",
      },
    ]);
  });

  it("deduplicates options without changing unsupported option order", () => {
    const options = buildProjectLanguageDisplayOptions({
      languageOptions: [...languageOptions, languageOptions[3]],
      conversationSupportedLanguageCodes: [],
      projectSupportedCaption: "Supported by this project",
      conversationSupportedCaption: "Supported by this conversation",
    });

    expect(options.map((option) => option.value)).toEqual([
      "en",
      "fr",
      "zh-Hant",
      "es",
    ]);
  });
});

describe("getConversationSupportedLanguageCodes", () => {
  it("combines the source and configured languages without duplicates", () => {
    expect(
      getConversationSupportedLanguageCodes({
        sourceLanguageCode: "fr",
        configuredLanguageCodes: ["fr", "es"],
        dynamicTranslationEnabled: true,
      })
    ).toEqual(["fr", "es"]);
  });

  it("supports conversations whose source language is unknown", () => {
    expect(
      getConversationSupportedLanguageCodes({
        sourceLanguageCode: null,
        configuredLanguageCodes: ["es"],
        dynamicTranslationEnabled: true,
      })
    ).toEqual(["es"]);
  });

  it("excludes configured targets when dynamic translation is disabled", () => {
    expect(
      getConversationSupportedLanguageCodes({
        sourceLanguageCode: "fr",
        configuredLanguageCodes: ["es"],
        dynamicTranslationEnabled: false,
      })
    ).toEqual(["fr"]);
  });
});

describe("getConversationSourceDisplayLanguageCode", () => {
  it("prefers the detected display language", () => {
    expect(
      getConversationSourceDisplayLanguageCode({
        detectedDisplayLanguageCode: "fr",
        sourceLanguageCode: "es",
      })
    ).toBe("fr");
  });

  it("falls back to the detected source language", () => {
    expect(
      getConversationSourceDisplayLanguageCode({
        detectedDisplayLanguageCode: null,
        sourceLanguageCode: "es",
      })
    ).toBe("es");
  });
});

describe("shouldTranslateProjectForConversation", () => {
  it("translates only conversation-supported languages missing from the project", () => {
    expect(
      shouldTranslateProjectForConversation({
        selectedLanguageCode: "es",
        languageOptions,
        conversationSupportedLanguageCodes: ["fr", "es"],
        dynamicTranslationEnabled: true,
        projectDynamicTranslationEnabled: true,
      })
    ).toBe(true);
    expect(
      shouldTranslateProjectForConversation({
        selectedLanguageCode: "fr",
        languageOptions,
        conversationSupportedLanguageCodes: ["fr", "es"],
        dynamicTranslationEnabled: true,
        projectDynamicTranslationEnabled: true,
      })
    ).toBe(false);
    expect(
      shouldTranslateProjectForConversation({
        selectedLanguageCode: "zh-Hant",
        languageOptions,
        conversationSupportedLanguageCodes: ["fr", "es"],
        dynamicTranslationEnabled: true,
        projectDynamicTranslationEnabled: true,
      })
    ).toBe(false);
  });

  it("does not request project translation when dynamic translation is disabled", () => {
    expect(
      shouldTranslateProjectForConversation({
        selectedLanguageCode: "es",
        languageOptions,
        conversationSupportedLanguageCodes: ["es"],
        dynamicTranslationEnabled: false,
        projectDynamicTranslationEnabled: true,
      })
    ).toBe(false);
  });

  it("does not request translation when project translation is disabled", () => {
    expect(
      shouldTranslateProjectForConversation({
        selectedLanguageCode: "es",
        languageOptions,
        conversationSupportedLanguageCodes: ["es"],
        dynamicTranslationEnabled: true,
        projectDynamicTranslationEnabled: false,
      })
    ).toBe(false);
  });
});
