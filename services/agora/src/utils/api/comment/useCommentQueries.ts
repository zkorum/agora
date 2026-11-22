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
} from "src/shared/types/dto";
import type { Dto } from "src/shared/types/dto";
import type {
  AnalysisView,
  DisplayedOpinionItem,
  OpinionEditingAvailability,
  OpinionItem,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useUserStore } from "src/stores/user";
import {
  type AnalysisRefreshScope,
  LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS,
} from "src/utils/analysis/analysisFreshness";
import { useParticipationViewerLifetime } from "src/utils/api/participation/useParticipationViewerLifetime";
import {
  useViewerQueryScope,
  type ViewerQueryScope,
} from "src/utils/query/viewerScope";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  watch,
} from "vue";
import type { z } from "zod";

import { useNotify } from "../../ui/notify";
import { useCommonApi } from "../common";
import { classifyApiError } from "../error";
import { updateConversationQueryCache } from "../post/useConversationQuery";
import type { AnalysisData } from "./comment";
import {
  buildAnalysisDataFromFrame,
  buildEmptyAnalysisDataFromManifest,
  hasManifestFrame,
  mergeLiveAnalysisSnapshotMetadata,
  useBackendCommentApi,
} from "./comment";
import { cacheCreatedOpinion } from "./createdOpinionCache";
import {
  mapCachedOpinions,
  type OpinionCache,
  removeCachedOpinion,
} from "./opinionCache";
import {
  isOpinionQueryForScope,
  type OpinionQueryScope,
} from "./opinionQueryScope";
import { getOpinionTargetQueryKey } from "./opinionTargetQueryKey";
import {
  type UseCommentQueriesTranslations,
  useCommentQueriesTranslations,
} from "./useCommentQueries.i18n";

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

const LABEL_CATCH_UP_MAX_ATTEMPTS = 5;
// Retry state lives only as long as its viewer/language-scoped assembled query.
const labelCatchUpFrames = new WeakMap<object, AnalysisFrameKey>();

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

function frameKeyQueryPart(
  frameKey: AnalysisFrameKey
): readonly (number | string)[] {
  return [
    frameKey.mode,
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
    left.candidateId === right.candidateId &&
    left.mode === right.mode
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
  return (
    groupLabels.groupDescriptionDisplay.displayedLocale === displayLanguage
  );
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

interface FetchFrameGroupLabelsParams {
  queryClient: QueryClient;
  fetchAnalysisFrameGroupLabels: BackendCommentApi["fetchAnalysisFrameGroupLabels"];
  conversationSlugId: string;
  frameKey: AnalysisFrameKey;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: string;
  labelStaleTime: number;
}

async function fetchFrameGroupLabels({
  queryClient,
  fetchAnalysisFrameGroupLabels,
  conversationSlugId,
  frameKey,
  aiLabelingEnabled,
  displayLanguage,
  labelStaleTime,
}: FetchFrameGroupLabelsParams): Promise<AnalysisFrameGroupLabels> {
  return await queryClient.fetchQuery({
    queryKey: [
      "analysisFrameGroupLabels",
      conversationSlugId,
      frameKeyQueryPart(frameKey),
      aiLabelingEnabled,
      displayLanguage,
    ],
    queryFn: ({ signal }) =>
      fetchAnalysisFrameGroupLabels({
        conversationSlugId,
        frameKey,
        displayLanguage,
        signal,
      }),
    staleTime: labelStaleTime,
    retry: false,
  });
}

function scheduleFrameLabelCatchUp(params: FrameLabelCatchUpParams): void {
  const {
    queryClient,
    analysisQueryKey,
    frameKey,
    displayLanguage,
    groupLabels,
  } = params;
  const query = queryClient
    .getQueryCache()
    .find({ queryKey: analysisQueryKey, exact: true });
  if (query === undefined) return;
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
    labelCatchUpFrames.delete(query);
    return;
  }

  const pending = labelCatchUpFrames.get(query);
  if (
    pending !== undefined &&
    isSameFrameKey({ left: pending, right: frameKey })
  )
    return;
  labelCatchUpFrames.set(query, frameKey);
  const isCurrent = () =>
    query.isActive() &&
    labelCatchUpFrames.get(query) === frameKey &&
    queryClient.getQueryCache().get(query.queryHash) === query;
  let attempts = 0;
  const attempt = async (): Promise<void> => {
    if (!isCurrent()) {
      if (labelCatchUpFrames.get(query) === frameKey)
        labelCatchUpFrames.delete(query);
      return;
    }
    attempts++;
    try {
      const labels = await fetchFrameGroupLabels({
        ...params,
        labelStaleTime: 0,
      });
      if (!isCurrent()) return;
      const current = queryClient.getQueryData<AnalysisData>(analysisQueryKey);
      if (
        !hasCompleteAnalysisFrame(current) ||
        !isSameFrameKey({ left: current.manifest.frameKey, right: frameKey })
      ) {
        labelCatchUpFrames.delete(query);
        return;
      }
      queryClient.setQueryData(
        analysisQueryKey,
        buildAnalysisDataFromFrame({ ...current, groupLabels: labels })
      );
      if (
        isGroupLabelDisplayFresh({
          groupLabels: labels,
          displayLanguage: supportedDisplayLanguage,
        })
      ) {
        labelCatchUpFrames.delete(query);
        return;
      }
      // A label read cannot discover a replacement frame. Refresh its manifest
      // before asking the active view to assemble itself again.
      await queryClient.invalidateQueries({
        queryKey: ["analysisFrameManifest", ...analysisQueryKey.slice(1)],
        exact: true,
        refetchType: "none",
      });
      if (isCurrent())
        await queryClient.invalidateQueries({
          queryKey: analysisQueryKey,
          exact: true,
        });
    } catch {
      // Transient label failures share the same bounded retry budget.
    } finally {
      if (!query.isActive() && labelCatchUpFrames.get(query) === frameKey)
        labelCatchUpFrames.delete(query);
    }
    if (isCurrent() && attempts < LABEL_CATCH_UP_MAX_ATTEMPTS) schedule();
  };
  function schedule(): void {
    setTimeout(() => {
      void attempt();
    }, LIVE_ANALYSIS_CATCH_UP_INTERVAL_MS);
  }
  schedule();
}

export async function fetchAnalysisDataWithCache({
  queryClient,
  fetchAnalysisFrameManifest,
  fetchAnalysisFrameContent,
  fetchAnalysisFrameGroupLabels,
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  aiLabelingEnabled,
  displayLanguage,
  spokenLanguages,
  voteCount,
  refreshScope,
  analysisQueryKey,
  viewerScope,
  refreshManifest = false,
}: {
  queryClient: QueryClient;
  fetchAnalysisFrameManifest: BackendCommentApi["fetchAnalysisFrameManifest"];
  fetchAnalysisFrameContent: BackendCommentApi["fetchAnalysisFrameContent"];
  fetchAnalysisFrameGroupLabels: BackendCommentApi["fetchAnalysisFrameGroupLabels"];
  conversationSlugId: string;
  analysisView: AnalysisView | undefined;
  checkpointViewSnapshotId: number | undefined;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: string;
  spokenLanguages: readonly string[];
  voteCount: number | undefined;
  refreshScope: AnalysisRefreshScope;
  analysisQueryKey: AnalysisQueryKey | undefined;
  viewerScope: ViewerQueryScope;
  refreshManifest?: boolean;
}): Promise<AnalysisData> {
  const frameSectionStaleTime =
    refreshScope === "frame" ? 0 : getAnalysisStaleTime(voteCount);
  const manifest = await queryClient.fetchQuery({
    queryKey: [
      "analysisFrameManifest",
      conversationSlugId,
      analysisView,
      checkpointViewSnapshotId,
      aiLabelingEnabled,
      displayLanguage,
      spokenLanguages,
      viewerScope,
    ],
    queryFn: ({ signal }) =>
      fetchAnalysisFrameManifest({
        conversationSlugId,
        analysisView,
        checkpointViewSnapshotId,
        displayLanguage,
        viewerUserId: viewerScope.userId,
        signal,
      }),
    staleTime: refreshManifest ? 0 : frameSectionStaleTime,
    retry: false,
  });

  if (!hasManifestFrame(manifest)) {
    return buildEmptyAnalysisDataFromManifest({ manifest });
  }

  const frameKey = manifest.frameKey;
  const frameKeyPart = frameKeyQueryPart(frameKey);
  const labelStaleTime = refreshScope === null ? frameSectionStaleTime : 0;
  const scope = { displayLanguage, viewerUserId: viewerScope.userId };
  const [content, groupLabels] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: [
        "analysisFrameContent",
        conversationSlugId,
        frameKeyPart,
        displayLanguage,
        spokenLanguages,
        viewerScope,
      ],
      queryFn: ({ signal }) =>
        fetchAnalysisFrameContent({
          conversationSlugId,
          frameKey,
          ...scope,
          signal,
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
      labelStaleTime,
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
    ...content,
    groupLabels,
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
    fetchAnalysisFrameContent,
    fetchAnalysisFrameGroupLabels,
  } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const viewerScope = useViewerQueryScope();

  return useQuery({
    queryKey: [
      "analysis",
      computed(() => toValue(conversationSlugId)),
      computed(() => toValue(analysisView)),
      computed(() => toValue(checkpointViewSnapshotId)),
      computed(() => toValue(aiLabelingEnabled)),
      computed(() => displayLanguage.value),
      computed(() => [...spokenLanguages.value].sort()),
      viewerScope,
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
      const resolvedViewerScope = viewerScope.value;
      const resolvedQueryKey = [
        "analysis",
        resolvedConversationSlugId,
        resolvedAnalysisView,
        resolvedCheckpointViewSnapshotId,
        resolvedAiLabelingEnabled,
        resolvedDisplayLanguage,
        resolvedSpokenLanguages,
        resolvedViewerScope,
      ];
      const previousAnalysis =
        queryClient.getQueryData<AnalysisData>(resolvedQueryKey);
      const analysisData = await fetchAnalysisDataWithCache({
        queryClient,
        fetchAnalysisFrameManifest,
        fetchAnalysisFrameContent,
        fetchAnalysisFrameGroupLabels,
        conversationSlugId: resolvedConversationSlugId,
        analysisView: resolvedAnalysisView,
        checkpointViewSnapshotId: resolvedCheckpointViewSnapshotId,
        aiLabelingEnabled: resolvedAiLabelingEnabled,
        displayLanguage: resolvedDisplayLanguage,
        spokenLanguages: resolvedSpokenLanguages,
        voteCount: resolvedVoteCount,
        refreshScope: null,
        analysisQueryKey: resolvedQueryKey,
        viewerScope: resolvedViewerScope,
        refreshManifest:
          previousAnalysis?.manifest?.closedAnalysisSelection?.status ===
          "pending",
      });

      const snapshot = analysisData.conversationViewSnapshot;
      if (
        resolvedCheckpointViewSnapshotId === undefined &&
        snapshot !== undefined &&
        analysisData.manifest?.closedAnalysisSelection === undefined
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
              return {};
            }

            return {
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
    staleTime: () => getAnalysisStaleTime(toValue(voteCount)),
    // Poll only an active pending read as a fallback for missed events and
    // terminal worker failures. The backend alone decides whether to retry.
    refetchInterval: (query) =>
      query.state.data?.manifest?.closedAnalysisSelection?.status === "pending"
        ? 10_000
        : false,
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
  const { getErrorMessage } = useCommonApi();
  const queryClient = useQueryClient();
  const { userId } = storeToRefs(useAuthenticationStore());
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseCommentQueriesTranslations>(
    useCommentQueriesTranslations
  );
  const { markAnalysisAsStale, markCommentsAsStale } =
    useInvalidateCommentQueries();
  const lifetime = useParticipationViewerLifetime();

  const mutation = useMutation({
    mutationFn: async ({
      commentBody,
      conversationSlugId,
      isCurrent,
    }: {
      commentBody: string;
      conversationSlugId: string;
      isCurrent: () => boolean;
    }) => {
      const result = await createNewComment({
        commentBody,
        postSlugId: conversationSlugId,
        isCurrent,
      });
      return result.status === "cancelled" ? undefined : result.data;
    },
    onSuccess: async (data, variables) => {
      if (data === undefined || !variables.isCurrent()) return;
      if (data.success) {
        await cacheCreatedOpinion({
          queryClient,
          conversationSlugId: variables.conversationSlugId,
          displayedOpinionItem: data.displayedOpinionItem,
          viewerUserId: userId.value,
        });
        void markCommentsAsStale(variables.conversationSlugId);
        // Mark analysis as stale without immediate refetch
        // Let the refetchInterval handle updates based on conversation activity
        markAnalysisAsStale(variables.conversationSlugId);
      }
    },
    onError: (error: unknown, variables) => {
      if (!variables.isCurrent()) return;
      // Handle technical errors (network, server errors, etc.)
      const apiError = classifyApiError(error);
      if (apiError.kind === "transport") {
        showNotifyMessage(getErrorMessage(apiError));
      } else {
        showNotifyMessage(t("failedToCreateComment"));
      }
    },
    retry: false, // Disable auto-retry
  });
  async function mutateAsync(params: {
    commentBody: string;
    conversationSlugId: string;
  }) {
    const isCurrent = lifetime.capture();
    const result = await mutation.mutateAsync({ ...params, isCurrent });
    return isCurrent() ? result : undefined;
  }
  return { ...mutation, mutateAsync };
}

export function useDeleteCommentMutation() {
  const { deleteCommentBySlugId } = useBackendCommentApi();
  const { getErrorMessage } = useCommonApi();
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
      queryClient.setQueriesData<OpinionCache>(
        { queryKey: ["comments"] },
        (oldData) =>
          removeCachedOpinion({
            cache: oldData,
            opinionSlugId: variables.commentSlugId,
          })
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
    onError: (error: unknown) => {
      const apiError = classifyApiError(error);
      if (apiError.kind === "transport") {
        showNotifyMessage(getErrorMessage(apiError));
      } else {
        showNotifyMessage(t("failedToDeleteComment"));
      }
    },
    retry: false, // Disable auto-retry
  });
}

export function useEditOpinionMutation(conversationSlugId: string) {
  const { editOpinion } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const userStore = useUserStore();
  const { userId } = storeToRefs(useAuthenticationStore());
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  let viewerGeneration = 0;
  watch(
    [userId, displayLanguage, spokenLanguages],
    () => {
      viewerGeneration += 1;
    },
    { flush: "sync", deep: true }
  );
  onScopeDispose(() => {
    viewerGeneration += 1;
  });
  const { markCommentsAsStale, markAnalysisAsStale } =
    useInvalidateCommentQueries();
  return useMutation({
    mutationFn: (request: z.infer<typeof Dto.editOpinionRequest>) =>
      editOpinion(request),
    onMutate: async (request) => {
      const scope: OpinionQueryScope = {
        viewerUserId: userId.value,
        displayLanguage: displayLanguage.value,
        spokenLanguages: [...spokenLanguages.value],
      };
      const generation = viewerGeneration;
      const predicate = (query: { queryKey: readonly unknown[] }) =>
        isOpinionQueryForScope({ queryKey: query.queryKey, scope });
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ["comments", conversationSlugId],
          predicate,
        }),
        queryClient.cancelQueries({
          queryKey: ["opinionTarget", request.opinionSlugId],
          predicate,
        }),
      ]);
      return { scope, generation };
    },
    onSuccess: (result, request, context) => {
      if (
        context === undefined ||
        context.generation !== viewerGeneration ||
        context.scope.viewerUserId !== userId.value
      )
        return;
      const scope = context.scope;
      const predicate = (query: { queryKey: readonly unknown[] }) =>
        isOpinionQueryForScope({ queryKey: query.queryKey, scope });
      if (!result.success) {
        if (
          result.reason === "has_votes" ||
          result.reason === "not_allowed" ||
          result.reason === "conversation_locked"
        ) {
          const editing: OpinionEditingAvailability = {
            allowed: false,
            reason: result.reason,
          };
          queryClient.setQueriesData<OpinionCache>(
            { queryKey: ["comments", conversationSlugId], predicate },
            (cache) =>
              mapCachedOpinions({
                cache,
                mapOpinion: (opinion) =>
                  opinion.opinionSlugId !== request.opinionSlugId ||
                  opinion.management === undefined
                    ? opinion
                    : {
                        ...opinion,
                        management: { ...opinion.management, editing },
                      },
              })
          );
          queryClient.setQueriesData<DisplayedOpinionItem>(
            { queryKey: ["opinionTarget", request.opinionSlugId], predicate },
            (opinion) =>
              opinion?.management === undefined
                ? opinion
                : {
                    ...opinion,
                    management: { ...opinion.management, editing },
                  }
          );
        }
        if (
          result.reason === "version_conflict" ||
          result.reason === "not_allowed"
        ) {
          void queryClient.invalidateQueries({
            queryKey: ["opinionTarget", request.opinionSlugId],
            predicate,
          });
          void queryClient.invalidateQueries({
            queryKey: ["comments", conversationSlugId],
            predicate,
          });
        }
        return;
      }
      const opinion = result.displayedOpinionItem;
      const applySavedOpinion = (current: DisplayedOpinionItem | undefined) =>
        current === undefined ||
        current.displayContent.sourceVersion === request.sourceVersion ||
        current.displayContent.sourceVersion ===
          opinion.displayContent.sourceVersion
          ? opinion
          : current;
      queryClient.setQueryData<DisplayedOpinionItem>(
        getOpinionTargetQueryKey({
          opinionSlugId: opinion.opinionSlugId,
          ...scope,
        }),
        applySavedOpinion
      );
      queryClient.setQueriesData<OpinionCache>(
        { queryKey: ["comments", conversationSlugId], predicate },
        (cache) =>
          mapCachedOpinions({
            cache,
            mapOpinion: (current) =>
              current.opinionSlugId === opinion.opinionSlugId
                ? applySavedOpinion(current)
                : current,
          })
      );
      for (const item of userStore.profileData.userCommentList) {
        if (item.opinionItem.opinionSlugId === opinion.opinionSlugId)
          item.opinionItem = opinion;
      }
      void markCommentsAsStale(conversationSlugId);
      markAnalysisAsStale(conversationSlugId);
    },
    retry: false,
  });
}

const analysisFamilies = new Set([
  "analysis",
  "analysisCheckpoints",
  "analysisFrameManifest",
  "analysisFrameContent",
  "analysisFrameGroupLabels",
]);

export function useInvalidateCommentQueries() {
  const queryClient = useQueryClient();
  // Invalidate the assembled view and its dependencies together. Otherwise its
  // refetch can immediately reassemble the same stale manifest or statement text.
  function invalidateAnalysisQueries({
    conversationSlugId,
    refetchType,
    includeComments = false,
  }: {
    conversationSlugId: string;
    refetchType: "active" | "none";
    includeComments?: boolean;
  }) {
    return queryClient.invalidateQueries({
      predicate: ({ queryKey: [family, slug] }) =>
        slug === conversationSlugId &&
        typeof family === "string" &&
        (analysisFamilies.has(family) ||
          (includeComments && family === "comments")),
      refetchType,
    });
  }

  return {
    invalidateComments: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", conversationSlugId],
      });
    },
    invalidateAnalysis: (conversationSlugId: string) =>
      invalidateAnalysisQueries({ conversationSlugId, refetchType: "active" }),
    markAnalysisAsStale: (conversationSlugId: string) => {
      void invalidateAnalysisQueries({
        conversationSlugId,
        refetchType: "none",
      });
    },
    markCommentsAsStale: (conversationSlugId: string) => {
      return queryClient.invalidateQueries({
        queryKey: ["comments", conversationSlugId],
        refetchType: "none", // Mark as stale but don't refetch immediately
      });
    },
    invalidateAll: (conversationSlugId: string) =>
      invalidateAnalysisQueries({
        conversationSlugId,
        refetchType: "active",
        includeComments: true,
      }),
  };
}
