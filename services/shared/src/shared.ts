import sanitizeHtml from "sanitize-html";

// WARNING: this is also used in schema.ts and cannot be imported there so it was copy-pasted
// IF YOU CHANGE THESE VALUES ALSO CHANGE THEM IN SCHEMA.TS
export const MAX_LENGTH_OPTION = 30;
export const MAX_LENGTH_TITLE = 140; // 140 is LinkedIn question limit
export const MAX_LENGTH_BODY = 1000;
export const MAX_LENGTH_BODY_HTML = 3000; // Reserve extra space for HTML tags
export const MAX_LENGTH_OPINION = 1000;
export const MAX_LENGTH_OPINION_HTML = 3000; // Reserve extra space for HTML tags
export const MAX_LENGTH_NAME_CREATOR = 65;
export const MAX_LENGTH_USERNAME = 20;
export const MIN_LENGTH_USERNAME = 2;
export const MAX_LENGTH_USER_REPORT_EXPLANATION = 260;

export const PEPPER_VERSION = 0;

export function toUnionUndefined<T>(value: T | null): T | undefined {
    if (value === null) {
        return undefined;
    }
    return value;
}

interface ValidateHtmlStringCharacterCountReturn {
    isValid: boolean;
    characterCount: number;
}

/**
 * Converts HTML content to plain text with newlines preserved
 * This is used for character counting across the application
 */
export function htmlToCountedText(htmlString: string): string {
    // Convert block-level HTML elements to newlines before stripping tags
    // This ensures line breaks are counted as characters
    let textWithNewlines = htmlString
        .replace(/<\/p>/gi, "\n") // </p> becomes newline
        .replace(/<br\s*\/?>/gi, "\n") // <br> and <br/> become newline
        .replace(/<p>/gi, ""); // Remove opening <p> tags

    const options: sanitizeHtml.IOptions = {
        allowedTags: [],
        allowedAttributes: {},
    };
    const plainText = sanitizeHtml(textWithNewlines, options);

    // Trim trailing newline (single paragraph ends with \n which shouldn't be counted)
    return plainText.replace(/\n$/, "");
}

export function validateHtmlStringCharacterCount(
    htmlString: string,
    mode: "conversation" | "opinion",
): ValidateHtmlStringCharacterCountReturn {
    const rawTextWithoutTags = htmlToCountedText(htmlString);

    // Validate plain text against plain text limits (not HTML limits)
    // HTML limits are only for database storage to account for markup overhead
    const characterLimit =
        mode == "conversation" ? MAX_LENGTH_BODY : MAX_LENGTH_OPINION;
    if (rawTextWithoutTags.length <= characterLimit) {
        return { isValid: true, characterCount: rawTextWithoutTags.length };
    } else {
        return { isValid: false, characterCount: rawTextWithoutTags.length };
    }
}
