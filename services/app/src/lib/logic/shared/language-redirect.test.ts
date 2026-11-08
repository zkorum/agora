import { readFileSync } from "node:fs";
import { Script } from "node:vm";

import { describe, expect, it, vi } from "vitest";

import settings from "../../../../project.inlang/settings.json";

const html = readFileSync(
  new URL("../../../app.html", import.meta.url),
  "utf8",
);
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(
  (match) => match[1].includes("handleLanguageRedirect"),
)?.[1];
if (source === undefined) {
  throw new Error("Landing language redirect script not found");
}
const redirectScript = new Script(
  source
    .replaceAll("%locales%", settings.locales.join(","))
    .replaceAll("%baseLocale%", settings.baseLocale),
);

const desktop =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/142.0.0.0 Safari/537.36";
const android =
  "Mozilla/5.0 (Linux; Android 15) Chrome/142.0.0.0 Mobile Safari/537.36";

function runLanguageRedirect({
  userAgent = desktop,
  intlLocale = "en-US",
  languages = ["en-US"],
  language = "en-US",
  savedLanguage,
  pathname = "/",
  search = "",
  hash = "",
  referrer = "",
  storageUnavailable = false,
  intlUnavailable = false,
}: {
  userAgent?: string;
  intlLocale?: string;
  languages?: string[];
  language?: string;
  savedLanguage?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  referrer?: string;
  storageUnavailable?: boolean;
  intlUnavailable?: boolean;
} = {}) {
  const redirects: string[] = [];
  const saveLanguage = vi.fn();
  const readLanguages = vi.fn(() => languages);
  const createDateTimeFormat = vi.fn(function () {
    if (intlUnavailable) throw new Error("Intl unavailable");
    return { resolvedOptions: () => ({ locale: intlLocale }) };
  });
  const readSavedLanguage = vi.fn(() => {
    if (storageUnavailable) throw new Error("Storage unavailable");
    return savedLanguage ?? null;
  });
  redirectScript.runInNewContext({
    navigator: {
      userAgent,
      get languages() {
        return readLanguages();
      },
      language,
    },
    Intl: { DateTimeFormat: createDateTimeFormat },
    localStorage: {
      getItem: readSavedLanguage,
      setItem: saveLanguage,
    },
    location: {
      origin: "https://agoracitizen.network",
      pathname,
      search,
      hash,
      replace: (url: string) => redirects.push(url),
    },
    document: { referrer },
    URL,
  });
  return {
    redirects,
    saveLanguage,
    readSavedLanguage,
    readLanguages,
    createDateTimeFormat,
  };
}

describe("landing homepage language policy", () => {
  it.each([
    android,
    "Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
    "Mozilla/5.0 (Linux; Android 15; Tablet) Chrome/142.0.0.0 Safari/537.36",
  ])("prefers Intl on Android: %s", (userAgent) => {
    expect(
      runLanguageRedirect({ userAgent, intlLocale: "fr-FR" }).redirects,
    ).toEqual(["/fr"]);
    expect(
      runLanguageRedirect({ userAgent, languages: ["fr-FR"] }).redirects,
    ).toEqual([]);
  });

  it.each([
    desktop,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0.0.0 Edg/142.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) Chromium/142.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/145.0 Firefox/145.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/142.0.0.0 Mobile Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/145.0 Mobile Safari/605.1.15",
    "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
    "",
  ])("prefers website languages outside Android: %s", (userAgent) => {
    expect(
      runLanguageRedirect({ userAgent, languages: ["de-DE", "fr-FR"] })
        .redirects,
    ).toEqual(["/fr"]);
    expect(
      runLanguageRedirect({ userAgent, intlLocale: "fr-FR" }).redirects,
    ).toEqual([]);
  });

  it.each([desktop, android])(
    "preserves saved preferences: %s",
    (userAgent) => {
      const result = runLanguageRedirect({
        userAgent,
        intlLocale: "fr-FR",
        languages: ["ru-RU"],
        savedLanguage: "es",
      });
      expect(result.redirects).toEqual(["/es"]);
      expect(result.readSavedLanguage).toHaveBeenCalledWith("displayLanguage");
      expect(result.saveLanguage).not.toHaveBeenCalled();
      expect(result.readLanguages).not.toHaveBeenCalled();
      expect(result.createDateTimeFormat).not.toHaveBeenCalled();
      expect(
        runLanguageRedirect({
          userAgent,
          intlLocale: "fr-FR",
          languages: ["ru-RU"],
          savedLanguage: "en",
        }).redirects,
      ).toEqual([]);
    },
  );

  it.each([desktop, android])("tries all fallback signals: %s", (userAgent) => {
    expect(
      runLanguageRedirect({
        userAgent,
        intlLocale: "de-DE",
        languages: ["it-IT", "fr-FR"],
        savedLanguage: "invalid",
      }).redirects,
    ).toEqual(["/fr"]);
    expect(
      runLanguageRedirect({
        userAgent,
        intlLocale: "de-DE",
        languages: [],
        language: "es-AR",
      }).redirects,
    ).toEqual(["/es"]);
    expect(
      runLanguageRedirect({
        userAgent,
        intlLocale: "fr-FR",
        languages: ["de-DE"],
        language: "it-IT",
      }).redirects,
    ).toEqual(["/fr"]);
    const result = runLanguageRedirect({
      userAgent,
      intlLocale: "de-DE",
      languages: ["it-IT"],
      language: "pt-BR",
    });
    expect(result.redirects).toEqual([]);
    expect(result.saveLanguage).not.toHaveBeenCalled();
  });

  it("recovers from unavailable storage and Intl", () => {
    expect(
      runLanguageRedirect({
        userAgent: android,
        storageUnavailable: true,
        intlUnavailable: true,
        languages: ["fr-FR"],
      }).redirects,
    ).toEqual(["/fr"]);
  });

  it("does not evaluate lower-priority signals when the preferred signal matches", () => {
    const desktopResult = runLanguageRedirect({
      languages: ["fr-FR"],
      intlUnavailable: true,
    });
    expect(desktopResult.redirects).toEqual(["/fr"]);
    expect(desktopResult.createDateTimeFormat).not.toHaveBeenCalled();

    const androidResult = runLanguageRedirect({
      userAgent: android,
      intlLocale: "fr-FR",
    });
    expect(androidResult.redirects).toEqual(["/fr"]);
    expect(androidResult.readLanguages).not.toHaveBeenCalled();
  });

  it.each([desktop, android])(
    "does not accept a redirect destination from storage: %s",
    (userAgent) => {
      const result = runLanguageRedirect({
        userAgent,
        savedLanguage: "//example.com",
        languages: ["fr-FR"],
        intlLocale: "fr-FR",
      });
      expect(result.redirects).toEqual(["/fr"]);
      expect(result.saveLanguage).not.toHaveBeenCalled();
    },
  );

  it.each(["/fr", "/fr/resources/example", "/resources/example"])(
    "preserves explicit URLs: %s",
    (pathname) => {
      expect(
        runLanguageRedirect({ pathname, savedLanguage: "es" }).redirects,
      ).toEqual([]);
    },
  );

  it("does not renegotiate same-origin navigation", () => {
    expect(
      runLanguageRedirect({
        savedLanguage: "fr",
        referrer: "https://agoracitizen.network/resources/example",
      }).redirects,
    ).toEqual([]);
  });

  it("preserves the query and anchor when redirecting", () => {
    expect(
      runLanguageRedirect({
        languages: ["fr-FR"],
        search: "?source=review",
        hash: "#faq",
      }).redirects,
    ).toEqual(["/fr?source=review#faq"]);
  });
});
