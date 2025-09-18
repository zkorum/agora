import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useBackendCommentApi } from "src/utils/api/comment";
import type { CommentTabFilters } from "src/utils/api/comment";
import type { PolisKey } from "src/shared/types/zod";
import type { AxiosErrorResponse } from "src/utils/api/common";
import { getErrorMessage, shouldRetryError } from "src/utils/api/common";
import { useNotify } from "src/utils/ui/notify";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  useCommentQueriesTranslations,
  type UseCommentQueriesTranslations,
} from "./useCommentQueries.i18n";

export function useCommentsQuery({
  conversationSlugId,
  filter,
  clusterKey,
  enabled = true,
}: {
  conversationSlugId: string;
  filter: CommentTabFilters;
  clusterKey?: PolisKey;
  enabled?: boolean;
}) {
  const { fetchCommentsForPost } = useBackendCommentApi();

  const query = useQuery({
    queryKey: ["comments", conversationSlugId, filter, clusterKey],
    queryFn: () => fetchCommentsForPost(conversationSlugId, filter, clusterKey),
    enabled: enabled && conversationSlugId.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes for comments
  });

  return {
    ...query,
    // Expose additional error context for UI
    hasError: query.isError,
    errorMessage: query.error.value
      ? getErrorMessage(query.error.value as AxiosErrorResponse)
      : null,
    isRetryable: query.error.value
      ? shouldRetryError((query.error.value as AxiosErrorResponse)?.code)
      : false,
  };
}

export function useHiddenCommentsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: string;
  enabled?: boolean;
}) {
  const { fetchHiddenCommentsForPost } = useBackendCommentApi();

  const query = useQuery({
    queryKey: ["hiddenComments", conversationSlugId],
    queryFn: () => fetchHiddenCommentsForPost(conversationSlugId),
    enabled: enabled && conversationSlugId.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes for hidden comments
  });

  return {
    ...query,
    hasError: query.isError,
    errorMessage: query.error.value
      ? getErrorMessage(query.error.value as AxiosErrorResponse)
      : null,
    isRetryable: query.error.value
      ? shouldRetryError((query.error.value as AxiosErrorResponse)?.code)
      : false,
  };
}

export function useAnalysisQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: string;
  enabled?: boolean;
}) {
  const { fetchAnalysisData } = useBackendCommentApi();

  const query = useQuery({
    queryKey: ["analysis", conversationSlugId],
    queryFn: () => fetchAnalysisData({ conversationSlugId }),
    enabled: enabled && conversationSlugId.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes for analysis data
  });

  return {
    ...query,
    hasError: query.isError,
    errorMessage: query.error.value
      ? getErrorMessage(query.error.value as AxiosErrorResponse)
      : null,
    isRetryable: query.error.value
      ? shouldRetryError((query.error.value as AxiosErrorResponse)?.code)
      : false,
  };
}

export function useCreateCommentMutation() {
  const { createNewComment } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();

  return useMutation({
    mutationFn: ({
      commentBody,
      conversationSlugId,
    }: {
      commentBody: string;
      conversationSlugId: string;
    }) => createNewComment(commentBody, conversationSlugId),
    onSuccess: (_data, variables) => {
      // Invalidate and refetch comments for this conversation
      void queryClient.invalidateQueries({
        queryKey: ["comments", variables.conversationSlugId],
      });
      // Also invalidate analysis data as it might change
      void queryClient.invalidateQueries({
        queryKey: ["analysis", variables.conversationSlugId],
      });
    },
    onError: (error: AxiosErrorResponse) => {
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage("Failed to create comment. Please try again.");
      }
    },
  });
}

export function useDeleteCommentMutation() {
  const { deleteCommentBySlugId } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseCommentQueriesTranslations>(
    useCommentQueriesTranslations
  );

  return useMutation({
    mutationFn: (commentSlugId: string) => deleteCommentBySlugId(commentSlugId),
    onSuccess: (_data, _variables, _context: unknown) => {
      // Invalidate all comment queries to refresh the data
      void queryClient.invalidateQueries({
        queryKey: ["comments"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["hiddenComments"],
      });
      showNotifyMessage(t("commentDeletedSuccessfully"));
    },
    onError: (error: AxiosErrorResponse) => {
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage(t("failedToDeleteComment"));
      }
    },
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
    invalidateAnalysis: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
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
