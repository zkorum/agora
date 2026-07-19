import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type {
  AnalysisFrameGroupLabels,
  AnalysisFrameGroups,
  AnalysisFrameKey,
  AnalysisFrameManifest,
  AnalysisFrameOpinionList,
  AnalysisFreshnessRequest,
  FetchCommentStatsResponse,
} from "src/shared/types/dto";
import type {
  AnalysisView,
  DisplayedOpinionItem,
  OpinionItem,
  PolisKey,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import { useUserStore } from "src/stores/user";
import {
  buildAnalysisFreshnessRequest,
  LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS,
} from "src/utils/analysis/analysisFreshness";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useNotify } from "../../ui/notify";
import type { AxiosErrorResponse } from "../common";
import { getErrorMessage } from "../common";
import { updateConversationQueryCache } from "../post/useConversationQuery";
import type { AnalysisData, CommentTabFilters } from "./comment";
import {
  buildAnalysisDataFromFrame,
  buildEmptyAnalysisDataFromManifest,
  hasManifestFrame,
  mergeLiveAnalysisSnapshotMetadata,
  useBackendCommentApi,
} from "./comment";
import {
  type UseCommentQueriesTranslations,
  useCommentQueriesTranslations,
} from "./useCommentQueries.i18n";

export function useCommentsQuery({
  conversationSlugId,
  filter,
  clusterKey,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  filter: CommentTabFilters;
  clusterKey?: PolisKey;
  voteCount?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchCommentsForPost } = useBackendCommentApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

  return useQuery<DisplayedOpinionItem[], Error>({
    queryKey: [
      "comments",
      computed(() => toValue(conversationSlugId)),
      filter,
      clusterKey,
      computed(() => displayLanguage.value),
      computed(() => [...spokenLanguages.value].sort()),
    ],
    queryFn: () =>
      fetchCommentsForPost(toValue(conversationSlugId), filter, clusterKey),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: getAnalysisStaleTime(toValue(voteCount)), // Dynamic cache based on conversation size
    // Note: bypassed by manual invalidation on tab changes
    placeholderData: (previousData) => previousData, // Preserve previous data during refetches
    retry: false, // Disable auto-retry
  });
}

export function useHiddenCommentsQuery({
  conversationSlugId,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  voteCount?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchHiddenCommentsForPost } = useBackendCommentApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

  return useQuery<DisplayedOpinionItem[], Error>({
    queryKey: [
      "hiddenComments",
      computed(() => toValue(conversationSlugId)),
      computed(() => displayLanguage.value),
      computed(() => [...spokenLanguages.value].sort()),
    ],
    queryFn: () => fetchHiddenCommentsForPost(toValue(conversationSlugId)),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: getAnalysisStaleTime(toValue(voteCount)), // Dynamic cache based on conversation size
    // Note: bypassed by manual invalidation on tab changes
    placeholderData: (previousData) => previousData, // Preserve previous data during refetches
    retry: false, // Disable auto-retry
  });
}

export function useCommentStatsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchCommentStatsForPost } = useBackendCommentApi();

  return useQuery({
    queryKey: ["commentStats", computed(() => toValue(conversationSlugId))],
    queryFn: () => fetchCommentStatsForPost(toValue(conversationSlugId)),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    retry: false,
  });
}

export function pickCommentStatsForActionBar(
  stats: FetchCommentStatsResponse
): Pick<
  FetchCommentStatsResponse,
  | "opinionCount"
  | "participantCount"
  | "voteCount"
  | "totalParticipantCount"
  | "totalVoteCount"
> {
  return {
    opinionCount: stats.opinionCount,
    participantCount: stats.participantCount,
    voteCount: stats.voteCount,
    totalParticipantCount: stats.totalParticipantCount,
    totalVoteCount: stats.totalVoteCount,
  };
}

/**
 * Calculate optimal stale time based on conversation size
 * After this time, data is considered stale and will refetch on next access
 *
 * Backend constraints:
 * - Math-updater scans every 2s (MATH_UPDATER_SCAN_INTERVAL_MS)
 * - Minimum 2s between updates per conversation (MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS)
 * - Singleton deduplication windows: 2s, 8s, 28s (based on vote count)
 * - Network processing time: ~2s
 *
 * Buffer calculation: singleton window + 2s buffer for scan + network
 */
export function getAnalysisStaleTime(voteCount?: number): number {
  if (!voteCount) return 30000; // Default 30s if unknown (huge conversation default)

  // Buffer for scan interval (2s) + network processing + safety margin
  const BUFFER_MS = 2000; // 2 seconds buffer

  if (voteCount < 1000) {
    // Small conversations (< 1K votes): 2s singleton + 2s buffer = 4s
    return 2000 + BUFFER_MS;
  } else if (voteCount < 1000000) {
    // Medium conversations (1K-1M votes): 8s singleton + 2s buffer = 10s
    return 8000 + BUFFER_MS;
  } else {
    // Huge conversations (1M+ votes): 28s singleton + 2s buffer = 30s
    return 28000 + BUFFER_MS;
  }
}

type BackendCommentApi = ReturnType<typeof useBackendCommentApi>;
type AnalysisQueryKey = readonly unknown[];
type CommentQueryFilter = "new" | "my_votes";

const LABEL_CATCH_UP_MAX_ATTEMPTS = 5;
const labelCatchUpStateByKey = new Map<
  string,
  { attemptCount: number; timeout: ReturnType<typeof setTimeout> | undefined }
>();

type CompleteAnalysisData = AnalysisData & {
  manifest: AnalysisFrameManifest & {
    frameKey: AnalysisFrameKey;
    conversationViewSnapshot: NonNullable<
      AnalysisFrameManifest["conversationViewSnapshot"]
    >;
  };
  groups: AnalysisFrameGroups;
  groupLabels: AnalysisFrameGroupLabels;
  agreements: AnalysisFrameOpinionList;
  disagreements: AnalysisFrameOpinionList;
  divisive: AnalysisFrameOpinionList;
};

function frameKeyQueryPart(frameKey: AnalysisFrameKey): readonly number[] {
  return [
    frameKey.conversationViewSnapshotId,
    frameKey.analysisSnapshotId,
    frameKey.candidateId,
  ];
}

function isSameFrameKey({
  left,
  right,
}: {
  left: AnalysisFrameKey;
  right: AnalysisFrameKey;
}): boolean {
  return (
    left.conversationViewSnapshotId === right.conversationViewSnapshotId &&
    left.analysisSnapshotId === right.analysisSnapshotId &&
    left.candidateId === right.candidateId
  );
}

function hasCompleteAnalysisFrame(
  analysis: AnalysisData | undefined
): analysis is CompleteAnalysisData {
  return (
    analysis?.manifest?.frameKey !== undefined &&
    analysis.manifest.conversationViewSnapshot !== undefined &&
    analysis.groups !== undefined &&
    analysis.groupLabels !== undefined &&
    analysis.agreements !== undefined &&
    analysis.disagreements !== undefined &&
    analysis.divisive !== undefined
  );
}

function isGroupLabelDisplayFresh({
  groupLabels,
  displayLanguage,
}: {
  groupLabels: AnalysisFrameGroupLabels;
  displayLanguage: SupportedDisplayLanguageCodes;
}): boolean {
  const displayedLocale = groupLabels.groupDescriptionDisplay.displayedLocale;
  if (displayedLocale === null) {
    return false;
  }
  return displayLanguage === "en" || displayedLocale === displayLanguage;
}

function prependDisplayedOpinionToCommentCache({
  queryClient,
  conversationSlugId,
  displayedOpinionItem,
  filters,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  displayedOpinionItem: DisplayedOpinionItem;
  filters: readonly CommentQueryFilter[];
}): void {
  queryClient.setQueriesData<DisplayedOpinionItem[]>(
    {
      queryKey: ["comments", conversationSlugId],
      predicate: ({ queryKey }) =>
        filters.some((filter) => queryKey[2] === filter),
    },
    (oldData) => {
      if (oldData === undefined) {
        return oldData;
      }
      return [
        displayedOpinionItem,
        ...oldData.filter(
          (opinion) =>
            opinion.opinionSlugId !== displayedOpinionItem.opinionSlugId
        ),
      ];
    }
  );
}

function expectedLabelLocales(
  displayLanguage: SupportedDisplayLanguageCodes
): SupportedDisplayLanguageCodes[] {
  return displayLanguage === "en" ? ["en"] : ["en", displayLanguage];
}

function labelCatchUpKey({
  conversationSlugId,
  frameKey,
  aiLabelingEnabled,
  displayLanguage,
}: {
  conversationSlugId: string;
  frameKey: AnalysisFrameKey;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: SupportedDisplayLanguageCodes;
}): string {
  return JSON.stringify([
    conversationSlugId,
    frameKey.conversationViewSnapshotId,
    frameKey.analysisSnapshotId,
    frameKey.candidateId,
    aiLabelingEnabled,
    displayLanguage,
  ]);
}

function getManifestStaleTime({
  freshness,
  voteCount,
}: {
  freshness: AnalysisFreshnessRequest | null;
  voteCount: number | undefined;
}): number {
  if (
    freshness === null ||
    freshness.minimumConversationViewSnapshotId === null
  ) {
    return getAnalysisStaleTime(voteCount);
  }

  return 0;
}

function shouldRefreshFrameSections({
  freshness,
}: {
  freshness: AnalysisFreshnessRequest | null;
}): boolean {
  return (
    freshness !== null && freshness.minimumConversationViewSnapshotId !== null
  );
}

function getFrameSectionStaleTime({
  freshness,
  voteCount,
}: {
  freshness: AnalysisFreshnessRequest | null;
  voteCount: number | undefined;
}): number {
  return shouldRefreshFrameSections({ freshness })
    ? 0
    : getAnalysisStaleTime(voteCount);
}

function getLabelStaleTime({
  freshness,
  voteCount,
}: {
  freshness: AnalysisFreshnessRequest | null;
  voteCount: number | undefined;
}): number {
  return freshness === null ? getAnalysisStaleTime(voteCount) : 0;
}

interface FrameLabelCatchUpParams {
  queryClient: QueryClient;
  fetchAnalysisFrameGroupLabels: BackendCommentApi["fetchAnalysisFrameGroupLabels"];
  conversationSlugId: string;
  frameKey: AnalysisFrameKey;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: string;
  groupLabels: AnalysisFrameGroupLabels;
  analysisQueryKey: AnalysisQueryKey;
}

interface FrameLabelCatchUpAttemptParams extends FrameLabelCatchUpParams {
  catchUpKey: string;
  supportedDisplayLanguage: SupportedDisplayLanguageCodes;
}

interface FetchFrameGroupLabelsParams {
  queryClient: QueryClient;
  fetchAnalysisFrameGroupLabels: BackendCommentApi["fetchAnalysisFrameGroupLabels"];
  conversationSlugId: string;
  frameKey: AnalysisFrameKey;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: string;
  freshness: AnalysisFreshnessRequest | null;
  labelStaleTime: number;
}

async function fetchFrameGroupLabels({
  queryClient,
  fetchAnalysisFrameGroupLabels,
  conversationSlugId,
  frameKey,
  aiLabelingEnabled,
  displayLanguage,
  freshness,
  labelStaleTime,
}: FetchFrameGroupLabelsParams): Promise<AnalysisFrameGroupLabels> {
  const frameKeyPart = frameKeyQueryPart(frameKey);
  const labelQueryKey = [
    "analysisFrameGroupLabels",
    conversationSlugId,
    frameKeyPart,
    aiLabelingEnabled,
    displayLanguage,
  ];
  return await queryClient.fetchQuery({
    queryKey: labelQueryKey,
    queryFn: () =>
      fetchAnalysisFrameGroupLabels({
        conversationSlugId,
        frameKey,
        freshness,
      }),
    staleTime: labelStaleTime,
    retry: false,
  });
}

async function runFrameLabelCatchUpAttempt({
  queryClient,
  fetchAnalysisFrameGroupLabels,
  conversationSlugId,
  frameKey,
  aiLabelingEnabled,
  displayLanguage,
  analysisQueryKey,
  catchUpKey,
  supportedDisplayLanguage,
}: FrameLabelCatchUpAttemptParams): Promise<void> {
  const frameKeyPart = frameKeyQueryPart(frameKey);
  const labelQueryKey = [
    "analysisFrameGroupLabels",
    conversationSlugId,
    frameKeyPart,
    aiLabelingEnabled,
    displayLanguage,
  ];
  const freshness: AnalysisFreshnessRequest = {
    enablePrimaryFallback: true,
    minimumConversationViewSnapshotId: null,
    expectedDescriptionLocales: expectedLabelLocales(supportedDisplayLanguage),
  };
  await queryClient.invalidateQueries({
    queryKey: labelQueryKey,
    exact: true,
    refetchType: "none",
  });
  const refreshedGroupLabels = await queryClient.fetchQuery({
    queryKey: labelQueryKey,
    queryFn: () =>
      fetchAnalysisFrameGroupLabels({
        conversationSlugId,
        frameKey,
        freshness,
      }),
    staleTime: 0,
    retry: false,
  });

  queryClient.setQueryData<AnalysisData>(analysisQueryKey, (current) => {
    if (
      !hasCompleteAnalysisFrame(current) ||
      !isSameFrameKey({ left: current.manifest.frameKey, right: frameKey })
    ) {
      return current;
    }
    return buildAnalysisDataFromFrame({
      manifest: current.manifest,
      groups: current.groups,
      groupLabels: refreshedGroupLabels,
      agreements: current.agreements,
      disagreements: current.disagreements,
      divisive: current.divisive,
    });
  });

  if (
    isGroupLabelDisplayFresh({
      groupLabels: refreshedGroupLabels,
      displayLanguage: supportedDisplayLanguage,
    })
  ) {
    labelCatchUpStateByKey.delete(catchUpKey);
    return;
  }

  // A frame-section request cannot discover that live analysis moved to a
  // newer frame. Refresh the active analysis query before retrying this frame.
  await queryClient.invalidateQueries({
    queryKey: analysisQueryKey,
    exact: true,
    refetchType: "active",
  });
  labelCatchUpStateByKey.delete(catchUpKey);
}

function scheduleFrameLabelCatchUp(params: FrameLabelCatchUpParams): void {
  const {
    conversationSlugId,
    frameKey,
    aiLabelingEnabled,
    displayLanguage,
    groupLabels,
  } = params;
  const parsedDisplayLanguage =
    ZodSupportedDisplayLanguageCodes.safeParse(displayLanguage);
  if (!parsedDisplayLanguage.success) {
    return;
  }
  const supportedDisplayLanguage = parsedDisplayLanguage.data;
  if (
    isGroupLabelDisplayFresh({
      groupLabels,
      displayLanguage: supportedDisplayLanguage,
    })
  ) {
    labelCatchUpStateByKey.delete(
      labelCatchUpKey({
        conversationSlugId,
        frameKey,
        aiLabelingEnabled,
        displayLanguage: supportedDisplayLanguage,
      })
    );
    return;
  }

  const catchUpKey = labelCatchUpKey({
    conversationSlugId,
    frameKey,
    aiLabelingEnabled,
    displayLanguage: supportedDisplayLanguage,
  });
  const currentState = labelCatchUpStateByKey.get(catchUpKey) ?? {
    attemptCount: 0,
    timeout: undefined,
  };
  if (
    currentState.timeout !== undefined ||
    currentState.attemptCount >= LABEL_CATCH_UP_MAX_ATTEMPTS
  ) {
    labelCatchUpStateByKey.set(catchUpKey, currentState);
    return;
  }

  currentState.timeout = setTimeout(() => {
    currentState.timeout = undefined;
    currentState.attemptCount += 1;
    labelCatchUpStateByKey.set(catchUpKey, currentState);

    const query = params.queryClient.getQueryCache().find({
      queryKey: params.analysisQueryKey,
    });
    if (query === undefined || !query.isActive()) {
      labelCatchUpStateByKey.delete(catchUpKey);
      return;
    }

    const currentAnalysis = params.queryClient.getQueryData<AnalysisData>(
      params.analysisQueryKey
    );
    if (
      hasCompleteAnalysisFrame(currentAnalysis) &&
      !isSameFrameKey({
        left: currentAnalysis.manifest.frameKey,
        right: params.frameKey,
      })
    ) {
      labelCatchUpStateByKey.delete(catchUpKey);
      scheduleFrameLabelCatchUp({
        ...params,
        frameKey: currentAnalysis.manifest.frameKey,
        groupLabels: currentAnalysis.groupLabels,
      });
      return;
    }

    void runFrameLabelCatchUpAttempt({
      ...params,
      catchUpKey,
      supportedDisplayLanguage,
    }).catch(() => {
      scheduleFrameLabelCatchUp(params);
    });
  }, LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS);
  labelCatchUpStateByKey.set(catchUpKey, currentState);
}

export async function fetchAnalysisDataWithCache({
  queryClient,
  fetchAnalysisFrameManifest,
  fetchAnalysisFrameGroups,
  fetchAnalysisFrameGroupLabels,
  fetchAnalysisFrameOpinionList,
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  aiLabelingEnabled,
  displayLanguage,
  spokenLanguages,
  voteCount,
  freshness,
  analysisQueryKey,
}: {
  queryClient: QueryClient;
  fetchAnalysisFrameManifest: BackendCommentApi["fetchAnalysisFrameManifest"];
  fetchAnalysisFrameGroups: BackendCommentApi["fetchAnalysisFrameGroups"];
  fetchAnalysisFrameGroupLabels: BackendCommentApi["fetchAnalysisFrameGroupLabels"];
  fetchAnalysisFrameOpinionList: BackendCommentApi["fetchAnalysisFrameOpinionList"];
  conversationSlugId: string;
  analysisView: AnalysisView | undefined;
  checkpointViewSnapshotId: number | undefined;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: string;
  spokenLanguages: readonly string[];
  voteCount: number | undefined;
  freshness: AnalysisFreshnessRequest | null;
  analysisQueryKey: AnalysisQueryKey | undefined;
}): Promise<AnalysisData> {
  const manifest = await queryClient.fetchQuery({
    queryKey: [
      "analysisFrameManifest",
      conversationSlugId,
      analysisView,
      checkpointViewSnapshotId,
      aiLabelingEnabled,
    ],
    queryFn: () =>
      fetchAnalysisFrameManifest({
        conversationSlugId,
        analysisView,
        checkpointViewSnapshotId,
        freshness,
      }),
    staleTime: getManifestStaleTime({ freshness, voteCount }),
    retry: false,
  });

  if (!hasManifestFrame(manifest)) {
    return buildEmptyAnalysisDataFromManifest({ manifest });
  }

  const frameKey = manifest.frameKey;
  const frameKeyPart = frameKeyQueryPart(frameKey);
  const frameSectionStaleTime = getFrameSectionStaleTime({
    freshness,
    voteCount,
  });
  const labelStaleTime = getLabelStaleTime({ freshness, voteCount });
  const [groups, groupLabels, agreements, disagreements, divisive] =
    await Promise.all([
      queryClient.fetchQuery({
        queryKey: [
          "analysisFrameGroups",
          conversationSlugId,
          frameKeyPart,
          displayLanguage,
          spokenLanguages,
        ],
        queryFn: () =>
          fetchAnalysisFrameGroups({
            conversationSlugId,
            frameKey,
            freshness,
          }),
        staleTime: frameSectionStaleTime,
        retry: false,
      }),
      fetchFrameGroupLabels({
        queryClient,
        fetchAnalysisFrameGroupLabels,
        conversationSlugId,
        frameKey,
        aiLabelingEnabled,
        displayLanguage,
        freshness,
        labelStaleTime,
      }),
      queryClient.fetchQuery({
        queryKey: [
          "analysisFrameOpinionList",
          conversationSlugId,
          frameKeyPart,
          "agreements",
          displayLanguage,
          spokenLanguages,
        ],
        queryFn: () =>
          fetchAnalysisFrameOpinionList({
            conversationSlugId,
            frameKey,
            kind: "agreements",
            freshness,
          }),
        staleTime: frameSectionStaleTime,
        retry: false,
      }),
      queryClient.fetchQuery({
        queryKey: [
          "analysisFrameOpinionList",
          conversationSlugId,
          frameKeyPart,
          "disagreements",
          displayLanguage,
          spokenLanguages,
        ],
        queryFn: () =>
          fetchAnalysisFrameOpinionList({
            conversationSlugId,
            frameKey,
            kind: "disagreements",
            freshness,
          }),
        staleTime: frameSectionStaleTime,
        retry: false,
      }),
      queryClient.fetchQuery({
        queryKey: [
          "analysisFrameOpinionList",
          conversationSlugId,
          frameKeyPart,
          "divisive",
          displayLanguage,
          spokenLanguages,
        ],
        queryFn: () =>
          fetchAnalysisFrameOpinionList({
            conversationSlugId,
            frameKey,
            kind: "divisive",
            freshness,
          }),
        staleTime: frameSectionStaleTime,
        retry: false,
      }),
    ]);

  if (manifest.aiLabelsExpected && analysisQueryKey !== undefined) {
    scheduleFrameLabelCatchUp({
      queryClient,
      fetchAnalysisFrameGroupLabels,
      conversationSlugId,
      frameKey,
      aiLabelingEnabled,
      displayLanguage,
      groupLabels,
      analysisQueryKey,
    });
  }

  return buildAnalysisDataFromFrame({
    manifest,
    groups,
    groupLabels,
    agreements,
    disagreements,
    divisive,
  });
}

export function useAnalysisQuery({
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  aiLabelingEnabled,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  analysisView?: MaybeRefOrGetter<AnalysisView | undefined>;
  checkpointViewSnapshotId?: MaybeRefOrGetter<number | undefined>;
  aiLabelingEnabled?: MaybeRefOrGetter<boolean | undefined>;
  voteCount?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const {
    fetchAnalysisFrameManifest,
    fetchAnalysisFrameGroups,
    fetchAnalysisFrameGroupLabels,
    fetchAnalysisFrameOpinionList,
  } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

  return useQuery({
    queryKey: [
      "analysis",
      computed(() => toValue(conversationSlugId)),
      computed(() => toValue(analysisView)),
      computed(() => toValue(checkpointViewSnapshotId)),
      computed(() => toValue(aiLabelingEnabled)),
      computed(() => displayLanguage.value),
      computed(() => [...spokenLanguages.value].sort()),
    ],
    queryFn: async () => {
      const resolvedConversationSlugId = toValue(conversationSlugId);
      const resolvedAnalysisView = toValue(analysisView);
      const resolvedCheckpointViewSnapshotId = toValue(
        checkpointViewSnapshotId
      );
      const resolvedAiLabelingEnabled = toValue(aiLabelingEnabled);
      const resolvedDisplayLanguage = displayLanguage.value;
      const resolvedSpokenLanguages = [...spokenLanguages.value].sort();
      const resolvedVoteCount = toValue(voteCount);
      const resolvedQueryKey = [
        "analysis",
        resolvedConversationSlugId,
        resolvedAnalysisView,
        resolvedCheckpointViewSnapshotId,
        resolvedAiLabelingEnabled,
        resolvedDisplayLanguage,
        resolvedSpokenLanguages,
      ];
      const previousAnalysis =
        queryClient.getQueryData<AnalysisData>(resolvedQueryKey);
      const freshness = buildAnalysisFreshnessRequest({
        previousAnalysis,
        expectedSnapshotId: null,
        expectedDescriptionLocales: [],
        enablePrimaryFallback: true,
      });
      const analysisData = await fetchAnalysisDataWithCache({
        queryClient,
        fetchAnalysisFrameManifest,
        fetchAnalysisFrameGroups,
        fetchAnalysisFrameGroupLabels,
        fetchAnalysisFrameOpinionList,
        conversationSlugId: resolvedConversationSlugId,
        analysisView: resolvedAnalysisView,
        checkpointViewSnapshotId: resolvedCheckpointViewSnapshotId,
        aiLabelingEnabled: resolvedAiLabelingEnabled,
        displayLanguage: resolvedDisplayLanguage,
        spokenLanguages: resolvedSpokenLanguages,
        voteCount: resolvedVoteCount,
        freshness,
        analysisQueryKey: resolvedQueryKey,
      });

      const snapshot = analysisData.conversationViewSnapshot;
      if (
        resolvedCheckpointViewSnapshotId === undefined &&
        snapshot !== undefined
      ) {
        updateConversationQueryCache({
          queryClient,
          conversationSlugId: resolvedConversationSlugId,
          updateConversation: (conversation) => {
            const metadata = mergeLiveAnalysisSnapshotMetadata({
              metadata: conversation.metadata,
              snapshot,
            });
            if (metadata === conversation.metadata) {
              return conversation;
            }

            return {
              ...conversation,
              metadata,
            };
          },
        });
      }

      return analysisData;
    },
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: getAnalysisStaleTime(toValue(voteCount)), // Dynamic cache based on conversation size
    // Note: When votes/comments happen, markAnalysisAsStale() is called
    // This marks data as stale immediately, so next access will refetch
    retry: false, // Disable auto-retry
  });
}

export function useAnalysisCheckpointsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchAnalysisCheckpoints } = useBackendCommentApi();

  return useQuery({
    queryKey: [
      "analysisCheckpoints",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: () =>
      fetchAnalysisCheckpoints({
        conversationSlugId: toValue(conversationSlugId),
      }),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: 30000,
    retry: false,
  });
}

export function useCreateCommentMutation() {
  const { createNewComment } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseCommentQueriesTranslations>(
    useCommentQueriesTranslations
  );
  const { markAnalysisAsStale, markCommentsAsStale } =
    useInvalidateCommentQueries();

  return useMutation({
    mutationFn: ({
      commentBody,
      opinionPlainText,
      conversationSlugId,
    }: {
      commentBody: string;
      opinionPlainText: string;
      conversationSlugId: string;
    }) => createNewComment(commentBody, opinionPlainText, conversationSlugId),
    onSuccess: (data, variables) => {
      // Only proceed if the comment creation was successful
      if (data.success) {
        prependDisplayedOpinionToCommentCache({
          queryClient,
          conversationSlugId: variables.conversationSlugId,
          displayedOpinionItem: data.displayedOpinionItem,
          filters: ["new", "my_votes"],
        });
        void markCommentsAsStale(variables.conversationSlugId);
        // Mark analysis as stale without immediate refetch
        // Let the refetchInterval handle updates based on conversation activity
        markAnalysisAsStale(variables.conversationSlugId);
      } else {
        // Handle business logic failures (like conversation_locked)
        showNotifyMessage(
          t("failedToCreateCommentWithReason", {
            reason: data.reason ?? "unknown",
          })
        );
      }
    },
    onError: (error: AxiosErrorResponse) => {
      // Handle technical errors (network, server errors, etc.)
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage(t("failedToCreateComment"));
      }
    },
    retry: false, // Disable auto-retry
  });
}

export function useDeleteCommentMutation() {
  const { deleteCommentBySlugId } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseCommentQueriesTranslations>(
    useCommentQueriesTranslations
  );
  const userStore = useUserStore();

  interface DeleteCommentMutationVariables {
    commentSlugId: string;
    conversationSlugId: string;
    moderation: OpinionItem["moderation"];
  }

  return useMutation({
    mutationFn: ({ commentSlugId }: DeleteCommentMutationVariables) =>
      deleteCommentBySlugId(commentSlugId),
    onSuccess: (_data, variables, _context: unknown) => {
      // Remove from TanStack Query cache (conversation page - all filters)
      queryClient.setQueriesData<OpinionItem[]>(
        { queryKey: ["comments"] },
        (oldData) =>
          oldData?.filter(
            (opinion) => opinion.opinionSlugId !== variables.commentSlugId
          ) ?? []
      );

      queryClient.setQueriesData<OpinionItem[]>(
        { queryKey: ["hiddenComments"] },
        (oldData) =>
          oldData?.filter(
            (opinion) => opinion.opinionSlugId !== variables.commentSlugId
          ) ?? []
      );

      updateConversationQueryCache({
        queryClient,
        conversationSlugId: variables.conversationSlugId,
        updateConversation: (conversation) => {
          const isUnmoderated = variables.moderation.status === "unmoderated";
          const isMoved =
            variables.moderation.status === "moderated" &&
            variables.moderation.action === "move";
          const isHidden =
            variables.moderation.status === "moderated" &&
            variables.moderation.action === "hide";

          return {
            ...conversation,
            metadata: {
              ...conversation.metadata,
              opinionCount: Math.max(
                0,
                conversation.metadata.opinionCount - (isUnmoderated ? 1 : 0)
              ),
              totalOpinionCount: Math.max(
                0,
                conversation.metadata.totalOpinionCount - 1
              ),
              moderatedOpinionCount: Math.max(
                0,
                conversation.metadata.moderatedOpinionCount - (isMoved ? 1 : 0)
              ),
              hiddenOpinionCount: Math.max(
                0,
                conversation.metadata.hiddenOpinionCount - (isHidden ? 1 : 0)
              ),
            },
          };
        },
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversation", variables.conversationSlugId],
      });

      // Remove from Pinia store (profile page)
      const indexToRemove = userStore.profileData.userCommentList.findIndex(
        (item) => item.opinionItem.opinionSlugId === variables.commentSlugId
      );
      if (indexToRemove !== -1) {
        userStore.profileData.userCommentList.splice(indexToRemove, 1);
      }

      showNotifyMessage(t("commentDeletedSuccessfully"));
    },
    onError: (error: AxiosErrorResponse) => {
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage(t("failedToDeleteComment"));
      }
    },
    retry: false, // Disable auto-retry
  });
}

// Utility function to invalidate comment-related queries
export function useInvalidateCommentQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateComments: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", conversationSlugId],
      });
    },
    invalidateHiddenComments: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["hiddenComments", conversationSlugId],
      });
    },
    invalidateAnalysis: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisContent", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
      });
    },
    invalidateAnalysisCheckpoints: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
      });
    },
    forceRefreshAnalysis: (conversationSlugId: string) => {
      // Force immediate refetch bypassing staleTime completely
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
        refetchType: "active", // Force active queries to refetch immediately
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisContent", conversationSlugId],
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
        refetchType: "active",
      });

      // Also trigger immediate refetch for any matching queries
      void queryClient.refetchQueries({
        queryKey: ["analysis", conversationSlugId],
      });
      void queryClient.refetchQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
      });
      void queryClient.refetchQueries({
        queryKey: ["analysisContent", conversationSlugId],
      });
      void queryClient.refetchQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
      });
    },
    markAnalysisAsStale: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
        refetchType: "none", // Mark as stale but don't refetch immediately
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisContent", conversationSlugId],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
        refetchType: "none",
      });
    },
    markCommentsAsStale: (conversationSlugId: string) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["comments", conversationSlugId],
          refetchType: "none", // Mark as stale but don't refetch immediately
        }),
        queryClient.invalidateQueries({
          queryKey: ["hiddenComments", conversationSlugId],
          refetchType: "none",
        }),
      ]);
    },
    invalidateAll: (conversationSlugId: string) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["comments", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["hiddenComments", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysis", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysisMetadata", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysisContent", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysisCheckpoints", conversationSlugId],
        }),
      ]);
    },
  };
}
