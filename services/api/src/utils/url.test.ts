import { describe, expect, it } from "vitest";
import { optionalHttpsUrl } from "./url.js";

describe("optionalHttpsUrl", () => {
    it.each([
        ["https://example.com/path", "https://example.com/path"],
        [null, undefined],
        ["http://example.com", undefined],
        ["https://user@example.com", undefined],
        ["ftp://example.com", undefined],
        ["example.com", undefined],
        ["", undefined],
    ])("maps %s to %s", (value, expected) => {
        expect(optionalHttpsUrl(value)).toBe(expected);
    });
});
