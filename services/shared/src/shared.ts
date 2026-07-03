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
export const MAX_LENGTH_OPINION_HTML = 840; // Reserve extra space for HTML tags
export const MAX_LENGTH_OPINION_HTML_OUTPUT = 3000; // Old value for database retro-compatibility of existing data
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

export function toUnionUndefined<T>(value: T | null | undefined): T | undefined {
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

export type RichTextValidationMode = "conversation" | "opinion";
export type RichTextValidationFailureReason =
    | "plain_text_too_long"
    | "html_too_long";

interface ValidateRichTextInputReturn {
    success: true;
}

interface ValidateRichTextInputFailureReturn {
    success: false;
    reason: RichTextValidationFailureReason;
}

const EMPTY_PARAGRAPH_PATTERN = String.raw`<p>(?:[\s\u00a0]|&nbsp;|<br\s*\/?>)*<\/p>`;
const PARAGRAPH_CONTENT_REGEX = /<p>([\s\S]*?)<\/p>/gi;
const EMPTY_PARAGRAPH_REGEX = new RegExp(EMPTY_PARAGRAPH_PATTERN, "gi");
const LEADING_EMPTY_PARAGRAPHS_REGEX = new RegExp(
    String.raw`^(?:\s*${EMPTY_PARAGRAPH_PATTERN})+\s*`,
    "i",
);
const TRAILING_EMPTY_PARAGRAPHS_REGEX = new RegExp(
    String.raw`\s*(?:${EMPTY_PARAGRAPH_PATTERN}\s*)+$`,
    "i",
);
const REPEATED_EMPTY_PARAGRAPHS_REGEX = new RegExp(
    String.raw`${EMPTY_PARAGRAPH_PATTERN}(?:\s*${EMPTY_PARAGRAPH_PATTERN})+`,
    "gi",
);
const LEADING_BREAKS_REGEX = /^(\s*<br\s*\/?>)+\s*/i;
const TRAILING_BREAKS_REGEX = /\s*(<br\s*\/?>)+\s*$/i;

export function normalizeRichTextEmptyLines(htmlString: string): string {
    if (!htmlString || htmlString.trim() === "") {
        return htmlString;
    }

    return htmlString
        .replace(PARAGRAPH_CONTENT_REGEX, (_match, content: string) => {
            return `<p>${content.trim()}</p>`;
        })
        .replace(LEADING_EMPTY_PARAGRAPHS_REGEX, "")
        .replace(TRAILING_EMPTY_PARAGRAPHS_REGEX, "")
        .replace(REPEATED_EMPTY_PARAGRAPHS_REGEX, "<p></p>")
        .replace(EMPTY_PARAGRAPH_REGEX, "<p></p>")
        .replace(LEADING_BREAKS_REGEX, "")
        .replace(TRAILING_BREAKS_REGEX, "");
}

export function htmlToCountedText(htmlString: string): string {
    const textWithNewlines = htmlString
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<p>/gi, "");

    // Strip HTML tags; repeat until stable to handle malformed/nested tags
    let plainText = textWithNewlines;
    let prev: string;
    do {
        prev = plainText;
        plainText = plainText.replace(/<[^>]*>/g, "");
    } while (plainText !== prev);
    // Remove any remaining incomplete opening tag (e.g. "<script" with no closing >)
    plainText = plainText.replace(/<[^>]*$/, "");
    return plainText.replace(/\n$/, "");
}

export function countHtmlPlainTextCharacters(
    htmlString: string,
): CountHtmlPlainTextCharactersReturn {
    return {
        characterCount: htmlToCountedText(htmlString).length,
    };
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
    mode: RichTextValidationMode,
): ValidateHtmlStringCharacterCountReturn {
    const characterLimit =
        mode == "conversation"
            ? MAX_LENGTH_CONVERSATION_BODY
            : MAX_LENGTH_OPINION;
    return validateHtmlStringCharacterCountWithLimit({
        htmlString,
        maxCharacterCount: characterLimit,
    });
}

export function validateRichTextInput({
    htmlString,
    mode,
}: {
    htmlString: string;
    mode: RichTextValidationMode;
}): ValidateRichTextInputReturn | ValidateRichTextInputFailureReturn {
    const characterLimit =
        mode === "conversation"
            ? MAX_LENGTH_CONVERSATION_BODY
            : MAX_LENGTH_OPINION;
    const htmlLimit =
        mode === "conversation"
            ? MAX_LENGTH_CONVERSATION_BODY_HTML
            : MAX_LENGTH_OPINION_HTML;
    const { characterCount } = countHtmlPlainTextCharacters(htmlString);

    if (characterCount > characterLimit) {
        return { success: false, reason: "plain_text_too_long" };
    }

    if (htmlString.length > htmlLimit) {
        return { success: false, reason: "html_too_long" };
    }

    return { success: true };
}
