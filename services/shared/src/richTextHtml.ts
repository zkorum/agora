import sanitizeHtml from "sanitize-html";
import { removeNonDisplayControlCharacters } from "./shared.js";

const EMPTY_PARAGRAPH_PATTERN = String.raw`<p>(?:[\s\u00a0]|&nbsp;|<br\s*\/?>)*<\/p>`;
const PARAGRAPH_CONTENT_REGEX = /<p>([\s\S]*?)<\/p>/gi;
const EMPTY_PARAGRAPH_REGEX = new RegExp(EMPTY_PARAGRAPH_PATTERN, "gi");
const LEADING_EMPTY_ELEMENTS_REGEX = /^(?:\s*(?:<p><\/p>|<br\s*\/?>))+\s*/i;
const TRAILING_EMPTY_ELEMENTS_REGEX = /(?:\s*(?:<p><\/p>|<br\s*\/?>))+\s*$/i;
const REPEATED_EMPTY_PARAGRAPHS_REGEX = /<p><\/p>(?:\s*<p><\/p>)+/gi;

// Preserve one intentional blank paragraph between content blocks.
export function normalizeEmptyLines(htmlString: string): string {
    if (!htmlString || htmlString.trim() === "") {
        return htmlString;
    }

    return htmlString
        .replace(PARAGRAPH_CONTENT_REGEX, (_match, content: string) => {
            return `<p>${content.trim()}</p>`;
        })
        .replace(EMPTY_PARAGRAPH_REGEX, "<p></p>")
        .replace(LEADING_EMPTY_ELEMENTS_REGEX, "")
        .replace(TRAILING_EMPTY_ELEMENTS_REGEX, "")
        .replace(REPEATED_EMPTY_PARAGRAPHS_REGEX, "<p></p>");
}

// Output also allows legacy div tags; input accepts only TipTap formatting.
export function sanitizeRichTextContent({
    htmlString,
    mode,
}: {
    htmlString: string;
    mode: "input" | "output";
}): string {
    const allowedTags =
        mode === "input"
            ? [
                  "b",
                  "strong",
                  "i",
                  "em",
                  "strike",
                  "s",
                  "u",
                  "p",
                  "br",
                  "ul",
                  "ol",
                  "li",
              ]
            : [
                  "b",
                  "strong",
                  "i",
                  "em",
                  "strike",
                  "s",
                  "u",
                  "br",
                  "div",
                  "p",
                  "ul",
                  "ol",
                  "li",
              ];

    return sanitizeHtml(htmlString, {
        allowedTags,
        allowedAttributes: {},
    });
}

const NUMERIC_CHARACTER_REFERENCE_REGEX = /&#(?:(\d+)|x([\da-f]+));?/gi;
const BIDI_CHARACTER_REFERENCE_REGEX = /&(?:lrm|rlm);/gi;

function removeEncodedControlCharacters(value: string): string {
    return value
        .replace(BIDI_CHARACTER_REFERENCE_REGEX, "")
        .replace(
            NUMERIC_CHARACTER_REFERENCE_REGEX,
            (
                reference,
                decimal: string | undefined,
                hexadecimal: string | undefined,
            ) => {
                const codePoint = Number.parseInt(
                    decimal ?? hexadecimal ?? "",
                    decimal === undefined ? 16 : 10,
                );
                if (
                    codePoint <= 0x08 ||
                    (codePoint >= 0x0b && codePoint <= 0x0c) ||
                    (codePoint >= 0x0e && codePoint <= 0x1f) ||
                    (codePoint >= 0x7f && codePoint <= 0x9f) ||
                    codePoint === 0x061c ||
                    codePoint === 0x200e ||
                    codePoint === 0x200f ||
                    (codePoint >= 0x202a && codePoint <= 0x202e) ||
                    (codePoint >= 0x2066 && codePoint <= 0x2069)
                ) {
                    return "";
                }
                return reference;
            },
        );
}

export function normalizeUserRichTextHtml(html: string): string {
    const htmlWithoutControlCharacters = removeEncodedControlCharacters(
        removeNonDisplayControlCharacters(html),
    );
    // Sanitization can decode entities, so strip controls on both sides of it.
    return removeNonDisplayControlCharacters(
        removeEncodedControlCharacters(
            normalizeEmptyLines(
                sanitizeRichTextContent({
                    htmlString: htmlWithoutControlCharacters,
                    mode: "input",
                }),
            ),
        ),
    );
}
