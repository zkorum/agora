import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
    generatePythonSharedTypes,
    parseDisplayLanguageCodes,
    parseNumericExport,
    parseStringLiteralZodEnum,
} from "./sync-python-shared-lib.js";

const testDir = dirname(fileURLToPath(import.meta.url));

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

        expect(parseDisplayLanguageCodes(source)).toEqual([
            "en",
            "es",
            "zh-Hant",
        ]);
    });
});

describe("generatePythonSharedTypes", () => {
    it("generates Python values from the real shared sources", () => {
        const sharedSrcDir = resolve(testDir, "../../shared/src");
        const output = generatePythonSharedTypes({
            sources: {
                languagesTs: readFileSync(
                    resolve(sharedSrcDir, "languages.ts"),
                    "utf-8",
                ),
                sharedTs: readFileSync(
                    resolve(sharedSrcDir, "shared.ts"),
                    "utf-8",
                ),
            },
            sourcePaths: [
                "services/shared/src/languages.ts",
                "services/shared/src/shared.ts",
            ],
        });

        expect(output).toContain("SUPPORTED_DISPLAY_LANGUAGE_CODES");
        expect(output).toContain("SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES");
        expect(output).toContain("MAX_LENGTH_TITLE");
        expect(output).toContain("MAX_LENGTH_CONVERSATION_BODY_HTML");
        expect(output).toContain(
            "from .generated_models import DisplayLanguageCode",
        );
        expect(output).toContain("    DisplayLanguageCode.zh_hant,");
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
