import type { QueryClient } from "@tanstack/vue-query";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import {
  ZodSupportedDisplayLanguageCodes,
  ZodSupportedSpokenLanguageCodes,
} from "src/shared/languages";
import type {
  AnalysisFreshnessRequest,
  SSEConversationAnalysisUpdatedData,
} from "src/shared/types/dto";
import { type AnalysisView, zodAnalysisView } from "src/shared/types/zod";
import {
  buildAnalysisFreshnessRequest,
  getExpectedDescriptionLocalesFromEvent,
  isAnalysisFreshEnough,
  LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS,
} from "src/utils/analysis/analysisFreshness";
import type { AnalysisData } from "src/utils/api/comment/comment";

type QueryKey = readonly unknown[];

const DESCRIPTION_CATCH_UP_BUSY_RETRY_MS = 100;

interface LiveAnalysisQueryParams {
  conversationSlugId: string;
  analysisView: AnalysisView | undefined;
  checkpointViewSnapshotId: number | undefined;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
}

interface LiveAnalysisQueryInfo extends LiveAnalysisQueryParams {
  queryHash: string;
  queryKey: QueryKey;
  analysis: AnalysisData | undefined;
  isFetching: boolean;
}

interface LiveAnalysisCatchUpState {
  conversationSlugId: string;
  queryKey: QueryKey;
  expectedSnapshotId: number | null;
  expectedDescriptionLocales: SupportedDisplayLanguageCodes[];
  lastStartedAt: number;
  inFlight: boolean;
  timeout: ReturnType<typeof setTimeout> | undefined;
}

interface FetchLiveAnalysisParams extends LiveAnalysisQueryParams {
  freshness: AnalysisFreshnessRequest | null;
}

interface LiveAnalysisCatchUpController {
  requestCatchUp: (data: SSEConversationAnalysisUpdatedData) => void;
  clearConversation: (params: { conversationSlugId: string }) => void;
  clearAll: () => void;
}

export function isAnalysisQueryKeyForConversation({
  queryKey,
  conversationSlugId,
}: {
  queryKey: QueryKey;
  conversationSlugId: string;
}): boolean {
  return queryKey[0] === "analysis" && queryKey[1] === conversationSlugId;
}

export function isLiveAnalysisQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: QueryKey;
  conversationSlugId: string;
}): boolean {
  return (
    isAnalysisQueryKeyForConversation({ queryKey, conversationSlugId }) &&
    queryKey[3] === undefined
  );
}

function parseLiveAnalysisQueryParams({
  queryKey,
  conversationSlugId,
}: {
  queryKey: QueryKey;
  conversationSlugId: string;
}): LiveAnalysisQueryParams | undefined {
  if (!isAnalysisQueryKeyForConversation({ queryKey, conversationSlugId })) {
    return undefined;
  }

  const rawAnalysisView = queryKey[2];
  const analysisViewResult =
    rawAnalysisView === undefined
      ? { success: true, data: undefined }
      : zodAnalysisView.safeParse(rawAnalysisView);
  if (!analysisViewResult.success) {
    return undefined;
  }

  const rawCheckpointViewSnapshotId = queryKey[3];
  if (
    rawCheckpointViewSnapshotId !== undefined &&
    typeof rawCheckpointViewSnapshotId !== "number"
  ) {
    return undefined;
  }

  const rawAiLabelingEnabled = queryKey[4];
  if (
    rawAiLabelingEnabled !== undefined &&
    typeof rawAiLabelingEnabled !== "boolean"
  ) {
    return undefined;
  }

  const displayLanguageResult = ZodSupportedDisplayLanguageCodes.safeParse(
    queryKey[5]
  );
  if (!displayLanguageResult.success) {
    return undefined;
  }
  const spokenLanguagesResult = ZodSupportedSpokenLanguageCodes.array().safeParse(
    queryKey[6]
  );
  if (!spokenLanguagesResult.success) {
    return undefined;
  }

  return {
    conversationSlugId,
    analysisView: analysisViewResult.data,
    checkpointViewSnapshotId: rawCheckpointViewSnapshotId,
    aiLabelingEnabled: rawAiLabelingEnabled,
    displayLanguage: displayLanguageResult.data,
    spokenLanguages: spokenLanguagesResult.data,
  };
}

function mergeLocales({
  current,
  incoming,
}: {
  current: SupportedDisplayLanguageCodes[];
  incoming: SupportedDisplayLanguageCodes[];
}): SupportedDisplayLanguageCodes[] {
  return Array.from(new Set([...current, ...incoming]));
}

function isQueryRelevantToAnalysisEvent({
  query,
  data,
}: {
  query: LiveAnalysisQueryInfo;
  data: SSEConversationAnalysisUpdatedData;
}): boolean {
  if (data.changeKind !== "descriptions") {
    return query.checkpointViewSnapshotId === undefined;
  }

  const frameKey = query.analysis?.frameKey;
  if (frameKey === undefined) {
    return false;
  }

  if (
    frameKey.conversationViewSnapshotId !== data.conversationViewSnapshotId ||
    frameKey.analysisSnapshotId !== data.analysisSnapshotId
  ) {
    return false;
  }

  return (
    data.candidateIds.includes(frameKey.candidateId)
  );
}

export function createLiveAnalysisCatchUpController({
  queryClient,
  fetchLiveAnalysis,
}: {
  queryClient: QueryClient;
  fetchLiveAnalysis: (params: FetchLiveAnalysisParams) => Promise<AnalysisData>;
}): LiveAnalysisCatchUpController {
  const catchUpStateByQueryHash = new Map<string, LiveAnalysisCatchUpState>();

  function getActiveLiveAnalysisQueries({
    conversationSlugId,
    includeCheckpoints = false,
  }: {
    conversationSlugId: string;
    includeCheckpoints?: boolean;
  }): LiveAnalysisQueryInfo[] {
    const queries: LiveAnalysisQueryInfo[] = [];
    for (const query of queryClient.getQueryCache().findAll({
      predicate: (candidate) =>
        candidate.isActive() &&
        (includeCheckpoints
          ? isAnalysisQueryKeyForConversation({
              queryKey: candidate.queryKey,
              conversationSlugId,
            })
          : isLiveAnalysisQueryKey({
              queryKey: candidate.queryKey,
              conversationSlugId,
            })),
    })) {
      const params = parseLiveAnalysisQueryParams({
        queryKey: query.queryKey,
        conversationSlugId,
      });
      if (params === undefined) {
        continue;
      }

      queries.push({
        ...params,
        queryHash: query.queryHash,
        queryKey: query.queryKey,
        analysis: queryClient.getQueryData<AnalysisData>(query.queryKey),
        isFetching: query.state.fetchStatus === "fetching",
      });
    }
    return queries;
  }

  function getActiveLiveAnalysisQueryByHash({
    conversationSlugId,
    queryHash,
  }: {
    conversationSlugId: string;
    queryHash: string;
  }): LiveAnalysisQueryInfo | undefined {
    return getActiveLiveAnalysisQueries({
      conversationSlugId,
      includeCheckpoints: true,
    }).find(
      (query) => query.queryHash === queryHash
    );
  }

  function clearQueryState({ queryHash }: { queryHash: string }): void {
    const state = catchUpStateByQueryHash.get(queryHash);
    if (state?.timeout !== undefined) {
      clearTimeout(state.timeout);
    }
    catchUpStateByQueryHash.delete(queryHash);
  }

  function scheduleQueryCheck({
    queryHash,
    delayMs,
    force = false,
  }: {
    queryHash: string;
    delayMs: number;
    force?: boolean;
  }): void {
    const state = catchUpStateByQueryHash.get(queryHash);
    if (state === undefined) {
      return;
    }

    if (state.timeout !== undefined) {
      clearTimeout(state.timeout);
    }

    state.timeout = setTimeout(() => {
      const latestState = catchUpStateByQueryHash.get(queryHash);
      if (latestState !== undefined) {
        latestState.timeout = undefined;
      }
      void catchUpQuery({ queryHash, force });
    }, delayMs);
  }

  function isQueryFreshEnough({
    query,
    state,
  }: {
    query: LiveAnalysisQueryInfo;
    state: LiveAnalysisCatchUpState;
  }): boolean {
    return isAnalysisFreshEnough({
      analysis: query.analysis,
      expectedSnapshotId: state.expectedSnapshotId,
      expectedDescriptionLocales: state.expectedDescriptionLocales,
    });
  }

  function upsertQueryState({
    conversationSlugId,
    query,
    expectedSnapshotId,
    expectedDescriptionLocales,
  }: {
    conversationSlugId: string;
    query: LiveAnalysisQueryInfo;
    expectedSnapshotId: number | null;
    expectedDescriptionLocales: SupportedDisplayLanguageCodes[];
  }): boolean {
    const existingState = catchUpStateByQueryHash.get(query.queryHash);
    const existingLocales = new Set(
      existingState?.expectedDescriptionLocales ?? []
    );
    const didAddDescriptionLocale = expectedDescriptionLocales.some(
      (locale) => !existingLocales.has(locale)
    );
    const nextExpectedSnapshotId = Math.max(
      existingState?.expectedSnapshotId ?? 0,
      expectedSnapshotId ?? 0
    );
    catchUpStateByQueryHash.set(query.queryHash, {
      conversationSlugId,
      queryKey: query.queryKey,
      expectedSnapshotId:
        nextExpectedSnapshotId === 0 ? null : nextExpectedSnapshotId,
      expectedDescriptionLocales: mergeLocales({
        current: existingState?.expectedDescriptionLocales ?? [],
        incoming: expectedDescriptionLocales,
      }),
      lastStartedAt: existingState?.lastStartedAt ?? 0,
      inFlight: existingState?.inFlight ?? false,
      timeout: existingState?.timeout,
    });
    return didAddDescriptionLocale;
  }

  function scheduleOrRunQueryCatchUp({
    query,
    force = false,
  }: {
    query: LiveAnalysisQueryInfo;
    force?: boolean;
  }): void {
    const state = catchUpStateByQueryHash.get(query.queryHash);
    if (state === undefined) {
      return;
    }

    if (isQueryFreshEnough({ query, state })) {
      clearQueryState({ queryHash: query.queryHash });
      return;
    }

    if (query.isFetching || state.inFlight) {
      scheduleQueryCheck({
        queryHash: query.queryHash,
        delayMs: force
          ? DESCRIPTION_CATCH_UP_BUSY_RETRY_MS
          : LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS,
        force,
      });
      return;
    }

    if (!force) {
      const nextAllowedAt =
        state.lastStartedAt + LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS;
      const delayMs = Math.max(0, nextAllowedAt - Date.now());
      if (delayMs > 0) {
        scheduleQueryCheck({ queryHash: query.queryHash, delayMs });
        return;
      }
    }

    void catchUpQuery({ queryHash: query.queryHash, force });
  }

  async function catchUpQuery({
    queryHash,
    force = false,
  }: {
    queryHash: string;
    force?: boolean;
  }): Promise<void> {
    const state = catchUpStateByQueryHash.get(queryHash);
    if (state === undefined) {
      return;
    }

    const query = getActiveLiveAnalysisQueryByHash({
      conversationSlugId: state.conversationSlugId,
      queryHash,
    });
    if (query === undefined) {
      clearQueryState({ queryHash });
      return;
    }

    if (isQueryFreshEnough({ query, state })) {
      clearQueryState({ queryHash });
      return;
    }

    if (query.isFetching || state.inFlight) {
      scheduleQueryCheck({
        queryHash,
        delayMs: force
          ? DESCRIPTION_CATCH_UP_BUSY_RETRY_MS
          : LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS,
        force,
      });
      return;
    }

    if (!force) {
      const nextAllowedAt =
        state.lastStartedAt + LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS;
      const delayMs = Math.max(0, nextAllowedAt - Date.now());
      if (delayMs > 0) {
        scheduleQueryCheck({ queryHash, delayMs });
        return;
      }
    }

    state.inFlight = true;
    state.lastStartedAt = Date.now();

    try {
      const freshness = buildAnalysisFreshnessRequest({
        previousAnalysis: query.analysis,
        expectedSnapshotId: state.expectedSnapshotId,
        expectedDescriptionLocales: state.expectedDescriptionLocales,
        enablePrimaryFallback: true,
      });
      const analysis = await fetchLiveAnalysis({
        conversationSlugId: query.conversationSlugId,
        analysisView: query.analysisView,
        checkpointViewSnapshotId: query.checkpointViewSnapshotId,
        aiLabelingEnabled: query.aiLabelingEnabled,
        displayLanguage: query.displayLanguage,
        spokenLanguages: query.spokenLanguages,
        freshness,
      });
      queryClient.setQueryData(query.queryKey, analysis);
    } catch (error) {
      console.warn("[LiveAnalysisCatchUp] Refetch failed", {
        conversationSlugId: state.conversationSlugId,
        expectedSnapshotId: state.expectedSnapshotId,
        expectedDescriptionLocales: state.expectedDescriptionLocales,
        queryHash,
        error,
      });
    } finally {
      state.inFlight = false;
    }

    const refreshedQuery = getActiveLiveAnalysisQueryByHash({
      conversationSlugId: state.conversationSlugId,
      queryHash,
    });
    if (refreshedQuery === undefined) {
      clearQueryState({ queryHash });
      return;
    }

    if (isQueryFreshEnough({ query: refreshedQuery, state })) {
      clearQueryState({ queryHash });
      return;
    }

    scheduleQueryCheck({
      queryHash,
      delayMs: LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS,
    });
  }

  function requestCatchUp(data: SSEConversationAnalysisUpdatedData): void {
    const activeQueries = getActiveLiveAnalysisQueries({
      conversationSlugId: data.conversationSlugId,
      includeCheckpoints: data.changeKind === "descriptions",
    }).filter((query) => isQueryRelevantToAnalysisEvent({ query, data }));
    const activeQueryHashes = new Set(
      activeQueries.map((query) => query.queryHash)
    );

    for (const [queryHash, state] of Array.from(catchUpStateByQueryHash)) {
      if (
        state.conversationSlugId === data.conversationSlugId &&
        !activeQueryHashes.has(queryHash)
      ) {
        clearQueryState({ queryHash });
      }
    }

    for (const query of activeQueries) {
      const expectedDescriptionLocales = getExpectedDescriptionLocalesFromEvent(
        {
          event: data,
          displayLanguage: query.displayLanguage,
        }
      );
      const didAddDescriptionLocale = upsertQueryState({
        conversationSlugId: data.conversationSlugId,
        query,
        expectedSnapshotId:
          data.changeKind === "descriptions"
            ? null
            : data.conversationViewSnapshotId,
        expectedDescriptionLocales,
      });
      scheduleOrRunQueryCatchUp({
        query,
        force: data.changeKind === "descriptions" && didAddDescriptionLocale,
      });
    }
  }

  function clearConversation({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): void {
    for (const [queryHash, state] of Array.from(catchUpStateByQueryHash)) {
      if (state.conversationSlugId === conversationSlugId) {
        clearQueryState({ queryHash });
      }
    }
  }

  function clearAll(): void {
    for (const queryHash of Array.from(catchUpStateByQueryHash.keys())) {
      clearQueryState({ queryHash });
    }
  }

  return {
    requestCatchUp,
    clearConversation,
    clearAll,
  };
}
