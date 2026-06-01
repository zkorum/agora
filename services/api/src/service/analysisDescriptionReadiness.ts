import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";

type AiDescriptionLocaleStatus = "pending" | "ready" | "fallback";

export interface AnalysisDescriptionReadiness {
    requestedLocale: SupportedDisplayLanguageCodes;
    english: {
        expected: boolean;
        status: AiDescriptionLocaleStatus | null;
    };
    requested: {
        expected: boolean;
        status: AiDescriptionLocaleStatus | null;
    };
}

export interface AnalysisDescriptionReadinessInput {
    aiLabelingEnabled: boolean;
    requestedLocale: SupportedDisplayLanguageCodes;
    englishStatus: AiDescriptionLocaleStatus | null;
    englishExpected: boolean | null;
    requestedStatus: AiDescriptionLocaleStatus | null;
    requestedExpected: boolean | null;
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
    const english = {
        expected: aiLabelingEnabled && englishExpected === true,
        status: englishStatus,
    };
    const requested = {
        expected:
            aiLabelingEnabled &&
            requestedLocale !== "en" &&
            requestedExpected === true,
        status: requestedLocale === "en" ? englishStatus : requestedStatus,
    };

    return {
        requestedLocale,
        english,
        requested,
    };
}

export function shouldUseSystemDescriptions(
    input: AnalysisDescriptionReadinessInput,
): boolean {
    if (!input.aiLabelingEnabled) {
        return false;
    }

    if (input.englishExpected === true) {
        return isDisplayableStatus(input.englishStatus);
    }

    return true;
}
