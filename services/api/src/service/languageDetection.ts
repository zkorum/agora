import type { DetectedLanguageResult } from "@/shared-backend/translate.js";
import { log } from "@/app.js";
import { OpenCC } from "opencc";
import {
    parseDetectedSourceLanguageOrUndefined,
    ZodSupportedDisplayLanguageCodes,
    type DetectedSourceLanguageCode,
    type NormalizedLanguageCodes,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";

export const LINGUA_MINIMUM_RELATIVE_DISTANCE = 0.2;
export const LINGUA_MINIMUM_LANGUAGE_CONFIDENCE = 0.4;
export const GOOGLE_MINIMUM_LANGUAGE_CONFIDENCE = 0.5;
export const HIGH_GLOBAL_LANGUAGE_CONFIDENCE = 0.55;
export const MINIMUM_HINT_LANGUAGE_CONFIDENCE = 0.5;
export const MINIMUM_HINT_WITHOUT_GLOBAL_LANGUAGE_CONFIDENCE = 0.55;
export const MINIMUM_HINT_CONFIDENCE_MARGIN = 0.15;
export const HINT_CAN_OVERRIDE_GLOBAL_CONFIDENCE_DELTA = 0.1;
export const MANUAL_MAIN_LANGUAGE_HINT_WEIGHT = 0.08;
export const AUTO_MAIN_LANGUAGE_HINT_WEIGHT = 0.04;
export const ADDITIONAL_LANGUAGE_HINT_WEIGHT = 0;

const CYRILLIC_LETTER_REGEX = /\p{Script=Cyrillic}/u;
const LETTER_REGEX = /\p{Letter}/u;
const MEANINGFUL_CYRILLIC_LETTER_COUNT = 12;
const MEANINGFUL_CYRILLIC_LETTER_RATIO = 0.4;

let simplifiedToTraditionalConverter: OpenCC | undefined;
let traditionalToSimplifiedConverter: OpenCC | undefined;

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
] satisfies readonly (readonly [string, NormalizedLanguageCodes])[];

const LINGUA_LANGUAGE_TO_SOURCE_CODE: ReadonlyMap<
    string,
    NormalizedLanguageCodes
> = new Map(LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES);

const SOURCE_CODE_TO_LINGUA_LANGUAGE: ReadonlyMap<string, string> = new Map([
    ...LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES.map(
        ([languageName, sourceCode]) => [sourceCode, languageName] as const,
    ),
    ["zh-Hans", "Chinese"],
    ["zh-Hant", "Chinese"],
]);

export interface LocalLanguageDetection {
    rawLanguageCode: string;
    confidence: number | null;
}

export interface LocalLanguageDetector {
    detect: ({ text }: { text: string }) => Promise<
        LocalLanguageDetection | undefined
    >;
    computeLanguageConfidence?: ({
        text,
        rawLanguageCode,
    }: {
        text: string;
        rawLanguageCode: string;
    }) => Promise<number | null>;
}

export type GoogleLanguageDetector = ({
    text,
}: {
    text: string;
}) => Promise<DetectedLanguageResult | undefined>;

export type LanguageDetectionProvider = "lingua" | "google_translate";

export interface LanguageDetectionResult {
    languageCode: SupportedDisplayLanguageCodes | null;
    sourceLanguageCode: DetectedSourceLanguageCode | null;
    rawLanguageCode: string;
    provider: LanguageDetectionProvider;
    confidence: number | null;
}

export interface LanguageDetectionOutcome {
    result: LanguageDetectionResult | undefined;
    cacheable: boolean;
}

export interface LanguageDetectionHint {
    languageCode: string;
    weight: number;
}
export type LanguageDetectionHintInput = string | LanguageDetectionHint;

interface HintedLanguageDetectionResult {
    result: LanguageDetectionResult;
    score: number;
}

export interface HintedLanguageDetectionResolution {
    result: LanguageDetectionResult | undefined;
    reason:
        | "strong_global"
        | "global_same_as_hint"
        | "hint_overrode_global"
        | "weak_global"
        | "hint_without_global"
        | "unknown";
}

interface GoogleLanguageDetectionAttempt {
    status: "success" | "failed";
    result: DetectedLanguageResult | undefined;
}

interface LocalLanguageDetectionPolicy {
    allowLocalDetection: boolean;
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

export function localLanguageDetectionPolicyForText({
    text,
}: {
    text: string;
}): LocalLanguageDetectionPolicy {
    return {
        allowLocalDetection: !hasMeaningfulCyrillicText({ text }),
    };
}

export function inferChineseScriptLanguage({
    text,
}: {
    text: string;
}): SupportedDisplayLanguageCodes | undefined {
    try {
        simplifiedToTraditionalConverter ??= new OpenCC("s2t.json");
        traditionalToSimplifiedConverter ??= new OpenCC("t2s.json");
        const traditionalText = simplifiedToTraditionalConverter.convertSync(text);
        const simplifiedText = traditionalToSimplifiedConverter.convertSync(text);
        const simplifiedChangeCount = countCodepointChanges({
            before: text,
            after: traditionalText,
        });
        const traditionalChangeCount = countCodepointChanges({
            before: text,
            after: simplifiedText,
        });

        if (traditionalChangeCount > simplifiedChangeCount) {
            return "zh-Hant";
        }
        if (simplifiedChangeCount > traditionalChangeCount) {
            return "zh-Hans";
        }
        return undefined;
    } catch (error) {
        log.warn(error, "[Language Detection] OpenCC Chinese script inference failed");
        return undefined;
    }
}

function countCodepointChanges({
    before,
    after,
}: {
    before: string;
    after: string;
}): number {
    const beforeCodepoints = Array.from(before);
    const afterCodepoints = Array.from(after);
    const length = Math.max(beforeCodepoints.length, afterCodepoints.length);
    let changeCount = 0;
    for (let index = 0; index < length; index += 1) {
        if (beforeCodepoints[index] !== afterCodepoints[index]) {
            changeCount += 1;
        }
    }
    return changeCount;
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

    return inferChineseScriptLanguage({ text }) ?? "zh-Hans";
}

function normalizeBcp47SourceLanguageCode({
    rawLanguageCode,
}: {
    rawLanguageCode: string;
}): DetectedSourceLanguageCode | null {
    const trimmedLanguageCode = rawLanguageCode.trim();
    if (trimmedLanguageCode.length === 0) {
        return null;
    }

    return parseDetectedSourceLanguageOrUndefined(trimmedLanguageCode) ?? null;
}

function normalizeSourceLanguageCodeFromProvider({
    provider,
    rawLanguageCode,
    text,
}: {
    provider: LanguageDetectionProvider;
    rawLanguageCode: string;
    text: string;
}): DetectedSourceLanguageCode | null {
    if (provider === "lingua") {
        if (rawLanguageCode === "Chinese" || rawLanguageCode.startsWith("zh")) {
            return normalizeChineseLanguageCode({ rawLanguageCode, text });
        }

        const linguaSourceCode = LINGUA_LANGUAGE_TO_SOURCE_CODE.get(rawLanguageCode);
        if (linguaSourceCode !== undefined) {
            return linguaSourceCode;
        }
    }

    if (rawLanguageCode === "Chinese" || rawLanguageCode.startsWith("zh")) {
        return normalizeChineseLanguageCode({ rawLanguageCode, text });
    }

    const canonicalLanguageCode = canonicalizeLanguageCode({ rawLanguageCode });
    return normalizeBcp47SourceLanguageCode({
        rawLanguageCode: canonicalLanguageCode,
    });
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
    provider,
    rawLanguageCode,
    text,
}: {
    provider: LanguageDetectionProvider;
    rawLanguageCode: string;
    text: string;
}): DetectedSourceLanguageCode | null {
    return normalizeSourceLanguageCodeFromProvider({
        provider,
        rawLanguageCode,
        text,
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

function languageDetectionConfidenceValue({
    detection,
}: {
    detection: Pick<LanguageDetectionResult, "confidence">;
}): number {
    return detection.confidence ?? 0;
}

function getBestHintedDetections({
    hintedResults,
}: {
    hintedResults: HintedLanguageDetectionResult[];
}): {
    bestHint: HintedLanguageDetectionResult | undefined;
    secondBestHint: HintedLanguageDetectionResult | undefined;
} {
    const sortedHints = hintedResults
        .filter((hint) => hint.result.sourceLanguageCode !== null)
        .toSorted((left, right) => right.score - left.score);
    return {
        bestHint: sortedHints.at(0),
        secondBestHint: sortedHints.at(1),
    };
}

function normalizeLanguageDetectionHint({
    hint,
}: {
    hint: LanguageDetectionHintInput;
}): LanguageDetectionHint {
    if (typeof hint === "string") {
        return { languageCode: hint, weight: 0 };
    }
    return hint;
}

function hintHasEnoughMargin({
    bestHint,
    secondBestHint,
}: {
    bestHint: HintedLanguageDetectionResult;
    secondBestHint: HintedLanguageDetectionResult | undefined;
}): boolean {
    if (secondBestHint === undefined) {
        return true;
    }
    return (
        bestHint.score - secondBestHint.score >= MINIMUM_HINT_CONFIDENCE_MARGIN
    );
}

export function resolveHintedLanguageDetection({
    globalResult,
    hintedResults,
}: {
    globalResult: LanguageDetectionResult | undefined;
    hintedResults: (LanguageDetectionResult | HintedLanguageDetectionResult)[];
}): HintedLanguageDetectionResolution {
    const knownGlobalResult =
        globalResult?.sourceLanguageCode === null ? undefined : globalResult;
    const weightedHintedResults: HintedLanguageDetectionResult[] =
        hintedResults.map((hint) =>
            "result" in hint
                ? hint
                : {
                      result: hint,
                      score: languageDetectionConfidenceValue({ detection: hint }),
                  },
        );
    const { bestHint, secondBestHint } = getBestHintedDetections({
        hintedResults: weightedHintedResults,
    });

    if (knownGlobalResult !== undefined) {
        const globalConfidence = languageDetectionConfidenceValue({
            detection: knownGlobalResult,
        });
        if (globalConfidence >= HIGH_GLOBAL_LANGUAGE_CONFIDENCE) {
            return { result: knownGlobalResult, reason: "strong_global" };
        }

        if (bestHint?.result.sourceLanguageCode === knownGlobalResult.sourceLanguageCode) {
            return { result: knownGlobalResult, reason: "global_same_as_hint" };
        }

        if (
            bestHint !== undefined &&
            languageDetectionConfidenceValue({ detection: bestHint.result }) >=
                MINIMUM_HINT_LANGUAGE_CONFIDENCE &&
            hintHasEnoughMargin({ bestHint, secondBestHint }) &&
            bestHint.score >=
                globalConfidence - HINT_CAN_OVERRIDE_GLOBAL_CONFIDENCE_DELTA
        ) {
            return { result: bestHint.result, reason: "hint_overrode_global" };
        }

        return { result: knownGlobalResult, reason: "weak_global" };
    }

    if (
        bestHint !== undefined &&
        languageDetectionConfidenceValue({ detection: bestHint.result }) >=
            MINIMUM_HINT_WITHOUT_GLOBAL_LANGUAGE_CONFIDENCE &&
        hintHasEnoughMargin({ bestHint, secondBestHint })
    ) {
        return { result: bestHint.result, reason: "hint_without_global" };
    }

    return { result: globalResult, reason: "unknown" };
}

function shouldWarnUnnormalizedLanguage({
    rawLanguageCode,
    sourceLanguageCode,
}: {
    rawLanguageCode: string;
    sourceLanguageCode: DetectedSourceLanguageCode | null;
}): boolean {
    if (sourceLanguageCode !== null) {
        return false;
    }
    if (rawLanguageCode === "Chinese" || rawLanguageCode.startsWith("zh")) {
        return false;
    }
    return !/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(rawLanguageCode);
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
              provider: "lingua",
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
                  provider: "google_translate",
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
            provider: "google_translate",
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
        provider: "google_translate",
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
                computeLanguageConfidence: ({ text, rawLanguageCode }) =>
                    Promise.resolve(
                        detector.computeLanguageConfidence(text, rawLanguageCode),
                    ),
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

async function computeHintedLocalDetectionResults({
    text,
    localDetector,
    languageHints,
}: {
    text: string;
    localDetector: LocalLanguageDetector;
    languageHints: readonly LanguageDetectionHintInput[];
}): Promise<HintedLanguageDetectionResult[]> {
    if (localDetector.computeLanguageConfidence === undefined) {
        return [];
    }
    const hintedResults: HintedLanguageDetectionResult[] = [];
    const seenRawLanguageCodes = new Set<string>();
    for (const rawLanguageHint of languageHints) {
        const languageHint = normalizeLanguageDetectionHint({
            hint: rawLanguageHint,
        });
        const rawLanguageCode = SOURCE_CODE_TO_LINGUA_LANGUAGE.get(
            languageHint.languageCode,
        );
        if (
            rawLanguageCode === undefined ||
            seenRawLanguageCodes.has(rawLanguageCode)
        ) {
            continue;
        }
        seenRawLanguageCodes.add(rawLanguageCode);
        const confidence = await localDetector.computeLanguageConfidence({
            text,
            rawLanguageCode,
        });
        const result = normalizeLocalDetection({
            detection: { rawLanguageCode, confidence },
            text,
        });
        hintedResults.push({
            result,
            score:
                languageDetectionConfidenceValue({ detection: result }) +
                languageHint.weight,
        });
    }
    return hintedResults;
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
    googleText,
    languageHints = [],
    localDetector,
    googleDetector,
}: {
    text: string;
    googleText?: string;
    languageHints?: readonly LanguageDetectionHintInput[];
    localDetector?: LocalLanguageDetector;
    googleDetector?: GoogleLanguageDetector;
}): Promise<LanguageDetectionOutcome> {
    const localDetectionPolicy = localLanguageDetectionPolicyForText({ text });
    if (!localDetectionPolicy.allowLocalDetection) {
        if (googleDetector === undefined) {
            return { result: undefined, cacheable: false };
        }
        return googleAttemptToOutcome({
            attempt: await detectWithGoogle({
                googleDetector,
                text: googleText ?? text,
            }),
            text: googleText ?? text,
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
    const hintedResults = await computeHintedLocalDetectionResults({
        text,
        localDetector: resolvedLocalDetector,
        languageHints,
    });
    const hintedResolution = resolveHintedLanguageDetection({
        globalResult: localResult,
        hintedResults,
    });

    if (
        hintedResolution.result?.sourceLanguageCode !== undefined &&
        hintedResolution.result.sourceLanguageCode !== null
    ) {
        return { result: hintedResolution.result, cacheable: true };
    }

    if (googleDetector === undefined) {
        return { result: hintedResolution.result, cacheable: true };
    }

    const googleOutcome = googleAttemptToOutcome({
        attempt: await detectWithGoogle({
            googleDetector,
            text: googleText ?? text,
        }),
        text: googleText ?? text,
    });
    if (googleOutcome.result !== undefined || !googleOutcome.cacheable) {
        return googleOutcome;
    }

    return { result: localResult, cacheable: true };
}
