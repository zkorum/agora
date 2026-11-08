import {
  detectBrowserDisplayLanguage,
  detectInitialDisplayLanguage,
  resolveDisplayLanguage,
} from "src/utils/language";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("initial display language", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not inspect browser signals when a supported preference is saved", () => {
    const readUserAgent = vi.spyOn(navigator, "userAgent", "get");
    const readLanguages = vi.spyOn(navigator, "languages", "get");
    const readFormattingLocale = vi.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions"
    );

    expect(detectInitialDisplayLanguage({ storedLanguage: "es" })).toBe("es");
    expect(readUserAgent).not.toHaveBeenCalled();
    expect(readLanguages).not.toHaveBeenCalled();
    expect(readFormattingLocale).not.toHaveBeenCalled();
  });

  it("does not evaluate Intl when desktop website languages match", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome/142.0.0.0");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR"]);
    const readFormattingLocale = vi.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions"
    );

    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "fr"
    );
    expect(readFormattingLocale).not.toHaveBeenCalled();
  });

  it("falls back to website languages when Intl fails on Android", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Android 15");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR"]);
    vi.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions"
    ).mockImplementation(() => {
      throw new Error("Intl failed");
    });

    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "fr"
    );
  });

  it("does not inspect website languages when Android's Intl locale matches", () => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "fr-FR",
    });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Android 15");
    const readLanguages = vi.spyOn(navigator, "languages", "get");
    const readLanguage = vi.spyOn(navigator, "language", "get");

    expect(detectBrowserDisplayLanguage()).toBe("fr");
    expect(readLanguages).not.toHaveBeenCalled();
    expect(readLanguage).not.toHaveBeenCalled();
  });

  it("leaves the conversation fallback available when Intl fails and website languages are unsupported", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
    vi.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions"
    ).mockImplementation(() => {
      throw new Error("Intl failed");
    });

    expect(detectBrowserDisplayLanguage()).toBeUndefined();
    expect(
      resolveDisplayLanguage({
        storedLanguage: undefined,
        browserLanguage: detectBrowserDisplayLanguage(),
        conversationLanguage: "fr",
      })
    ).toBe("fr");
  });

  it("prefers a valid stored Agora language", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-ES"]);
    expect(detectInitialDisplayLanguage({ storedLanguage: "ru" })).toBe("ru");
  });

  it("uses browser preferences in order when no language is stored", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox/145.0");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["ru-RU", "en-US"]);
    expect(detectInitialDisplayLanguage({ storedLanguage: null })).toBe("ru");
  });

  it("skips unsupported browser preferences", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox/145.0");
    vi.spyOn(navigator, "languages", "get").mockReturnValue([
      "de-DE",
      "fr-FR",
      "es-ES",
    ]);
    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "fr"
    );
  });

  it.each([
    { browserLanguage: "es-MX", expectedLanguage: "es" },
    { browserLanguage: "zh-HK", expectedLanguage: "zh-Hant" },
    { browserLanguage: "zh-CN", expectedLanguage: "zh-Hans" },
  ])(
    "normalizes $browserLanguage to $expectedLanguage",
    ({ browserLanguage, expectedLanguage }) => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox/145.0");
      vi.spyOn(navigator, "languages", "get").mockReturnValue([
        browserLanguage,
        "en-US",
      ]);
      expect(detectInitialDisplayLanguage({ storedLanguage: "invalid" })).toBe(
        expectedLanguage
      );
    }
  );

  it("falls back to English when no candidate is supported", () => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "de-DE",
    });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["it-IT", "pt-BR"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
    expect(detectBrowserDisplayLanguage()).toBeUndefined();
    expect(detectInitialDisplayLanguage({ storedLanguage: null })).toBe("en");
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
    "Mozilla/5.0 (Linux; Android 10; K) Chrome/142.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
    "Mozilla/5.0 (Linux; Android 15; Tablet) Chrome/142.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36",
  ])("prefers the runtime locale on Android: %s", (userAgent) => {
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

    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "en-US",
    });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR"]);
    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "en"
    );
  });

  it.each([
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/142.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0.0.0 Edg/142.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) Chromium/142.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/145.0 Firefox/145.0",
    "Chrome/142.0.0.0 OPR/124.0.0.0",
    "Firefox/145.0",
    "AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/142.0.0.0 Mobile Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/145.0 Mobile Safari/605.1.15",
    "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
    "",
  ])("prefers website languages outside Android: %s", (userAgent) => {
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
    expect(detectInitialDisplayLanguage({ storedLanguage: "es" })).toBe("es");

    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "fr-FR",
    });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "en"
    );
  });

  it.each([
    "Chrome/142.0.0.0",
    "Firefox/145.0",
    "Mozilla/5.0 (Linux; Android 15) Chrome/142.0.0.0",
    "Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
  ])("tries every browser fallback before English on %s", (userAgent) => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "de-DE",
    });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["it-IT"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-AR");
    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "es"
    );

    vi.spyOn(navigator, "language", "get").mockReturnValue("it-IT");
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "fr-FR",
    });
    expect(detectInitialDisplayLanguage({ storedLanguage: undefined })).toBe(
      "fr"
    );
  });

  it("tries the conversation before English, never ahead of a supported saved/browser choice", () => {
    expect(
      resolveDisplayLanguage({
        storedLanguage: undefined,
        browserLanguage: undefined,
        conversationLanguage: "fr",
      })
    ).toBe("fr");
    expect(
      resolveDisplayLanguage({
        storedLanguage: "es",
        browserLanguage: undefined,
        conversationLanguage: "fr",
      })
    ).toBe("es");
    expect(
      resolveDisplayLanguage({
        storedLanguage: undefined,
        browserLanguage: "en",
        conversationLanguage: "fr",
      })
    ).toBe("en");
  });
});
