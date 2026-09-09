import { normalizeUserRichTextHtml } from "@/shared/richTextHtml.js";
import { log } from "@/app.js";
import { htmlToCountedTextResult } from "@/shared/richText.js";
import {
    validateRichTextHtmlByteCount,
    validateRichTextInputWithPlainText,
    type RichTextSizeValidationFailureReason,
    type RichTextValidationFailure,
    type RichTextValidationMode,
} from "@/shared/shared.js";

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
    params: NormalizeUserRichTextInputParams<
        "opinion" | "conversation_email_update"
    >,
): NormalizeUserRichTextSuccess | RichTextValidationFailure;
export function normalizeUserRichTextInput(
    params: NormalizeUserRichTextInputParams<"conversation" | "ranking_item">,
):
    | NormalizeUserRichTextSuccess
    | RichTextValidationFailure<RichTextSizeValidationFailureReason>;
export function normalizeUserRichTextInput(
    params: NormalizeUserRichTextInputParams<"survey">,
): NormalizeUserRichTextSuccess | RichTextValidationFailure<"html_too_long">;
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

    const sanitizedHtml = normalizeUserRichTextHtml(html);
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
