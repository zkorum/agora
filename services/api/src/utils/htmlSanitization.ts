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

function linkifyHtmlBody(htmlString: string) {
    const opts: Opts = {
        attributes: {
            target: "_blank",
        },
    };
    return linkifyHtml(htmlString, opts);
}

export function processHtmlBody(htmlString: string) {
    htmlString = sanitizeHtmlInput(htmlString);
    htmlString = linkifyHtmlBody(htmlString);
    return htmlString;
}
