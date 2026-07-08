import { log } from "@/app.js";
import {
    htmlToCountedText,
    processUserGeneratedHtml,
} from "@/shared-app-api/html.js";
import {
    validateRichTextInput,
    type RichTextValidationMode,
} from "@/shared/shared.js";

export interface NormalizedUserRichText {
    html: string;
    plainText: string;
    serverPlainText: string;
}

export function normalizeUserRichTextInput({
    html,
    plainText,
    validationMode,
    logLabel,
}: {
    html: string;
    plainText: string;
    validationMode?: RichTextValidationMode;
    logLabel: string;
}):
    | { success: true; content: NormalizedUserRichText }
    | Extract<ReturnType<typeof validateRichTextInput>, { success: false }> {
    let sanitizedHtml = processUserGeneratedHtml(html, false, "input");

    if (validationMode !== undefined) {
        const validationResult = validateRichTextInput({
            htmlString: sanitizedHtml,
            mode: validationMode,
        });
        if (!validationResult.success) {
            return validationResult;
        }
    }

    sanitizedHtml = processUserGeneratedHtml(sanitizedHtml, true, "input");
    const serverPlainText = htmlToCountedText(sanitizedHtml);
    if (serverPlainText !== plainText) {
        log.info(
            {
                frontendPlainTextChars: plainText.length,
                serverPlainTextChars: serverPlainText.length,
            },
            logLabel,
        );
    }

    return {
        success: true,
        content: {
            html: sanitizedHtml,
            plainText,
            serverPlainText,
        },
    };
}
