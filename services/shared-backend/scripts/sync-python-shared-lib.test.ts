import { describe, expect, it } from "vitest";

import {
    generatePythonSharedTypes,
    parseDisplayLanguageCodes,
    parseNumericExport,
    parseStringLiteralZodEnum,
} from "./sync-python-shared-lib.js";

describe("parseStringLiteralZodEnum", () => {
    it("parses a TypeScript zod string enum", () => {
        const source = `
export const ExampleCodes = z.enum([
    "one",
    "two",
]);`;

        expect(
            parseStringLiteralZodEnum({ source, exportName: "ExampleCodes" }),
        ).toEqual(["one", "two"]);
    });

    it("rejects missing zod enum", () => {
        expect(() =>
            parseStringLiteralZodEnum({
                source: "export const foo = 1;",
                exportName: "ExampleCodes",
            }),
        ).toThrow("Could not find ExampleCodes");
    });
});

describe("parseDisplayLanguageCodes", () => {
    it("parses the display-language enum", () => {
        const source = `
export const ZodSupportedDisplayLanguageCodes = z.enum([
    "en",
    "es",
    "zh-Hant",
]);`;

        expect(parseDisplayLanguageCodes(source)).toEqual(["en", "es", "zh-Hant"]);
    });
});

describe("generatePythonSharedTypes", () => {
    it("generates current shared Python values from registered sections", () => {
        const output = generatePythonSharedTypes({
            sources: {
                languagesTs: `
export const ZodSupportedDisplayLanguageCodes = z.enum([
    "en",
    "es",
    "zh-Hant",
]);`,
                sharedTs: `
export const MAX_LENGTH_TITLE = 140;
export const MAX_LENGTH_BODY_HTML = 3000;
export const MAX_LENGTH_OPINION_HTML_OUTPUT = 3000;`,
            },
            sourcePaths: [
                "services/shared/src/languages.ts",
                "services/shared/src/shared.ts",
            ],
        });

        expect(output).toContain("SUPPORTED_DISPLAY_LANGUAGE_CODES");
        expect(output).toContain("SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES");
        expect(output).toContain("MAX_LENGTH_TITLE: int = 140");
        expect(output).toContain('    "zh-Hant",');
        expect(output).not.toContain(
            'SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES: tuple[str, ...] = (\n    "en",',
        );
    });
});

describe("parseNumericExport", () => {
    it("parses numeric TypeScript exports", () => {
        expect(
            parseNumericExport({
                source: "export const MAX_LENGTH_TITLE = 140;",
                exportName: "MAX_LENGTH_TITLE",
            }),
        ).toBe(140);
    });
});
