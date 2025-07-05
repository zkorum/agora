/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import localforage from "localforage";
import { toEncodedCID } from "./common/cid.js";
import type { NumberType } from "libphonenumber-js/mobile";
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
        mode == "conversation" ? MAX_LENGTH_BODY : MAX_LENGTH_OPINION;
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

// https://gist.github.com/Josantonius/b455e315bc7f790d14b136d61d9ae469
export const LANGUAGE_CODES: Record<string, string> = {
    aa: "Afar",
    ab: "Abkhazian",
    ae: "Avestan",
    af: "Afrikaans",
    ak: "Akan",
    am: "Amharic",
    an: "Aragonese",
    ar: "Arabic",
    "ar-ae": "Arabic (U.A.E.)",
    "ar-bh": "Arabic (Bahrain)",
    "ar-dz": "Arabic (Algeria)",
    "ar-eg": "Arabic (Egypt)",
    "ar-iq": "Arabic (Iraq)",
    "ar-jo": "Arabic (Jordan)",
    "ar-kw": "Arabic (Kuwait)",
    "ar-lb": "Arabic (Lebanon)",
    "ar-ly": "Arabic (Libya)",
    "ar-ma": "Arabic (Morocco)",
    "ar-om": "Arabic (Oman)",
    "ar-qa": "Arabic (Qatar)",
    "ar-sa": "Arabic (Saudi Arabia)",
    "ar-sy": "Arabic (Syria)",
    "ar-tn": "Arabic (Tunisia)",
    "ar-ye": "Arabic (Yemen)",
    as: "Assamese",
    av: "Avaric",
    ay: "Aymara",
    az: "Azeri",
    ba: "Bashkir",
    be: "Belarusian",
    bg: "Bulgarian",
    bh: "Bihari",
    bi: "Bislama",
    bm: "Bambara",
    bn: "Bengali",
    bo: "Tibetan",
    br: "Breton",
    bs: "Bosnian",
    ca: "Catalan",
    ce: "Chechen",
    ch: "Chamorro",
    co: "Corsican",
    cr: "Cree",
    cs: "Czech",
    cu: "Church Slavonic",
    cv: "Chuvash",
    cy: "Welsh",
    da: "Danish",
    de: "German",
    "de-at": "German (Austria)",
    "de-ch": "German (Switzerland)",
    "de-de": "German (Germany)",
    "de-li": "German (Liechtenstein)",
    "de-lu": "German (Luxembourg)",
    div: "Divehi",
    dv: "Divehi",
    dz: "Bhutani",
    ee: "Ewe",
    el: "Greek",
    en: "English",
    "en-au": "English (Australia)",
    "en-bz": "English (Belize)",
    "en-ca": "English (Canada)",
    "en-cb": "English (Caribbean)",
    "en-gb": "English (United Kingdom)",
    "en-ie": "English (Ireland)",
    "en-jm": "English (Jamaica)",
    "en-nz": "English (New Zealand)",
    "en-ph": "English (Philippines)",
    "en-tt": "English (Trinidad and Tobago)",
    "en-us": "English (United States)",
    "en-za": "English (South Africa)",
    "en-zw": "English (Zimbabwe)",
    eo: "Esperanto",
    es: "Spanish",
    "es-ar": "Spanish (Argentina)",
    "es-bo": "Spanish (Bolivia)",
    "es-cl": "Spanish (Chile)",
    "es-co": "Spanish (Colombia)",
    "es-cr": "Spanish (Costa Rica)",
    "es-do": "Spanish (Dominican Republic)",
    "es-ec": "Spanish (Ecuador)",
    "es-es": "Spanish (Spain)",
    "es-gt": "Spanish (Guatemala)",
    "es-hn": "Spanish (Honduras)",
    "es-mx": "Spanish (Mexico)",
    "es-ni": "Spanish (Nicaragua)",
    "es-pa": "Spanish (Panama)",
    "es-pe": "Spanish (Peru)",
    "es-pr": "Spanish (Puerto Rico)",
    "es-py": "Spanish (Paraguay)",
    "es-sv": "Spanish (El Salvador)",
    "es-us": "Spanish (United States)",
    "es-uy": "Spanish (Uruguay)",
    "es-ve": "Spanish (Venezuela)",
    et: "Estonian",
    eu: "Basque",
    fa: "Farsi",
    ff: "Fulah",
    fi: "Finnish",
    fj: "Fiji",
    fo: "Faroese",
    fr: "French",
    "fr-be": "French (Belgium)",
    "fr-ca": "French (Canada)",
    "fr-ch": "French (Switzerland)",
    "fr-fr": "French (France)",
    "fr-lu": "French (Luxembourg)",
    "fr-mc": "French (Monaco)",
    fy: "Frisian",
    ga: "Irish",
    gd: "Gaelic",
    gl: "Galician",
    gn: "Guarani",
    gu: "Gujarati",
    gv: "Manx",
    ha: "Hausa",
    he: "Hebrew",
    hi: "Hindi",
    ho: "Hiri Motu",
    hr: "Croatian",
    "hr-ba": "Croatian (Bosnia and Herzegovina)",
    "hr-hr": "Croatian (Croatia)",
    ht: "Haitian",
    hu: "Hungarian",
    hy: "Armenian",
    hz: "Herero",
    ia: "Interlingua",
    id: "Indonesian",
    ie: "Interlingue",
    ig: "Igbo",
    ii: "Sichuan Yi",
    ik: "Inupiak",
    in: "Indonesian",
    io: "Ido",
    is: "Icelandic",
    it: "Italian",
    "it-ch": "Italian (Switzerland)",
    "it-it": "Italian (Italy)",
    iu: "Inuktitut",
    iw: "Hebrew",
    ja: "Japanese",
    ji: "Yiddish",
    jv: "Javanese",
    jw: "Javanese",
    ka: "Georgian",
    kg: "Kongo",
    ki: "Kikuyu",
    kj: "Kuanyama",
    kk: "Kazakh",
    kl: "Greenlandic",
    km: "Cambodian",
    kn: "Kannada",
    ko: "Korean",
    kok: "Konkani",
    kr: "Kanuri",
    ks: "Kashmiri",
    ku: "Kurdish",
    kv: "Komi",
    kw: "Cornish",
    ky: "Kirghiz",
    kz: "Kyrgyz",
    la: "Latin",
    lb: "Luxembourgish",
    lg: "Ganda",
    li: "Limburgan",
    ln: "Lingala",
    lo: "Laothian",
    ls: "Slovenian",
    lt: "Lithuanian",
    lu: "Luba-Katanga",
    lv: "Latvian",
    mg: "Malagasy",
    mh: "Marshallese",
    mi: "Maori",
    mk: "FYRO Macedonian",
    ml: "Malayalam",
    mn: "Mongolian",
    mo: "Moldavian",
    mr: "Marathi",
    ms: "Malay",
    "ms-bn": "Malay (Brunei Darussalam)",
    "ms-my": "Malay (Malaysia)",
    mt: "Maltese",
    my: "Burmese",
    na: "Nauru",
    nb: "Norwegian (Bokmal)",
    nd: "North Ndebele",
    ne: "Nepali (India)",
    ng: "Ndonga",
    nl: "Dutch",
    "nl-be": "Dutch (Belgium)",
    "nl-nl": "Dutch (Netherlands)",
    nn: "Norwegian (Nynorsk)",
    no: "Norwegian",
    nr: "South Ndebele",
    ns: "Northern Sotho",
    nv: "Navajo",
    ny: "Chichewa",
    oc: "Occitan",
    oj: "Ojibwa",
    om: "(Afan)/Oromoor/Oriya",
    or: "Oriya",
    os: "Ossetian",
    pa: "Punjabi",
    pi: "Pali",
    pl: "Polish",
    ps: "Pashto/Pushto",
    pt: "Portuguese",
    "pt-br": "Portuguese (Brazil)",
    "pt-pt": "Portuguese (Portugal)",
    qu: "Quechua",
    "qu-bo": "Quechua (Bolivia)",
    "qu-ec": "Quechua (Ecuador)",
    "qu-pe": "Quechua (Peru)",
    rm: "Rhaeto-Romanic",
    rn: "Kirundi",
    ro: "Romanian",
    ru: "Russian",
    rw: "Kinyarwanda",
    sa: "Sanskrit",
    sb: "Sorbian",
    sc: "Sardinian",
    sd: "Sindhi",
    se: "Sami",
    "se-fi": "Sami (Finland)",
    "se-no": "Sami (Norway)",
    "se-se": "Sami (Sweden)",
    sg: "Sangro",
    sh: "Serbo-Croatian",
    si: "Singhalese",
    sk: "Slovak",
    sl: "Slovenian",
    sm: "Samoan",
    sn: "Shona",
    so: "Somali",
    sq: "Albanian",
    sr: "Serbian",
    "sr-ba": "Serbian (Bosnia and Herzegovina)",
    "sr-sp": "Serbian (Serbia and Montenegro)",
    ss: "Siswati",
    st: "Sesotho",
    su: "Sundanese",
    sv: "Swedish",
    "sv-fi": "Swedish (Finland)",
    "sv-se": "Swedish (Sweden)",
    sw: "Swahili",
    sx: "Sutu",
    syr: "Syriac",
    ta: "Tamil",
    te: "Telugu",
    tg: "Tajik",
    th: "Thai",
    ti: "Tigrinya",
    tk: "Turkmen",
    tl: "Tagalog",
    tn: "Tswana",
    to: "Tonga",
    tr: "Turkish",
    ts: "Tsonga",
    tt: "Tatar",
    tw: "Twi",
    ty: "Tahitian",
    ug: "Uighur",
    uk: "Ukrainian",
    ur: "Urdu",
    us: "English",
    uz: "Uzbek",
    ve: "Venda",
    vi: "Vietnamese",
    vo: "Volapuk",
    wa: "Walloon",
    wo: "Wolof",
    xh: "Xhosa",
    yi: "Yiddish",
    yo: "Yoruba",
    za: "Zhuang",
    zh: "Chinese",
    "zh-cn": "Chinese (China)",
    "zh-hk": "Chinese (Hong Kong SAR)",
    "zh-mo": "Chinese (Macau SAR)",
    "zh-sg": "Chinese (Singapore)",
    "zh-tw": "Chinese (Taiwan)",
    zu: "Zulu",
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
        case "FIXED_LINE":
        case "MOBILE":
        case undefined:
            return true;
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
