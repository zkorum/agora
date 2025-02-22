import sanitizeHtml from "sanitize-html";
import linkifyHtml from "linkify-html";
import type { Opts } from "linkifyjs";

function sanitizeHtmlInput(htmlString: string): string {
    const options: sanitizeHtml.IOptions = {
        allowedTags: ["b", "br", "i", "strike", "u", "div"],
    };
    htmlString = sanitizeHtml(htmlString, options);

    return htmlString;
}

function getHtmlStringCharacterCount(htmlString: string): number {
    const options: sanitizeHtml.IOptions = {
        allowedTags: [],
        allowedAttributes: {},
    };
    const rawTextWithoutTags = sanitizeHtml(htmlString, options);
    return rawTextWithoutTags.length;
}

function linkifyHtmlBody(htmlString: string) {
    const opts: Opts = {
        attributes: {
            target: "_blank",
        },
    };
    return linkifyHtml(htmlString, opts);
}

export function processHtmlBody(htmlString: string, maxLength: number) {
    htmlString = sanitizeHtmlInput(htmlString);
    htmlString = linkifyHtmlBody(htmlString);

    const characterCount = getHtmlStringCharacterCount(htmlString);
    if (characterCount > maxLength) {
        throw new Error(
            "Incoming post's body had exceeded the max both length: " +
                characterCount.toString() +
                ". " +
                "Max allowed: " +
                maxLength.toString(),
        );
    }

    return htmlString;
}
