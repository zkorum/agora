import { describe, expect, test } from "@jest/globals";

import { htmlToCountedText, normalizeEmptyLines } from "../../src/html.js";

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
});

describe("htmlToCountedText", () => {
    test("preserves paragraph and break newlines", () => {
        expect(htmlToCountedText("<p>Hello<br>world</p><p>Again</p>")).toBe(
            "Hello\nworld\nAgain",
        );
    });

    test("strips tags and decodes entities", () => {
        expect(
            htmlToCountedText("<p><strong>Fish &amp; chips</strong>&nbsp;now</p>"),
        ).toBe("Fish & chips\u00a0now");
    });
});
