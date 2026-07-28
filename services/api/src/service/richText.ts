import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import { log } from "@/app.js";
import {
    htmlToCountedTextResult,
    removeNonDisplayControlCharacters,
    validateRichTextHtmlByteCount,
    validateRichTextInputWithPlainText,
    type RichTextSizeValidationFailureReason,
    type RichTextValidationFailure,
    type RichTextValidationMode,
} from "@/shared/shared.js";

const NUMERIC_CHARACTER_REFERENCE_REGEX =
    /&#(?:(\d+)|x([\da-f]+));?/gi;
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

export interface NormalizedUserRichText {
    html: string;
    plainText: string;
}

export function htmlToCountedTextWithWarning({
    html,
    context,
}: {
    html: string;
    context: string;
}): string {
    const result = htmlToCountedTextResult(html);
    if (result.usedFallback) {
        log.warn(
            result.error,
            `[RichText] HTML-to-text conversion failed for ${context}; using best-effort text (HTML length: ${String(html.length)})`,
        );
    }
    return result.plainText;
}

interface NormalizeUserRichTextInputParams<
    TMode extends RichTextValidationMode,
> {
    html: string;
    validationMode: TMode;
}

interface NormalizeUserRichTextSuccess {
    success: true;
    content: NormalizedUserRichText;
}

export function normalizeUserRichTextInput(
    params: NormalizeUserRichTextInputParams<"opinion">,
): NormalizeUserRichTextSuccess | RichTextValidationFailure;
export function normalizeUserRichTextInput(
    params: NormalizeUserRichTextInputParams<"conversation" | "ranking_item">,
):
    | NormalizeUserRichTextSuccess
    | RichTextValidationFailure<RichTextSizeValidationFailureReason>;
export function normalizeUserRichTextInput(
    params: NormalizeUserRichTextInputParams<"survey">,
):
    | NormalizeUserRichTextSuccess
    | RichTextValidationFailure<"html_too_long">;
export function normalizeUserRichTextInput({
    html,
    validationMode,
}: NormalizeUserRichTextInputParams<RichTextValidationMode>):
    | NormalizeUserRichTextSuccess
    | RichTextValidationFailure {
    const rawHtmlValidation = validateRichTextHtmlByteCount({
        htmlString: html,
        mode: validationMode,
    });
    if (!rawHtmlValidation.success) {
        return rawHtmlValidation;
    }

    const htmlWithoutControlCharacters = removeEncodedControlCharacters(
        removeNonDisplayControlCharacters(html),
    );
    const sanitizedHtml = removeNonDisplayControlCharacters(
        removeEncodedControlCharacters(
            processUserGeneratedHtml(
                htmlWithoutControlCharacters,
                false,
                "input",
            ),
        ),
    );
    const plainText = htmlToCountedTextWithWarning({
        html: sanitizedHtml,
        context: validationMode,
    });
    const validationResult = validateRichTextInputWithPlainText({
        htmlString: sanitizedHtml,
        plainText,
        mode: validationMode,
    });
    if (!validationResult.success) {
        return validationResult;
    }

    return {
        success: true,
        content: {
            html: sanitizedHtml,
            plainText: validationResult.plainText,
        },
    };
}
