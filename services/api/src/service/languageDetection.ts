import type { DetectedLanguageResult } from "@/shared-backend/translate.js";
import { log } from "@/app.js";
import {
    parseNormalizedLanguageOrUndefined,
    ZodSupportedDisplayLanguageCodes,
    type NormalizedLanguageCodes,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";

export const LINGUA_MINIMUM_RELATIVE_DISTANCE = 0.2;
export const LINGUA_MINIMUM_LANGUAGE_CONFIDENCE = 0.4;
export const GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE = 0.5;

const CYRILLIC_LETTER_REGEX = /\p{Script=Cyrillic}/u;
const LETTER_REGEX = /\p{Letter}/u;
const MEANINGFUL_CYRILLIC_LETTER_COUNT = 12;
const MEANINGFUL_CYRILLIC_LETTER_RATIO = 0.4;

const TRADITIONAL_CHINESE_HINTS =
    "學國臺體後發為與會個們來時說對過還開關問題點網實廣東車書長門風電見聽買賣這裡區歲數應變雙無處氣雲";
const SIMPLIFIED_CHINESE_HINTS =
    "学国台体后发为与会个们来时说对过还开关问题点网实广东车书长门风电见听买卖这里区岁数应变双无处气云";

const LINGUA_LANGUAGE_TO_DISPLAY_CODE: ReadonlyMap<
    string,
    SupportedDisplayLanguageCodes
> = new Map([
    ["Arabic", "ar"],
    ["English", "en"],
    ["French", "fr"],
    ["Hebrew", "he"],
    ["Japanese", "ja"],
    ["Persian", "fa"],
    ["Russian", "ru"],
    ["Spanish", "es"],
]);

export const LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES = [
    ["Afrikaans", "af"],
    ["Albanian", "sq"],
    ["Arabic", "ar"],
    ["Armenian", "hy"],
    ["Azerbaijani", "az"],
    ["Basque", "eu"],
    ["Belarusian", "be"],
    ["Bengali", "bn"],
    ["Bokmal", "nb"],
    ["Bosnian", "bs"],
    ["Bulgarian", "bg"],
    ["Catalan", "ca"],
    ["Croatian", "hr"],
    ["Czech", "cs"],
    ["Danish", "da"],
    ["Dutch", "nl"],
    ["English", "en"],
    ["Esperanto", "eo"],
    ["Estonian", "et"],
    ["Finnish", "fi"],
    ["French", "fr"],
    ["Ganda", "lg"],
    ["Georgian", "ka"],
    ["German", "de"],
    ["Greek", "el"],
    ["Gujarati", "gu"],
    ["Hebrew", "he"],
    ["Hindi", "hi"],
    ["Hungarian", "hu"],
    ["Icelandic", "is"],
    ["Indonesian", "id"],
    ["Irish", "ga"],
    ["Italian", "it"],
    ["Japanese", "ja"],
    ["Kazakh", "kk"],
    ["Korean", "ko"],
    ["Latin", "la"],
    ["Latvian", "lv"],
    ["Lithuanian", "lt"],
    ["Macedonian", "mk"],
    ["Malay", "ms"],
    ["Maori", "mi"],
    ["Marathi", "mr"],
    ["Mongolian", "mn"],
    ["Nynorsk", "nn"],
    ["Persian", "fa"],
    ["Polish", "pl"],
    ["Portuguese", "pt"],
    ["Punjabi", "pa"],
    ["Romanian", "ro"],
    ["Russian", "ru"],
    ["Serbian", "sr"],
    ["Shona", "sn"],
    ["Slovak", "sk"],
    ["Slovene", "sl"],
    ["Somali", "so"],
    ["Sotho", "st"],
    ["Spanish", "es"],
    ["Swahili", "sw"],
    ["Swedish", "sv"],
    ["Tagalog", "fil"],
    ["Tamil", "ta"],
    ["Telugu", "te"],
    ["Thai", "th"],
    ["Tsonga", "ts"],
    ["Tswana", "tn"],
    ["Turkish", "tr"],
    ["Ukrainian", "uk"],
    ["Urdu", "ur"],
    ["Vietnamese", "vi"],
    ["Welsh", "cy"],
    ["Xhosa", "xh"],
    ["Yoruba", "yo"],
    ["Zulu", "zu"],
] satisfies ReadonlyArray<readonly [string, NormalizedLanguageCodes]>;

const LINGUA_LANGUAGE_TO_SOURCE_CODE: ReadonlyMap<
    string,
    NormalizedLanguageCodes
> = new Map(LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES);

export interface LocalLanguageDetection {
    rawLanguageCode: string;
    confidence: number | null;
}

export interface LocalLanguageDetector {
    detect: ({ text }: { text: string }) => Promise<
        LocalLanguageDetection | undefined
    >;
}

export type GoogleLanguageDetector = ({
    text,
}: {
    text: string;
}) => Promise<DetectedLanguageResult | undefined>;

export type LanguageDetectionProvider = "lingua" | "google";

export interface LanguageDetectionResult {
    languageCode: SupportedDisplayLanguageCodes | null;
    sourceLanguageCode: NormalizedLanguageCodes | null;
    rawLanguageCode: string;
    provider: LanguageDetectionProvider;
    confidence: number | null;
}

export interface LanguageDetectionOutcome {
    result: LanguageDetectionResult | undefined;
    cacheable: boolean;
}

interface GoogleLanguageDetectionAttempt {
    status: "success" | "failed";
    result: DetectedLanguageResult | undefined;
}

let defaultLocalDetectorPromise:
    | Promise<LocalLanguageDetector | undefined>
    | undefined;

export function hasMeaningfulCyrillicText({ text }: { text: string }): boolean {
    let cyrillicLetters = 0;
    let letters = 0;

    for (const character of text) {
        if (LETTER_REGEX.test(character)) {
            letters += 1;
        }
        if (CYRILLIC_LETTER_REGEX.test(character)) {
            cyrillicLetters += 1;
        }
    }

    return (
        cyrillicLetters >= MEANINGFUL_CYRILLIC_LETTER_COUNT &&
        letters > 0 &&
        cyrillicLetters / letters >= MEANINGFUL_CYRILLIC_LETTER_RATIO
    );
}

export function inferChineseScriptLanguage({
    text,
}: {
    text: string;
}): SupportedDisplayLanguageCodes | undefined {
    let traditionalHints = 0;
    let simplifiedHints = 0;

    for (const character of text) {
        if (TRADITIONAL_CHINESE_HINTS.includes(character)) {
            traditionalHints += 1;
        }
        if (SIMPLIFIED_CHINESE_HINTS.includes(character)) {
            simplifiedHints += 1;
        }
    }

    if (traditionalHints > simplifiedHints) {
        return "zh-Hant";
    }
    if (simplifiedHints > traditionalHints) {
        return "zh-Hans";
    }
    return undefined;
}

function canonicalizeLanguageCode({
    rawLanguageCode,
}: {
    rawLanguageCode: string;
}): string {
    try {
        return Intl.getCanonicalLocales(rawLanguageCode)[0] ?? rawLanguageCode;
    } catch {
        return rawLanguageCode;
    }
}

function parseSupportedDisplayCode({
    languageCode,
}: {
    languageCode: string;
}): SupportedDisplayLanguageCodes | undefined {
    const exactMatch = ZodSupportedDisplayLanguageCodes.safeParse(languageCode);
    if (exactMatch.success) {
        return exactMatch.data;
    }

    const primaryLanguageCode = languageCode.split("-")[0];
    const primaryMatch =
        ZodSupportedDisplayLanguageCodes.safeParse(primaryLanguageCode);
    if (primaryMatch.success) {
        return primaryMatch.data;
    }

    return undefined;
}

function normalizeChineseLanguageCode({
    rawLanguageCode,
    text,
}: {
    rawLanguageCode: string;
    text: string;
}): SupportedDisplayLanguageCodes | null {
    const canonicalLanguageCode = canonicalizeLanguageCode({ rawLanguageCode });
    if (
        canonicalLanguageCode === "zh-Hant" ||
        canonicalLanguageCode === "zh-TW" ||
        canonicalLanguageCode === "zh-HK" ||
        canonicalLanguageCode === "zh-MO"
    ) {
        return "zh-Hant";
    }
    if (
        canonicalLanguageCode === "zh-Hans" ||
        canonicalLanguageCode === "zh-CN" ||
        canonicalLanguageCode === "zh-SG"
    ) {
        return "zh-Hans";
    }

    return inferChineseScriptLanguage({ text }) ?? null;
}

function normalizeBcp47SourceLanguageCode({
    rawLanguageCode,
}: {
    rawLanguageCode: string;
}): NormalizedLanguageCodes | null {
    const trimmedLanguageCode = rawLanguageCode.trim();
    if (trimmedLanguageCode.length === 0) {
        return null;
    }

    try {
        const canonicalLanguageCode =
            Intl.getCanonicalLocales(trimmedLanguageCode)[0] ?? null;
        return canonicalLanguageCode === null
            ? null
            : (parseNormalizedLanguageOrUndefined(canonicalLanguageCode) ?? null);
    } catch {
        if (/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(trimmedLanguageCode)) {
            return (
                parseNormalizedLanguageOrUndefined(trimmedLanguageCode.toLowerCase()) ??
                null
            );
        }
        return null;
    }
}

function normalizeDetectedLanguageCode({
    rawLanguageCode,
    text,
}: {
    rawLanguageCode: string;
    text: string;
}): SupportedDisplayLanguageCodes | null {
    if (rawLanguageCode === "Chinese" || rawLanguageCode.startsWith("zh")) {
        return normalizeChineseLanguageCode({ rawLanguageCode, text });
    }

    const linguaDisplayCode = LINGUA_LANGUAGE_TO_DISPLAY_CODE.get(rawLanguageCode);
    if (linguaDisplayCode !== undefined) {
        return linguaDisplayCode;
    }

    const canonicalLanguageCode = canonicalizeLanguageCode({ rawLanguageCode });
    return parseSupportedDisplayCode({ languageCode: canonicalLanguageCode }) ?? null;
}

function normalizeDetectedSourceLanguageCode({
    rawLanguageCode,
    text,
}: {
    rawLanguageCode: string;
    text: string;
}): NormalizedLanguageCodes | null {
    if (rawLanguageCode === "Chinese" || rawLanguageCode.startsWith("zh")) {
        return normalizeChineseLanguageCode({ rawLanguageCode, text });
    }

    const linguaSourceCode = LINGUA_LANGUAGE_TO_SOURCE_CODE.get(rawLanguageCode);
    if (linguaSourceCode !== undefined) {
        return linguaSourceCode;
    }

    const canonicalLanguageCode = canonicalizeLanguageCode({ rawLanguageCode });
    return normalizeBcp47SourceLanguageCode({
        rawLanguageCode: canonicalLanguageCode,
    });
}

function localDetectionHasEnoughConfidence({
    detection,
}: {
    detection: LocalLanguageDetection;
}): boolean {
    return (
        detection.confidence === null ||
        detection.confidence >= LINGUA_MINIMUM_LANGUAGE_CONFIDENCE
    );
}

function shouldWarnUnnormalizedLanguage({
    rawLanguageCode,
    sourceLanguageCode,
}: {
    rawLanguageCode: string;
    sourceLanguageCode: NormalizedLanguageCodes | null;
}): boolean {
    if (sourceLanguageCode !== null) {
        return false;
    }
    return rawLanguageCode !== "Chinese" && !rawLanguageCode.startsWith("zh");
}

function warnUnnormalizedLanguage({
    provider,
    rawLanguageCode,
    confidence,
}: {
    provider: LanguageDetectionProvider;
    rawLanguageCode: string;
    confidence: number | null;
}): void {
    log.warn(
        { provider, rawLanguageCode, confidence },
        "[LanguageDetection] Detector returned an unrecognized language code",
    );
}

function normalizeLocalDetection({
    detection,
    text,
}: {
    detection: LocalLanguageDetection;
    text: string;
}): LanguageDetectionResult {
    const sourceLanguageCode = localDetectionHasEnoughConfidence({ detection })
        ? normalizeDetectedSourceLanguageCode({
              rawLanguageCode: detection.rawLanguageCode,
              text,
          })
        : null;
    if (
        localDetectionHasEnoughConfidence({ detection }) &&
        shouldWarnUnnormalizedLanguage({
            rawLanguageCode: detection.rawLanguageCode,
            sourceLanguageCode,
        })
    ) {
        warnUnnormalizedLanguage({
            provider: "lingua",
            rawLanguageCode: detection.rawLanguageCode,
            confidence: detection.confidence,
        });
    }
    return {
        languageCode:
            sourceLanguageCode === null
                ? null
                : normalizeDetectedLanguageCode({
                      rawLanguageCode: sourceLanguageCode,
                      text,
                  }),
        sourceLanguageCode,
        rawLanguageCode: detection.rawLanguageCode,
        provider: "lingua",
        confidence: detection.confidence,
    };
}

function normalizeGoogleDetection({
    detection,
    text,
}: {
    detection: DetectedLanguageResult;
    text: string;
}): LanguageDetectionResult {
    const sourceLanguageCode =
        detection.confidence >= GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE
            ? normalizeDetectedSourceLanguageCode({
                  rawLanguageCode: detection.languageCode,
                  text,
              })
            : null;
    if (
        detection.confidence >= GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE &&
        shouldWarnUnnormalizedLanguage({
            rawLanguageCode: detection.languageCode,
            sourceLanguageCode,
        })
    ) {
        warnUnnormalizedLanguage({
            provider: "google",
            rawLanguageCode: detection.languageCode,
            confidence: detection.confidence,
        });
    }

    return {
        languageCode:
            sourceLanguageCode === null
                ? null
                : normalizeDetectedLanguageCode({
                      rawLanguageCode: sourceLanguageCode,
                      text,
                  }),
        sourceLanguageCode,
        rawLanguageCode: detection.languageCode,
        provider: "google",
        confidence: detection.confidence,
    };
}

async function getDefaultLocalDetector(): Promise<
    LocalLanguageDetector | undefined
> {
    defaultLocalDetectorPromise ??= (async () => {
        try {
            const lingua = await import("@zkorum/lingua-wasm");
            const builder = lingua.LanguageDetectorBuilder.fromAllSpokenLanguages();
            const detector = builder
                .withMinimumRelativeDistance(LINGUA_MINIMUM_RELATIVE_DISTANCE)
                .build();

            return {
                detect: ({ text }) => {
                    const rawLanguageCode = detector.detectLanguageOf(text);
                    if (rawLanguageCode === undefined) {
                        return Promise.resolve(undefined);
                    }
                    return Promise.resolve({
                        rawLanguageCode,
                        confidence: detector.computeLanguageConfidence(
                            text,
                            rawLanguageCode,
                        ),
                    });
                },
            };
        } catch {
            return undefined;
        }
    })();

    return await defaultLocalDetectorPromise;
}

async function detectWithGoogle({
    googleDetector,
    text,
}: {
    googleDetector: GoogleLanguageDetector;
    text: string;
}): Promise<GoogleLanguageDetectionAttempt> {
    try {
        return {
            status: "success",
            result: await googleDetector({ text }),
        };
    } catch {
        return {
            status: "failed",
            result: undefined,
        };
    }
}

function googleAttemptToOutcome({
    attempt,
    text,
}: {
    attempt: GoogleLanguageDetectionAttempt;
    text: string;
}): LanguageDetectionOutcome {
    if (attempt.status === "failed") {
        return { result: undefined, cacheable: false };
    }
    if (attempt.result === undefined) {
        return { result: undefined, cacheable: true };
    }
    return {
        result: normalizeGoogleDetection({ detection: attempt.result, text }),
        cacheable: true,
    };
}

export async function detectLanguageWithFallback({
    text,
    localDetector,
    googleDetector,
}: {
    text: string;
    localDetector?: LocalLanguageDetector;
    googleDetector?: GoogleLanguageDetector;
}): Promise<LanguageDetectionOutcome> {
    if (hasMeaningfulCyrillicText({ text }) && googleDetector !== undefined) {
        return googleAttemptToOutcome({
            attempt: await detectWithGoogle({ googleDetector, text }),
            text,
        });
    }

    const resolvedLocalDetector =
        localDetector ?? (await getDefaultLocalDetector());

    if (resolvedLocalDetector === undefined) {
        if (googleDetector === undefined) {
            return { result: undefined, cacheable: false };
        }
        return googleAttemptToOutcome({
            attempt: await detectWithGoogle({ googleDetector, text }),
            text,
        });
    }

    let localDetection: LocalLanguageDetection | undefined;
    try {
        localDetection = await resolvedLocalDetector.detect({ text });
    } catch {
        return { result: undefined, cacheable: false };
    }

    const localResult =
        localDetection === undefined
            ? undefined
            : normalizeLocalDetection({ detection: localDetection, text });

    if (
        localResult?.sourceLanguageCode !== undefined &&
        localResult.sourceLanguageCode !== null
    ) {
        return { result: localResult, cacheable: true };
    }

    if (googleDetector === undefined) {
        return { result: localResult, cacheable: true };
    }

    const googleOutcome = googleAttemptToOutcome({
        attempt: await detectWithGoogle({ googleDetector, text }),
        text,
    });
    if (googleOutcome.result !== undefined || !googleOutcome.cacheable) {
        return googleOutcome;
    }

    return { result: localResult, cacheable: true };
}
