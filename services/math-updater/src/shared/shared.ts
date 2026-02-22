/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
// WARNING: this is also used in schema.ts and cannot be imported there so it was copy-pasted
// IF YOU CHANGE THESE VALUES ALSO CHANGE THEM IN SCHEMA.TS
export const MAX_LENGTH_OPTION = 30;
export const MAX_LENGTH_TITLE = 140; // 140 is LinkedIn question limit
export const MAX_LENGTH_BODY = 1000;
export const MAX_LENGTH_BODY_HTML = 3000; // Reserve extra space for HTML tags
export const MAX_LENGTH_OPINION = 280;
export const MAX_LENGTH_OPINION_HTML = 840; // Reserve extra space for HTML tags
export const MAX_LENGTH_OPINION_HTML_OUTPUT = 3000; // Old value for database retro-compatibility of existing data
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

export function validateHtmlStringCharacterCount(
    htmlString: string,
    mode: "conversation" | "opinion",
): ValidateHtmlStringCharacterCountReturn {
    const rawTextWithoutTags = htmlToCountedText(htmlString);
    const characterLimit =
        mode == "conversation" ? MAX_LENGTH_BODY : MAX_LENGTH_OPINION;
    if (rawTextWithoutTags.length <= characterLimit) {
        return { isValid: true, characterCount: rawTextWithoutTags.length };
    } else {
        return { isValid: false, characterCount: rawTextWithoutTags.length };
    }
}
