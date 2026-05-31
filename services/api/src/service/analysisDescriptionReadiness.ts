import type { AnalysisDescriptionReadiness } from "@/shared/types/dto.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";

type AiDescriptionLocaleStatus = "pending" | "ready" | "fallback";

export interface AnalysisDescriptionReadinessInput {
    aiLabelingEnabled: boolean;
    requestedLocale: SupportedDisplayLanguageCodes;
    englishStatus: AiDescriptionLocaleStatus | null;
    englishExpected: boolean | null;
    requestedStatus: AiDescriptionLocaleStatus | null;
    requestedExpected: boolean | null;
}

function optionalStatus(
    status: AiDescriptionLocaleStatus | null,
): AiDescriptionLocaleStatus | null {
    return status;
}

function isReadyStatus(
    status: AiDescriptionLocaleStatus | null,
): boolean {
    return status === "ready" || status === "fallback";
}

function isDisplayableStatus(
    status: AiDescriptionLocaleStatus | null,
): boolean {
    return status === "ready" || status === "fallback";
}

export function buildAnalysisDescriptionReadiness({
    aiLabelingEnabled,
    requestedLocale,
    englishStatus,
    englishExpected,
    requestedStatus,
    requestedExpected,
}: AnalysisDescriptionReadinessInput): AnalysisDescriptionReadiness {
    const normalizedEnglishStatus = optionalStatus(englishStatus);
    const normalizedRequestedStatus = optionalStatus(requestedStatus);
    const english = {
        expected: aiLabelingEnabled && englishExpected === true,
        status: normalizedEnglishStatus,
    };
    const requested = {
        expected:
            aiLabelingEnabled &&
            requestedLocale !== "en" &&
            requestedExpected === true,
        status:
            requestedLocale === "en"
                ? normalizedEnglishStatus
                : normalizedRequestedStatus,
    };

    const shouldRetry =
        (english.expected && !isReadyStatus(english.status)) ||
        (requested.expected && !isReadyStatus(requested.status));

    const state: AnalysisDescriptionReadiness["state"] = (() => {
        if (!aiLabelingEnabled) {
            return "disabled";
        }

        if (
            (english.expected && english.status === "fallback") ||
            (requested.expected && requested.status === "fallback")
        ) {
            return "fallback";
        }

        if (english.expected && !isReadyStatus(english.status)) {
            return "english_pending";
        }

        if (requested.expected && !isReadyStatus(requested.status)) {
            return "requested_pending";
        }

        if (!english.expected && !requested.expected) {
            return "not_expected";
        }

        return "ready";
    })();

    return {
        requestedLocale,
        english,
        requested,
        state,
        shouldRetry,
    };
}

export function shouldUseSystemDescriptions(
    input: AnalysisDescriptionReadinessInput,
): boolean {
    if (!input.aiLabelingEnabled) {
        return false;
    }

    if (input.englishExpected === true) {
        return isDisplayableStatus(optionalStatus(input.englishStatus));
    }

    return true;
}

export function isDescriptionReadinessFreshForExpectedLocales({
    readiness,
    expectedLocales,
}: {
    readiness: AnalysisDescriptionReadiness | null;
    expectedLocales: SupportedDisplayLanguageCodes[];
}): boolean {
    if (readiness === null || expectedLocales.length === 0) {
        return true;
    }

    for (const locale of expectedLocales) {
        if (
            locale === "en" &&
            readiness.english.expected &&
            !isReadyStatus(readiness.english.status)
        ) {
            return false;
        }

        if (
            locale === readiness.requestedLocale &&
            readiness.requested.expected &&
            !isReadyStatus(readiness.requested.status)
        ) {
            return false;
        }
    }

    return true;
}
