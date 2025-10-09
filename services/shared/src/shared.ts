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

export function validateHtmlStringCharacterCount(
    htmlString: string,
    mode: "conversation" | "opinion",
): ValidateHtmlStringCharacterCountReturn {
    const options: sanitizeHtml.IOptions = {
        allowedTags: [],
        allowedAttributes: {},
    };
    const rawTextWithoutTags = sanitizeHtml(htmlString, options);

    const characterLimit =
        mode == "conversation" ? MAX_LENGTH_BODY_HTML : MAX_LENGTH_OPINION_HTML;
    if (rawTextWithoutTags.length <= characterLimit) {
        return { isValid: true, characterCount: rawTextWithoutTags.length };
    } else {
        return { isValid: false, characterCount: rawTextWithoutTags.length };
    }
}
