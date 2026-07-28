import { describe, expect, test } from "@jest/globals";

import { processUserGeneratedHtml } from "../../src/html.js";

function normalizeEmptyLines(html: string): string {
    return processUserGeneratedHtml(html, false, "input");
}

describe("normalizeEmptyLines", () => {
    test("preserves one intentional empty paragraph between content paragraphs", () => {
        expect(normalizeEmptyLines("<p>First</p><p> </p><p>Second</p>")).toBe(
            "<p>First</p><p></p><p>Second</p>",
        );
    });

    test("collapses repeated empty paragraphs between content paragraphs", () => {
        expect(
            normalizeEmptyLines(
                "<p>First</p><p> </p><p>&nbsp;</p><p><br></p><p>Second</p>",
            ),
        ).toBe("<p>First</p><p></p><p>Second</p>");
    });

    test("trims empty paragraphs at the content edges", () => {
        expect(normalizeEmptyLines("<p> </p><p>First</p><p>&nbsp;</p>")).toBe(
            "<p>First</p>",
        );
    });

    test("handles long empty runs before trailing content", () => {
        const html = `<p>First</p>${"<p></p>".repeat(3_000)}<strong>Last</strong>`;
        expect(normalizeEmptyLines(html)).toBe(
            "<p>First</p><p></p><strong>Last</strong>",
        );
    });
});
