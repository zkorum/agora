export async function initializeBrowserCompatibility(): Promise<void> {
  if (typeof Intl.Segmenter !== "undefined") return;

  if (typeof Intl.getCanonicalLocales === "undefined") {
    await import("@formatjs/intl-getcanonicallocales/polyfill.js");
  }
  if (typeof Intl.Locale === "undefined") {
    await import("@formatjs/intl-locale/polyfill.js");
  }
  await import("@formatjs/intl-segmenter/polyfill.js");
}
