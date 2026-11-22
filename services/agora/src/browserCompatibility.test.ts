import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("central browser compatibility", () => {
  it("preserves native Intl implementations", async () => {
    const { Segmenter, Locale, getCanonicalLocales } = Intl;
    vi.stubGlobal("Intl", {
      Segmenter,
      Locale,
      getCanonicalLocales,
      DateTimeFormat: Intl.DateTimeFormat,
      NumberFormat: Intl.NumberFormat,
      Collator: Intl.Collator,
    });
    const { initializeBrowserCompatibility } =
      await import("./browserCompatibility");
    await initializeBrowserCompatibility();
    expect(Intl.Segmenter).toBe(Segmenter);
    expect(Intl.Locale).toBe(Locale);
    expect(Intl.getCanonicalLocales).toBe(getCanonicalLocales);
    expect(new Intl.Locale("fr-FR").language).toBe("fr");
  });

  it("allows shared imports before polyfills and preserves grapheme counting afterwards", async () => {
    const samples = ["", "hello", "e\u0301", "🇫🇷", "👨‍👩‍👧‍👦", "مَرْحَبًا"];
    const nativeSegmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    const expectedCounts = samples.map(
      (sample) => Array.from(nativeSegmenter.segment(sample)).length
    );
    vi.stubGlobal("Intl", {
      DateTimeFormat: Intl.DateTimeFormat,
      NumberFormat: Intl.NumberFormat,
      Collator: Intl.Collator,
    });
    vi.resetModules();
    const { countPlainTextCharacters, countUtf8Bytes } =
      await import("./shared/shared");
    expect(countUtf8Bytes("hello")).toBe(5);
    const { initializeBrowserCompatibility } =
      await import("./browserCompatibility");
    await initializeBrowserCompatibility();

    expect(Intl.getCanonicalLocales("en-us")).toEqual(["en-US"]);
    expect(new Intl.Locale("fr-FR").language).toBe("fr");
    expect(
      samples.map((sample) => countPlainTextCharacters(sample).characterCount)
    ).toEqual(expectedCounts);
  });

  it("keeps native locale prerequisites when only Segmenter is missing", async () => {
    const { Locale, getCanonicalLocales } = Intl;
    vi.stubGlobal("Intl", {
      Locale,
      getCanonicalLocales,
      DateTimeFormat: Intl.DateTimeFormat,
      NumberFormat: Intl.NumberFormat,
      Collator: Intl.Collator,
    });
    const { initializeBrowserCompatibility } =
      await import("./browserCompatibility");
    await initializeBrowserCompatibility();
    expect(Intl.Locale).toBe(Locale);
    expect(Intl.getCanonicalLocales).toBe(getCanonicalLocales);
    expect(
      Array.from(
        new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          "e\u0301🇫🇷"
        )
      )
    ).toHaveLength(2);
  });
});
