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
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox/145.0");
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        ...formattingOptions,
        locale: intlLocale,
      });
      vi.spyOn(navigator, "languages", "get").mockReturnValue(browserLanguages);

      expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
        expectedLanguage
      );
    }
  );

  it("uses navigator.language when the preference list is empty", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-AR");

    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "es"
    );
  });

  it.each([
    "Chrome/142.0.0.0 Safari/537.36",
    "Chromium/142.0.0.0",
    "Chrome/142.0.0.0 Edg/142.0.0.0",
    "Chrome/142.0.0.0 OPR/124.0.0.0",
    "Mozilla/5.0 (Linux; Android 10; K) Chrome/142.0.0.0 Mobile Safari/537.36",
  ])("prefers the runtime locale on Chromium: %s", (userAgent) => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "fr",
    });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);

    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "fr"
    );
    expect(detectInitialDisplayLanguage({ storedLanguage: "es" })).toBe("es");
  });

  it.each([
    "Firefox/145.0",
    "AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
    "AppleWebKit/605.1.15 CriOS/142.0.0.0 Mobile Safari/604.1",
    "",
  ])("prefers website languages on non-Chromium: %s", (userAgent) => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "en-US",
    });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "fr-FR"]);

    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "fr"
    );
  });

  it.each(["Chrome/142.0.0.0", "Firefox/145.0"])(
    "tries every browser fallback before English on %s",
    (userAgent) => {
      const options = new Intl.DateTimeFormat().resolvedOptions();
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        ...options,
        locale: "de-DE",
      });
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["it-IT"]);
      vi.spyOn(navigator, "language", "get").mockReturnValue("es-AR");
      expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
        "es"
      );

      vi.spyOn(navigator, "language", "get").mockReturnValue("it-IT");
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        ...options,
        locale: "fr-FR",
      });
      expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
        "fr"
      );
    }
  );

  it("tries the conversation before English, never ahead of a supported saved/browser choice", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: undefined,
        browserLanguages: ["de-DE"],
        conversationLanguage: "fr",
      })
    ).toBe("fr");
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: "es",
        browserLanguages: ["de-DE"],
        conversationLanguage: "fr",
      })
    ).toBe("es");
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: undefined,
        browserLanguages: ["en-US"],
        conversationLanguage: "fr",
      })
    ).toBe("en");
  });
});
