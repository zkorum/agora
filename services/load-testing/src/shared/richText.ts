/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { compile } from "html-to-text";
import {
    MAX_LENGTH_BODY,
    MAX_LENGTH_CONVERSATION_BODY,
    MAX_LENGTH_CONVERSATION_EMAIL_UPDATE,
    MAX_LENGTH_OPINION,
    countPlainTextCharacters,
    type RichTextValidationFailure,
    type RichTextValidationMode,
    type RichTextValidationSuccess,
    validateRichTextHtmlByteCount,
    validateRichTextInputWithPlainText,
} from "./shared.js";

type RichTextCharacterValidationMode = Exclude<
    RichTextValidationMode,
    "survey"
>;

function normalizePlainText(value: string): string {
    return value
        .replace(/\n{3,}/g, "\n\n")
        .replace(/(^|\n) (?=\d+\. )/g, "$1")
        .trim();
}

const convertHtmlToCountedTextPrimary = compile({
    wordwrap: false,
    whitespaceCharacters: " \t\r\n\f\u200b\u00a0",
    selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
        { selector: "ul", options: { itemPrefix: "- " } },
        { selector: "h1", options: { uppercase: false } },
        { selector: "h2", options: { uppercase: false } },
        { selector: "h3", options: { uppercase: false } },
        { selector: "h4", options: { uppercase: false } },
        { selector: "h5", options: { uppercase: false } },
        { selector: "h6", options: { uppercase: false } },
    ],
});

export function convertHtmlToCountedText(htmlString: string): string {
    return normalizePlainText(convertHtmlToCountedTextPrimary(htmlString));
}

function decodeBasicHtmlEntities(value: string): string {
    return value.replace(
        /&#(\d+);?|&#x([\da-f]+);?|&(amp|apos|gt|lt|nbsp|quot);/gi,
        (
            entity,
            decimal: string | undefined,
            hexadecimal: string | undefined,
            named: string | undefined,
        ) => {
            if (named !== undefined) {
                switch (named.toLowerCase()) {
                    case "amp":
                        return "&";
                    case "apos":
                        return "'";
                    case "gt":
                        return ">";
                    case "lt":
                        return "<";
                    case "nbsp":
                        return "\u00a0";
                    case "quot":
                        return '"';
                }
            }

            const codePoint = Number.parseInt(
                decimal ?? hexadecimal ?? "",
                decimal === undefined ? 16 : 10,
            );
            if (
                !Number.isInteger(codePoint) ||
                codePoint < 0 ||
                codePoint > 0x10ffff ||
                (codePoint >= 0xd800 && codePoint <= 0xdfff)
            ) {
                return entity;
            }
            return String.fromCodePoint(codePoint);
        },
    );
}

export function convertHtmlToCountedTextFallback(htmlString: string): string {
    const textWithNewlines = htmlString
        .replace(/<\/(?:p|li|div|h[1-6])>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/<[^>]*$/, "");
    return normalizePlainText(decodeBasicHtmlEntities(textWithNewlines));
}

export type HtmlToCountedTextResult =
    | {
          usedFallback: false;
          plainText: string;
      }
    | {
          usedFallback: true;
          plainText: string;
          error: unknown;
      };

export function convertHtmlToCountedTextWithFallback({
    htmlString,
    primaryConverter,
}: {
    htmlString: string;
    primaryConverter: (value: string) => string;
}): HtmlToCountedTextResult {
    try {
        return {
            usedFallback: false,
            plainText: primaryConverter(htmlString),
        };
    } catch (error: unknown) {
        return {
            usedFallback: true,
            plainText: convertHtmlToCountedTextFallback(htmlString),
            error,
        };
    }
}

export function htmlToCountedTextResult(
    htmlString: string,
): HtmlToCountedTextResult {
    return convertHtmlToCountedTextWithFallback({
        htmlString,
        primaryConverter: convertHtmlToCountedText,
    });
}

export function htmlToCountedText(htmlString: string): string {
    return htmlToCountedTextResult(htmlString).plainText;
}

export function countHtmlPlainTextCharacters(htmlString: string): {
    characterCount: number;
} {
    return countPlainTextCharacters(htmlToCountedText(htmlString));
}

export function validateHtmlStringCharacterCountWithLimit({
    htmlString,
    maxCharacterCount,
}: {
    htmlString: string;
    maxCharacterCount: number;
}): { isValid: boolean; characterCount: number } {
    const { characterCount } = countHtmlPlainTextCharacters(htmlString);
    return {
        isValid: characterCount <= maxCharacterCount,
        characterCount,
    };
}

export function validateHtmlStringCharacterCount(
    htmlString: string,
    mode: RichTextCharacterValidationMode,
): { isValid: boolean; characterCount: number } {
    const characterLimit = getRichTextCharacterLimit(mode);
    return validateHtmlStringCharacterCountWithLimit({
        htmlString,
        maxCharacterCount: characterLimit,
    });
}

function getRichTextCharacterLimit(
    mode: RichTextCharacterValidationMode,
): number {
    switch (mode) {
        case "conversation":
            return MAX_LENGTH_CONVERSATION_BODY;
        case "conversation_email_update":
            return MAX_LENGTH_CONVERSATION_EMAIL_UPDATE;
        case "opinion":
            return MAX_LENGTH_OPINION;
        case "ranking_item":
            return MAX_LENGTH_BODY;
    }
}

export function validateRichTextInput({
    htmlString,
    mode,
}: {
    htmlString: string;
    mode: RichTextValidationMode;
}): RichTextValidationSuccess | RichTextValidationFailure {
    const htmlValidation = validateRichTextHtmlByteCount({ htmlString, mode });
    if (!htmlValidation.success) return htmlValidation;

    const plainText = htmlToCountedText(htmlString);
    return validateRichTextInputWithPlainText({ htmlString, plainText, mode });
}
