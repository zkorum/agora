import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  AnalysisDescriptionReadiness,
  AnalysisFreshnessRequest,
  SSEConversationAnalysisUpdatedData,
} from "src/shared/types/dto";
import type { AnalysisData } from "src/utils/api/comment/comment";

export const LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS = 2_000;
export const DESCRIPTION_READINESS_RETRY_INTERVAL_MS = 5_000;

function isReadyDescriptionStatus(
  status: AnalysisDescriptionReadiness["english"]["status"]
): boolean {
  return status === "ready";
}

export function getPendingDescriptionLocales(
  readiness: AnalysisDescriptionReadiness | null
): SupportedDisplayLanguageCodes[] {
  if (readiness === null) {
    return [];
  }

  const locales: SupportedDisplayLanguageCodes[] = [];
  if (
    readiness.english.expected &&
    !isReadyDescriptionStatus(readiness.english.status)
  ) {
    locales.push("en");
  }

  if (
    readiness.requested.expected &&
    !isReadyDescriptionStatus(readiness.requested.status) &&
    !locales.includes(readiness.requestedLocale)
  ) {
    locales.push(readiness.requestedLocale);
  }

  return locales;
}

export function getExpectedDescriptionLocalesFromEvent({
  event,
  displayLanguage,
}: {
  event: SSEConversationAnalysisUpdatedData;
  displayLanguage: SupportedDisplayLanguageCodes;
}): SupportedDisplayLanguageCodes[] {
  if (event.changeKind !== "descriptions") {
    return [];
  }

  const locales = event.locales ?? [];
  const expectedLocales: SupportedDisplayLanguageCodes[] = [];
  if (locales.includes("en")) {
    expectedLocales.push("en");
  }

  if (locales.includes(displayLanguage) && !expectedLocales.includes(displayLanguage)) {
    expectedLocales.push(displayLanguage);
  }

  return expectedLocales;
}

export function isAnalysisFreshEnough({
  analysis,
  expectedSnapshotId,
  expectedDescriptionLocales,
}: {
  analysis: AnalysisData | undefined;
  expectedSnapshotId: number | null;
  expectedDescriptionLocales: SupportedDisplayLanguageCodes[];
}): boolean {
  if (analysis === undefined) {
    return false;
  }

  if (
    expectedSnapshotId !== null &&
    (analysis.conversationViewSnapshotId === undefined ||
      analysis.conversationViewSnapshotId < expectedSnapshotId)
  ) {
    return false;
  }

  const pendingLocales = getPendingDescriptionLocales(
    analysis.descriptionReadiness
  );
  return expectedDescriptionLocales.every(
    (locale) => !pendingLocales.includes(locale)
  );
}

export function buildAnalysisFreshnessRequest({
  previousAnalysis,
  expectedSnapshotId,
  expectedDescriptionLocales,
  enablePrimaryFallback,
}: {
  previousAnalysis: AnalysisData | undefined;
  expectedSnapshotId: number | null;
  expectedDescriptionLocales: SupportedDisplayLanguageCodes[];
  enablePrimaryFallback: boolean;
}): AnalysisFreshnessRequest | null {
  const pendingLocales = getPendingDescriptionLocales(
    previousAnalysis?.descriptionReadiness ?? null
  );
  const locales = Array.from(
    new Set([...expectedDescriptionLocales, ...pendingLocales])
  );

  if (expectedSnapshotId === null && locales.length === 0) {
    return null;
  }

  return {
    enablePrimaryFallback,
    minimumConversationViewSnapshotId: expectedSnapshotId,
    expectedDescriptionLocales: locales,
  };
}

export function shouldRetryDescriptionReadiness(
  analysis: AnalysisData | undefined
): boolean {
  return analysis?.descriptionReadiness?.shouldRetry === true;
}

export function shouldRetryAnalysisData(
  analysis: AnalysisData | undefined
): boolean {
  return (
    shouldRetryDescriptionReadiness(analysis) ||
    analysis?.contentStatus === "not_available"
  );
}
