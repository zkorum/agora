import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisKey } from "src/shared/types/zod";
import type { OpinionItem } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import type { Ref } from "vue";

import { useNotify } from "../../ui/notify";
import type { AxiosErrorResponse } from "../common";
import { getErrorMessage } from "../common";
import type { CommentTabFilters } from "./comment";
import { useBackendCommentApi } from "./comment";
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
  conversationSlugId: string;
  filter: CommentTabFilters;
  clusterKey?: PolisKey;
  voteCount?: number;
  enabled?: boolean | Ref<boolean>;
}) {
  const { fetchCommentsForPost } = useBackendCommentApi();

  return useQuery({
    queryKey: ["comments", conversationSlugId, filter, clusterKey],
    queryFn: () => fetchCommentsForPost(conversationSlugId, filter, clusterKey),
    enabled: enabled,
    staleTime: getAnalysisStaleTime(voteCount), // Dynamic cache based on conversation size
    // Note: bypassed by manual invalidation on tab changes
    retry: false, // Disable auto-retry
  });
}

export function useHiddenCommentsQuery({
  conversationSlugId,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: string;
  voteCount?: number;
  enabled?: boolean | Ref<boolean>;
}) {
  const { fetchHiddenCommentsForPost } = useBackendCommentApi();

  return useQuery({
    queryKey: ["hiddenComments", conversationSlugId],
    queryFn: () => fetchHiddenCommentsForPost(conversationSlugId),
    enabled: enabled && conversationSlugId.length > 0,
    staleTime: getAnalysisStaleTime(voteCount), // Dynamic cache based on conversation size
    // Note: bypassed by manual invalidation on tab changes
    retry: false, // Disable auto-retry
  });
}

/**
 * Calculate optimal stale time based on conversation size
 * After this time, data is considered stale and will refetch on next access
 *
 * Backend constraints:
 * - Math-updater scans every 2s (MATH_UPDATER_SCAN_INTERVAL_MS)
 * - Minimum 20s between updates per conversation (MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS)
 * - Singleton deduplication windows: 15s, 30s, 60s, 120s (based on vote count)
 * - Network processing time: ~2-5s
 *
 * Buffer calculation: singleton window + 2s scan + 5s network + 5s safety = 12s buffer
 */
function getAnalysisStaleTime(voteCount?: number): number {
  if (!voteCount) return 1000 * 60 * 2; // Default 2 minutes if unknown

  // Buffer for scan interval (2s) + network processing (5s) + safety margin (5s)
  const BUFFER_MS = 12000; // 12 seconds buffer

  if (voteCount < 100) {
    // Small conversations: 15s singleton + 12s buffer = 27s
    return 15000 + BUFFER_MS;
  } else if (voteCount < 10000) {
    // Medium conversations: 30s singleton + 12s buffer = 42s
    return 30000 + BUFFER_MS;
  } else if (voteCount < 100000) {
    // Large conversations: 60s singleton + 12s buffer = 72s
    return 60000 + BUFFER_MS;
  } else {
    // Huge conversations (100K+ votes): 120s singleton + 12s buffer = 132s
    return 120000 + BUFFER_MS;
  }
}

export function useAnalysisQuery({
  conversationSlugId,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: string;
  voteCount?: number;
  enabled?: boolean | Ref<boolean>;
}) {
  const { fetchAnalysisData } = useBackendCommentApi();

  return useQuery({
    queryKey: ["analysis", conversationSlugId],
    queryFn: () => fetchAnalysisData({ conversationSlugId }),
    enabled: enabled,
    staleTime: getAnalysisStaleTime(voteCount), // Dynamic cache based on conversation size
    // Note: When votes/comments happen, markAnalysisAsStale() is called
    // This marks data as stale immediately, so next access will refetch
    retry: false, // Disable auto-retry
  });
}

export function useCreateCommentMutation() {
  const { createNewComment } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { markAnalysisAsStale } = useInvalidateCommentQueries();

  return useMutation({
    mutationFn: ({
      commentBody,
      conversationSlugId,
    }: {
      commentBody: string;
      conversationSlugId: string;
    }) => createNewComment(commentBody, conversationSlugId),
    onSuccess: (data, variables) => {
      // Only proceed if the comment creation was successful
      if (data.success) {
        // Invalidate and refetch comments for this conversation
        void queryClient.invalidateQueries({
          queryKey: ["comments", variables.conversationSlugId],
        });
        // Mark analysis as stale without immediate refetch
        // Let the refetchInterval handle updates based on conversation activity
        markAnalysisAsStale(variables.conversationSlugId);
      } else {
        // Handle business logic failures (like conversation_locked)
        showNotifyMessage(`Failed to create comment: ${data.reason}`);
      }
    },
    onError: (error: AxiosErrorResponse) => {
      // Handle technical errors (network, server errors, etc.)
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage("Failed to create comment. Please try again.");
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

  return useMutation({
    mutationFn: (commentSlugId: string) => deleteCommentBySlugId(commentSlugId),
    onSuccess: (_data, commentSlugId, _context: unknown) => {
      // Remove from TanStack Query cache (conversation page - all filters)
      queryClient.setQueriesData<OpinionItem[]>(
        { queryKey: ["comments"] },
        (oldData) =>
          oldData?.filter(
            (opinion) => opinion.opinionSlugId !== commentSlugId
          ) ?? []
      );

      queryClient.setQueriesData<OpinionItem[]>(
        { queryKey: ["hiddenComments"] },
        (oldData) =>
          oldData?.filter(
            (opinion) => opinion.opinionSlugId !== commentSlugId
          ) ?? []
      );

      // Remove from Pinia store (profile page)
      const indexToRemove = userStore.profileData.userCommentList.findIndex(
        (item) => item.opinionItem.opinionSlugId === commentSlugId
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
    },
    forceRefreshAnalysis: (conversationSlugId: string) => {
      // Force immediate refetch bypassing staleTime completely
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
        refetchType: "active", // Force active queries to refetch immediately
      });

      // Also trigger immediate refetch for any matching queries
      void queryClient.refetchQueries({
        queryKey: ["analysis", conversationSlugId],
      });
    },
    markAnalysisAsStale: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
        refetchType: "none", // Mark as stale but don't refetch immediately
      });
    },
    invalidateAll: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
      });
    },
  };
}
