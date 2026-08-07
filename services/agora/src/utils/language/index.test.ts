import { resolveInitialDisplayLanguage } from "src/utils/language";
import { describe, expect, it } from "vitest";

describe("initial display language", () => {
  it("prefers a valid stored Agora language", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: "ru",
        deviceLanguage: "fr-FR",
        browserLanguages: ["es-ES"],
      })
    ).toBe("ru");
  });

  it("prefers the device locale when no language is stored", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: null,
        deviceLanguage: "ky-KG",
        browserLanguages: ["ru-RU", "en-US"],
      })
    ).toBe("ky");
  });

  it("uses the first supported browser preference when the device locale is unsupported", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: undefined,
        deviceLanguage: "de-DE",
        browserLanguages: ["de-DE", "fr-FR", "es-ES"],
      })
    ).toBe("fr");
  });

  it("normalizes regional and Chinese locale variants", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: "invalid",
        deviceLanguage: "zh-HK",
        browserLanguages: ["en-US"],
      })
    ).toBe("zh-Hant");
  });

  it("falls back to English when no candidate is supported", () => {
    expect(
      resolveInitialDisplayLanguage({
        storedLanguage: null,
        deviceLanguage: "de-DE",
        browserLanguages: ["it-IT", "pt-BR"],
      })
    ).toBe("en");
  });
});
