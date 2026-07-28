/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { decode } from "html-entities";
import sanitizeHtml from "sanitize-html";

// WARNING: this is also used in schema.ts and cannot be imported there so it was copy-pasted
// IF YOU CHANGE THESE VALUES ALSO CHANGE THEM IN SCHEMA.TS
export const MAX_LENGTH_OPTION = 30;
export const MAX_LENGTH_TITLE = 140; // 140 is LinkedIn question limit
export const MAX_LENGTH_BODY = 1000;
export const MAX_LENGTH_BODY_HTML = 3000; // Reserve extra space for HTML tags
export const MAX_LENGTH_CONVERSATION_BODY = 5000;
export const MAX_LENGTH_CONVERSATION_BODY_HTML = 30000;
export const LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT = 60000;
export const MAX_LENGTH_OPINION = 280;
export const MAX_LENGTH_OPINION_HTML_OUTPUT = 3000; // Old value for database retro-compatibility of existing data
export const MAX_BYTES_RICH_TEXT_HTML = 16_384;
export const MAX_BYTES_CONVERSATION_BODY_HTML = 60_000;
export const MAX_LENGTH_SURVEY_QUESTION = 500;
export const MAX_LENGTH_SURVEY_OPTION = 200;
export const PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD = 5;
export const MAX_LENGTH_NAME_CREATOR = 65;
export const MAX_LENGTH_DESCRIPTION_CREATOR = 280;
export const MAX_LENGTH_USERNAME = 20;
export const MIN_LENGTH_USERNAME = 2;
export const MAX_LENGTH_USER_REPORT_EXPLANATION = 260;

export const PEPPER_VERSION = 0;

export const MAX_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS = 1000;
export const MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS = 2;

export function toUnionUndefined<T>(
    value: T | null | undefined,
): T | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    return value;
}

interface ValidateHtmlStringCharacterCountReturn {
    isValid: boolean;
    characterCount: number;
}

interface CountHtmlPlainTextCharactersReturn {
    characterCount: number;
}

export type RichTextValidationMode =
    | "conversation"
    | "opinion"
    | "ranking_item"
    | "survey";
type RichTextCharacterValidationMode = Exclude<
    RichTextValidationMode,
    "survey"
>;
export const richTextSizeValidationFailureReasons = [
    "plain_text_too_long",
    "html_too_long",
] as const;
export const richTextValidationFailureReasons = [
    "plain_text_empty",
    ...richTextSizeValidationFailureReasons,
] as const;
export type RichTextValidationFailureReason =
    (typeof richTextValidationFailureReasons)[number];
export type RichTextSizeValidationFailureReason =
    (typeof richTextSizeValidationFailureReasons)[number];

export interface RichTextValidationSuccess {
    success: true;
    plainText: string;
    characterCount: number;
}

export interface RichTextValidationFailure<
    TReason extends RichTextValidationFailureReason =
        RichTextValidationFailureReason,
> {
    success: false;
    reason: TReason;
    count: number;
    limit: number;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
    granularity: "grapheme",
});

function normalizeCountedText(value: string): string {
    return value.replace(/\n+/g, "\n").replace(/^\n+|\n+$/g, "");
}

export function convertHtmlToCountedText(htmlString: string): string {
    const textWithNewlines = htmlString
        .replace(/<\/(?:p|li|div|h[1-6])>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n");

    const plainText = sanitizeHtml(textWithNewlines, {
        allowedTags: [],
        allowedAttributes: {},
    });
    return normalizeCountedText(decode(plainText));
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
    return normalizeCountedText(decodeBasicHtmlEntities(textWithNewlines));
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

export function countHtmlPlainTextCharacters(
    htmlString: string,
): CountHtmlPlainTextCharactersReturn {
    return countPlainTextCharacters(htmlToCountedText(htmlString));
}

export function countPlainTextCharacters(
    plainText: string,
): CountHtmlPlainTextCharactersReturn {
    let characterCount = 0;
    for (const _segment of graphemeSegmenter.segment(plainText)) {
        characterCount += 1;
    }

    return {
        characterCount,
    };
}

export function countUtf8Bytes(value: string): number {
    return new TextEncoder().encode(value).length;
}

export function removeNonDisplayControlCharacters(value: string): string {
    let result = "";
    for (const character of value) {
        const codePoint = character.codePointAt(0);
        if (
            codePoint !== undefined &&
            (codePoint <= 0x08 ||
                (codePoint >= 0x0b && codePoint <= 0x0c) ||
                (codePoint >= 0x0e && codePoint <= 0x1f) ||
                (codePoint >= 0x7f && codePoint <= 0x9f) ||
                codePoint === 0x061c ||
                codePoint === 0x200e ||
                codePoint === 0x200f ||
                (codePoint >= 0x202a && codePoint <= 0x202e) ||
                (codePoint >= 0x2066 && codePoint <= 0x2069))
        ) {
            continue;
        }
        result += character;
    }
    return result;
}

export function hasVisiblePlainText(plainText: string): boolean {
    return (
        removeNonDisplayControlCharacters(plainText)
            .replace(/\p{Default_Ignorable_Code_Point}/gu, "")
            .trim().length > 0
    );
}

export function validateHtmlStringCharacterCountWithLimit({
    htmlString,
    maxCharacterCount,
}: {
    htmlString: string;
    maxCharacterCount: number;
}): ValidateHtmlStringCharacterCountReturn {
    const { characterCount } = countHtmlPlainTextCharacters(htmlString);
    return {
        isValid: characterCount <= maxCharacterCount,
        characterCount,
    };
}

export function validateHtmlStringCharacterCount(
    htmlString: string,
    mode: RichTextCharacterValidationMode,
): ValidateHtmlStringCharacterCountReturn {
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
        case "opinion":
            return MAX_LENGTH_OPINION;
        case "ranking_item":
            return MAX_LENGTH_BODY;
    }
}

function getRichTextValidationLimits(mode: RichTextValidationMode): {
    characterLimit: number | undefined;
    htmlByteLimit: number;
} {
    switch (mode) {
        case "conversation":
            return {
                characterLimit: MAX_LENGTH_CONVERSATION_BODY,
                htmlByteLimit: MAX_BYTES_CONVERSATION_BODY_HTML,
            };
        case "opinion":
            return {
                characterLimit: MAX_LENGTH_OPINION,
                htmlByteLimit: MAX_BYTES_RICH_TEXT_HTML,
            };
        case "ranking_item":
            return {
                characterLimit: MAX_LENGTH_BODY,
                htmlByteLimit: MAX_BYTES_RICH_TEXT_HTML,
            };
        case "survey":
            return {
                characterLimit: undefined,
                htmlByteLimit: MAX_BYTES_RICH_TEXT_HTML,
            };
    }
}

export function validateRichTextHtmlByteCount({
    htmlString,
    mode,
}: {
    htmlString: string;
    mode: RichTextValidationMode;
}): { success: true } | RichTextValidationFailure<"html_too_long"> {
    const { htmlByteLimit } = getRichTextValidationLimits(mode);
    const htmlByteCount = countUtf8Bytes(htmlString);
    if (htmlByteCount > htmlByteLimit) {
        return {
            success: false,
            reason: "html_too_long",
            count: htmlByteCount,
            limit: htmlByteLimit,
        };
    }

    return { success: true };
}

export function validateRichTextInput({
    htmlString,
    mode,
}: {
    htmlString: string;
    mode: RichTextValidationMode;
}): RichTextValidationSuccess | RichTextValidationFailure {
    const htmlValidation = validateRichTextHtmlByteCount({ htmlString, mode });
    if (!htmlValidation.success) {
        return htmlValidation;
    }

    const plainText = htmlToCountedText(htmlString);
    return validateRichTextInputWithPlainText({ htmlString, plainText, mode });
}

export function validateRichTextInputWithPlainText({
    htmlString,
    plainText,
    mode,
}: {
    htmlString: string;
    plainText: string;
    mode: RichTextValidationMode;
}): RichTextValidationSuccess | RichTextValidationFailure {
    const htmlValidation = validateRichTextHtmlByteCount({ htmlString, mode });
    if (!htmlValidation.success) {
        return htmlValidation;
    }

    const { characterLimit } = getRichTextValidationLimits(mode);
    if (mode === "opinion" && !hasVisiblePlainText(plainText)) {
        return {
            success: false,
            reason: "plain_text_empty",
            count: 0,
            limit: 1,
        };
    }

    const { characterCount } = countPlainTextCharacters(plainText);

    if (characterLimit !== undefined && characterCount > characterLimit) {
        return {
            success: false,
            reason: "plain_text_too_long",
            count: characterCount,
            limit: characterLimit,
        };
    }

    return { success: true, plainText, characterCount };
}
