// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import localforage from "localforage";
import sanitizeHtml from "sanitize-html";
import type { Opts } from "linkifyjs";
import linkifyHtml from "linkify-html";

/**
 * Is this browser supported?
 */
export async function isSupported(): Promise<boolean> {
    return (
        localforage.supports(localforage.INDEXEDDB) &&
        // Firefox in private mode can't use indexedDB properly,
        // so we test if we can actually make a database.
        (await (() =>
            new Promise((resolve) => {
                const db = indexedDB.open("testDatabase");
                db.onsuccess = () => {
                    resolve(true);
                };
                db.onerror = () => {
                    resolve(false);
                };
            }))())
    );
}

export enum ProgramError {
    InsecureContext = "INSECURE_CONTEXT",
    UnsupportedBrowser = "UNSUPPORTED_BROWSER",
}

interface DomainAndExtension {
    domainName?: string;
    domainExtension?: string;
}

export function domainNameAndExtensionFromEmail(
    email: string,
): DomainAndExtension {
    const domain = domainFromEmail(email);
    if (domain === undefined) {
        return { domainName: undefined, domainExtension: undefined };
    } else {
        const domainNameAndDomainExtension = domain.split(".");
        if (domainNameAndDomainExtension.length === 2) {
            const [domainName, domainExtension] = domainNameAndDomainExtension;
            return { domainName, domainExtension };
        } else {
            return { domainName: undefined, domainExtension: undefined };
        }
    }
}

export function domainFromEmail(email: string): string | undefined {
    const nameAndDomain = email.split("@");
    if (nameAndDomain.length === 2) {
        const [_username, domain] = [nameAndDomain[0], nameAndDomain[1]];
        return domain;
    }
}

// Sanitize opinion HTML (single-line, no line breaks allowed)
function sanitizeOpinionHtml(htmlString: string): string {
    const options: sanitizeHtml.IOptions = {
        allowedTags: ["b", "strong", "i", "em", "strike", "s", "u"],
    };
    htmlString = sanitizeHtml(htmlString, options);
    return htmlString;
}

// Sanitize conversation HTML (multi-line, line breaks allowed)
function sanitizeConversationHtml(htmlString: string): string {
    const options: sanitizeHtml.IOptions = {
        allowedTags: [
            "b",
            "strong",
            "i",
            "em",
            "strike",
            "s",
            "u",
            "br",
            "div",
            "p",
        ],
    };
    htmlString = sanitizeHtml(htmlString, options);
    return htmlString;
}

// Legacy function for backward compatibility - uses conversation sanitizer
function sanitizeHtmlInput(htmlString: string): string {
    return sanitizeConversationHtml(htmlString);
}

function linkifyHtmlBody(htmlString: string) {
    const opts: Opts = {
        attributes: {
            target: "_blank",
        },
    };
    return linkifyHtml(htmlString, opts);
}

export function processHtmlBody(htmlString: string, enableLinks: boolean) {
    htmlString = sanitizeHtmlInput(htmlString);
    if (enableLinks) {
        htmlString = linkifyHtmlBody(htmlString);
    }
    return htmlString;
}

// Export new sanitizers for explicit use
export function processOpinionHtml(htmlString: string): string {
    return sanitizeOpinionHtml(htmlString);
}

export function processConversationHtml(htmlString: string): string {
    return sanitizeConversationHtml(htmlString);
}
