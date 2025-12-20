/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import linkifyHtml from "linkify-html";
import type { Opts } from "linkifyjs";
import localforage from "localforage";
import sanitizeHtml from "sanitize-html";

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

// Sanitize user-generated rich text content (allows basic formatting tags only)
// mode "input": strict validation for new TipTap content (no legacy "div" tags)
// mode "output": permissive validation for displaying existing content (includes legacy "div" tags)
function sanitizeRichTextContent(
    htmlString: string,
    mode: "input" | "output",
): string {
    const allowedTags =
        mode === "input"
            ? ["b", "strong", "i", "em", "strike", "s", "u", "p", "br"] // TipTap only
            : ["b", "strong", "i", "em", "strike", "s", "u", "br", "div", "p"]; // Legacy + TipTap

    const options: sanitizeHtml.IOptions = {
        allowedTags,
        allowedAttributes: {},
    };
    return sanitizeHtml(htmlString, options);
}

// Convert plain URLs in HTML to clickable links with security attributes
function linkifyHtmlContent(htmlString: string): string {
    const opts: Opts = {
        attributes: {
            target: "_blank",
            rel: "noopener noreferrer nofollow",
        },
    };
    return linkifyHtml(htmlString, opts);
}

// Process user-generated HTML content: sanitize and optionally add links
// mode "input": strict validation for new content from TipTap editor
// mode "output": permissive validation for displaying existing content (default for backwards compatibility)
export function processUserGeneratedHtml(
    htmlString: string,
    enableLinks: boolean,
    mode: "input" | "output" = "output",
): string {
    htmlString = sanitizeRichTextContent(htmlString, mode);
    if (enableLinks) {
        htmlString = linkifyHtmlContent(htmlString);
    }
    return htmlString;
}
