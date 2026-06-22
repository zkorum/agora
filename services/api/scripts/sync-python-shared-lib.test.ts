import { describe, expect, it } from "vitest";

import { parseStringLiteralZodEnum } from "./sync-python-shared-lib.js";

describe("parseStringLiteralZodEnum", () => {
    it("parses direct z.enum exports", () => {
        expect(
            parseStringLiteralZodEnum({
                source: `export const Demo = z.enum(["en", "fr"]);`,
                exportName: "Demo",
            }),
        ).toEqual(["en", "fr"]);
    });

    it("parses enum extract exports", () => {
        expect(
            parseStringLiteralZodEnum({
                source: `export const Demo = BaseEnum.extract(["en", "fr"]);`,
                exportName: "Demo",
            }),
        ).toEqual(["en", "fr"]);
    });
});
