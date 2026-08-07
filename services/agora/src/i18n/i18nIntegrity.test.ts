import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

const translationModules = import.meta.glob("../**/*.i18n.ts", {
  eager: true,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPlaceholders(value: string): string[] {
  return Array.from(
    value.matchAll(/\{([^{}]+)\}/g),
    (match) => match[1]
  ).sort();
}

function checkTranslationValue({
  source,
  translation,
  path,
}: {
  source: unknown;
  translation: unknown;
  path: string;
}): void {
  if (typeof source === "string") {
    expect(translation, `${path} must be a string`).toBeTypeOf("string");
    if (typeof translation === "string") {
      expect(getPlaceholders(translation), `${path} placeholders`).toEqual(
        getPlaceholders(source)
      );
    }
    return;
  }

  if (!isRecord(source)) {
    return;
  }

  expect(isRecord(translation), `${path} must be an object`).toBe(true);
  if (!isRecord(translation)) {
    return;
  }

  expect(Object.keys(translation).sort(), `${path} keys`).toEqual(
    Object.keys(source).sort()
  );

  for (const [key, value] of Object.entries(source)) {
    checkTranslationValue({
      source: value,
      translation: translation[key],
      path: `${path}.${key}`,
    });
  }
}

function checkEnglishValue({
  value,
  path,
}: {
  value: unknown;
  path: string;
}): void {
  if (typeof value === "string") {
    expect(value, `${path} contains Cyrillic text`).not.toMatch(
      /[\u0400-\u04ff]/
    );
    return;
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      checkEnglishValue({ value: child, path: `${path}.${key}` });
    }
  }
}

describe("i18n catalog integrity", () => {
  it("keeps every display language aligned with English", () => {
    for (const [modulePath, moduleValue] of Object.entries(
      translationModules
    )) {
      if (!isRecord(moduleValue)) {
        continue;
      }

      for (const [exportName, exportedValue] of Object.entries(moduleValue)) {
        if (!isRecord(exportedValue) || !isRecord(exportedValue.en)) {
          continue;
        }

        checkEnglishValue({
          value: exportedValue.en,
          path: `${modulePath}:${exportName}.en`,
        });

        for (const locale of ZodSupportedDisplayLanguageCodes.options) {
          if (locale === "en") {
            continue;
          }

          expect(
            exportedValue[locale],
            `${modulePath}:${exportName}.${locale} must have its own catalog`
          ).not.toBe(exportedValue.en);
          checkTranslationValue({
            source: exportedValue.en,
            translation: exportedValue[locale],
            path: `${modulePath}:${exportName}.${locale}`,
          });
        }
      }
    }
  });
});
