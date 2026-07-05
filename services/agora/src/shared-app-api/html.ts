/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import { decode } from "html-entities";
import linkifyHtml from "linkify-html";
import type { Opts } from "linkifyjs";
import localforage from "localforage";
import sanitizeHtml from "sanitize-html";

const EMPTY_PARAGRAPH_PATTERN = String.raw`<p>(?:[\s\u00a0]|&nbsp;|<br\s*\/?>)*<\/p>`;
const PARAGRAPH_CONTENT_REGEX = /<p>([\s\S]*?)<\/p>/gi;
const EMPTY_PARAGRAPH_REGEX = new RegExp(EMPTY_PARAGRAPH_PATTERN, "gi");
const LEADING_EMPTY_PARAGRAPHS_REGEX = new RegExp(
    String.raw`^(?:\s*${EMPTY_PARAGRAPH_PATTERN})+\s*`,
    "i",
);
const TRAILING_EMPTY_PARAGRAPHS_REGEX = new RegExp(
    String.raw`\s*(?:${EMPTY_PARAGRAPH_PATTERN}\s*)+$`,
    "i",
);
const REPEATED_EMPTY_PARAGRAPHS_REGEX = new RegExp(
    String.raw`${EMPTY_PARAGRAPH_PATTERN}(?:\s*${EMPTY_PARAGRAPH_PATTERN})+`,
    "gi",
);
const LEADING_BREAKS_REGEX = /^(\s*<br\s*\/?>)+\s*/i;
const TRAILING_BREAKS_REGEX = /\s*(<br\s*\/?>)+\s*$/i;

/**
 * Converts HTML content to plain text with newlines preserved
 * This is used for character counting across the application
 */
export function htmlToCountedText(htmlString: string): string {
    // Convert block-level HTML elements to newlines before stripping tags
    // This ensures line breaks are counted as characters
    const textWithNewlines = htmlString
        .replace(/<\/p>/gi, "\n") // </p> becomes newline
        .replace(/<br\s*\/?>/gi, "\n") // <br> and <br/> become newline
        .replace(/<p>/gi, ""); // Remove opening <p> tags

    const options: sanitizeHtml.IOptions = {
        allowedTags: [],
        allowedAttributes: {},
    };
    const plainText = sanitizeHtml(textWithNewlines, options);

    // Trim trailing newline (single paragraph ends with \n which shouldn't be counted)
    return decode(plainText).replace(/\n$/, "");
}

/**
 * Normalizes TipTap-style empty lines while preserving one intentional blank
 * paragraph between content blocks.
 *
 * @param htmlString - The HTML string to normalize
 * @returns Normalized HTML string with leading/trailing empty elements removed
 */
export function normalizeEmptyLines(htmlString: string): string {
    if (!htmlString || htmlString.trim() === "") {
        return htmlString;
    }

    return htmlString
        .replace(PARAGRAPH_CONTENT_REGEX, (_match, content: string) => {
            return `<p>${content.trim()}</p>`;
        })
        .replace(LEADING_EMPTY_PARAGRAPHS_REGEX, "")
        .replace(TRAILING_EMPTY_PARAGRAPHS_REGEX, "")
        .replace(REPEATED_EMPTY_PARAGRAPHS_REGEX, "<p></p>")
        .replace(EMPTY_PARAGRAPH_REGEX, "<p></p>")
        .replace(LEADING_BREAKS_REGEX, "")
        .replace(TRAILING_BREAKS_REGEX, "");
}

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
            ? [
                  "b",
                  "strong",
                  "i",
                  "em",
                  "strike",
                  "s",
                  "u",
                  "p",
                  "br",
                  "ul",
                  "ol",
                  "li",
              ] // TipTap only
            : [
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
                  "ul",
                  "ol",
                  "li",
              ]; // Legacy + TipTap

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

// Process user-generated HTML content: sanitize, normalize empty lines, and optionally add links
// mode "input": strict validation for new content from TipTap editor
// mode "output": permissive validation for displaying existing content (default for backwards compatibility)
export function processUserGeneratedHtml(
    htmlString: string,
    enableLinks: boolean,
    mode: "input" | "output" = "output",
): string {
    // Step 1: Sanitize to remove disallowed tags
    htmlString = sanitizeRichTextContent(htmlString, mode);

    // Step 2: Normalize excessive empty lines (limit to one empty paragraph)
    htmlString = normalizeEmptyLines(htmlString);

    // Step 3: Convert URLs to clickable links if enabled
    if (enableLinks) {
        htmlString = linkifyHtmlContent(htmlString);
    }

    return htmlString;
}
