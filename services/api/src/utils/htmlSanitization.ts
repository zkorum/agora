import sanitizeHtml from "sanitize-html";

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

export function sanitizeHtmlBody(htmlString: string, maxLength: number) {
    htmlString = sanitizeHtmlInput(htmlString);

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
