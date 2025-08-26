// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import localforage from "localforage";
import { toEncodedCID } from "./common/cid.js";
import type { NumberType } from "libphonenumber-js/max";
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

interface ValidateHtmlStringCharacterCountReturn {
    isValid: boolean;
    characterCount: number;
}

export function validateHtmlStringCharacterCount(
    htmlString: string,
    mode: "conversation" | "opinion",
): ValidateHtmlStringCharacterCountReturn {
    const options: sanitizeHtml.IOptions = {
        allowedTags: [],
        allowedAttributes: {},
    };
    const rawTextWithoutTags = sanitizeHtml(htmlString, options);

    const characterLimit =
        mode == "conversation" ? MAX_LENGTH_BODY_HTML : MAX_LENGTH_OPINION_HTML;
    if (rawTextWithoutTags.length <= characterLimit) {
        return { isValid: true, characterCount: rawTextWithoutTags.length };
    } else {
        return { isValid: false, characterCount: rawTextWithoutTags.length };
    }
}

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

export function processHtmlBody(htmlString: string, enableLinks: boolean) {
    htmlString = sanitizeHtmlInput(htmlString);
    if (enableLinks) {
        htmlString = linkifyHtmlBody(htmlString);
    }
    return htmlString;
}

// WARNING: this is also used in schema.ts and cannot be imported there so it was copy-pasted
// IF YOU CHANGE THESE VALUES ALSO CHANGE THEM IN SCHEMA.TS
export const MAX_LENGTH_OPTION = 30;
export const MAX_LENGTH_TITLE = 140; // 140 is LinkedIn question limit
export const MAX_LENGTH_BODY = 1000;
export const MAX_LENGTH_BODY_HTML = 3000; // Reserve extra space for HTML tags
export const MAX_LENGTH_OPINION = 1000;
export const MAX_LENGTH_OPINION_HTML = 3000; // Reserve extra space for HTML tags
export const MAX_LENGTH_NAME_CREATOR = 65;
export const MAX_LENGTH_USERNAME = 20;
export const MIN_LENGTH_USERNAME = 2;
export const MAX_LENGTH_USER_REPORT_EXPLANATION = 260;

export const PEPPER_VERSION = 0;

export const POST_TOPICS: Record<string, string> = {
    technology: "Technology",
    environment: "Environment",
    politics: "Politics",
};

export function toUnionUndefined<T>(value: T | null): T | undefined {
    if (value === null) {
        return undefined;
    }
    return value;
}

export const BASE_SCOPE = "base";

export async function buildContext(content: string): Promise<string> {
    return await toEncodedCID(content);
}

export interface ToxicityClassification {
    toxicity: number;
    severe_toxicity: number;
    obscene: number;
    identity_attack: number;
    insult: number;
    threat: number;
    sexual_explicit: number;
}

export function isPhoneNumberTypeSupported(type: NumberType): boolean {
    switch (type) {
        case "PERSONAL_NUMBER":
        case "FIXED_LINE_OR_MOBILE":
        case "MOBILE":
        case undefined:
            return true;
        case "FIXED_LINE":
        case "PREMIUM_RATE":
        case "TOLL_FREE":
        case "SHARED_COST":
        case "VOIP":
        case "PAGER":
        case "UAN":
        case "VOICEMAIL":
        default:
            return false;
    }
}
