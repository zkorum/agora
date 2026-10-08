import {
  detectInitialDisplayLanguage,
  resolveInitialDisplayLanguage,
} from "src/utils/language";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("initial display language", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers a valid stored Agora language", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: "ru",
        browserLanguages: ["es-ES"],
      })
    ).toBe("ru");
  });

  it("uses browser preferences in order when no language is stored", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: null,
        browserLanguages: ["ru-RU", "en-US"],
      })
    ).toBe("ru");
  });

  it("skips unsupported browser preferences", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: undefined,
        browserLanguages: ["de-DE", "fr-FR", "es-ES"],
      })
    ).toBe("fr");
  });

  it.each([
    { browserLanguage: "es-MX", expectedLanguage: "es" },
    { browserLanguage: "zh-HK", expectedLanguage: "zh-Hant" },
    { browserLanguage: "zh-CN", expectedLanguage: "zh-Hans" },
  ])(
    "normalizes $browserLanguage to $expectedLanguage",
    ({ browserLanguage, expectedLanguage }) => {
      expect(
        resolveInitialDisplayLanguage({
          storedLanguage: "invalid",
          browserLanguages: [browserLanguage, "en-US"],
        })
      ).toBe(expectedLanguage);
    }
  );

  it("falls back to English when no candidate is supported", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: null,
        browserLanguages: ["it-IT", "pt-BR"],
      })
    ).toBe("en");
  });

  it.each([
    { intlLocale: "en-US", browserLanguages: ["es"], expectedLanguage: "es" },
    {
      intlLocale: "es-ES",
      browserLanguages: ["en-US", "en"],
      expectedLanguage: "en",
    },
  ])(
    "follows website preferences even when Intl defaults to $intlLocale",
    ({ intlLocale, browserLanguages, expectedLanguage }) => {
      const formattingOptions = new Intl.DateTimeFormat().resolvedOptions();
      const formattingLocale = vi
        .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
        .mockReturnValue({
          ...formattingOptions,
          locale: intlLocale,
        });
      vi.spyOn(navigator, "languages", "get").mockReturnValue(browserLanguages);

      expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
        expectedLanguage
      );
      expect(formattingLocale).not.toHaveBeenCalled();
    }
  );

  it("uses navigator.language when the preference list is empty", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-AR");

    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "es"
    );
  });
});
