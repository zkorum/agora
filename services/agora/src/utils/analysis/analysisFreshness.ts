import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  AnalysisFreshnessRequest,
  GroupDescriptionDisplay,
  SSEConversationAnalysisUpdatedData,
} from "src/shared/types/dto";
import type { AnalysisData } from "src/utils/api/comment/comment";

export const LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS = 2_000;

function isDisplayedLocaleFresh({
  display,
  locale,
}: {
  display: GroupDescriptionDisplay | undefined;
  locale: SupportedDisplayLanguageCodes;
}): boolean {
  if (display?.displayedLocale === null || display?.displayedLocale === undefined) {
    return false;
  }

  if (locale === "en") {
    return true;
  }

  return display.displayedLocale === locale;
}

export function getPendingDescriptionLocales({
  analysis,
  expectedDescriptionLocales,
}: {
  analysis: AnalysisData | undefined;
  expectedDescriptionLocales: SupportedDisplayLanguageCodes[];
}): SupportedDisplayLanguageCodes[] {
  if (analysis?.manifest?.aiLabelsExpected !== true) {
    return [];
  }

  return expectedDescriptionLocales.filter(
    (locale) =>
      !isDisplayedLocaleFresh({
        display: analysis.groupDescriptionDisplay,
        locale,
      })
  );
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

  return (
    getPendingDescriptionLocales({ analysis, expectedDescriptionLocales })
      .length === 0
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
  const locales = getPendingDescriptionLocales({
    analysis: previousAnalysis,
    expectedDescriptionLocales,
  });

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
  _analysis: AnalysisData | undefined
): boolean {
  return false;
}

export function shouldRetryAnalysisData(
  _analysis: AnalysisData | undefined
): boolean {
  return false;
}
