import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useBackendPostApi } from "src/utils/api/post/post";
import {
  type ConversationMutationsTranslations,
  conversationMutationsTranslations,
} from "src/utils/api/post/useConversationMutations.i18n";
import { useNotify } from "src/utils/ui/notify";

export function useCloseConversationMutation() {
  const queryClient = useQueryClient();
  const { closeConversation } = useBackendPostApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ConversationMutationsTranslations>(
    conversationMutationsTranslations
  );

  return useMutation({
    mutationFn: ({ conversationSlugId }: { conversationSlugId: string }) => {
      return closeConversation({ conversationSlugId });
    },

    // Optimistic update: update cache BEFORE backend responds
    onMutate: async ({ conversationSlugId }) => {
      // Cancel outgoing refetches to prevent them from overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ["conversation", conversationSlugId],
      });

      // Snapshot previous values for rollback
      const previousConversations = queryClient.getQueriesData({
        queryKey: ["conversation", conversationSlugId],
      });

      // Optimistically update all conversation cache entries
      queryClient.setQueriesData<ExtendedConversation>(
        { queryKey: ["conversation", conversationSlugId] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            metadata: {
              ...oldData.metadata,
              isClosed: true,
            },
          };
        }
      );

      return { previousConversations };
    },

    onSuccess: (data, { conversationSlugId }) => {
      if (data.success) {
        // Optimistic update was correct, mark feed as stale for next visit
        void queryClient.invalidateQueries({
          queryKey: ["feed"],
          refetchType: "none",
        });
      } else {
        // Handle error reasons
        if (data.reason === "not_allowed") {
          showNotifyMessage(t("closeNotAllowed"));
        } else if (data.reason === "already_closed") {
          showNotifyMessage(t("alreadyClosed"));
        }

        // Invalidate conversation to get fresh state from server
        void queryClient.invalidateQueries({
          queryKey: ["conversation", conversationSlugId],
        });
      }
    },

    onError: (_error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousConversations) {
        for (const [queryKey, data] of context.previousConversations) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      showNotifyMessage(t("closeError"));
    },

    retry: false,
  });
}

export function useOpenConversationMutation() {
  const queryClient = useQueryClient();
  const { openConversation } = useBackendPostApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ConversationMutationsTranslations>(
    conversationMutationsTranslations
  );

  return useMutation({
    mutationFn: ({ conversationSlugId }: { conversationSlugId: string }) => {
      return openConversation({ conversationSlugId });
    },

    // Optimistic update: update cache BEFORE backend responds
    onMutate: async ({ conversationSlugId }) => {
      // Cancel outgoing refetches to prevent them from overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ["conversation", conversationSlugId],
      });

      // Snapshot previous values for rollback
      const previousConversations = queryClient.getQueriesData({
        queryKey: ["conversation", conversationSlugId],
      });

      // Optimistically update all conversation cache entries
      queryClient.setQueriesData<ExtendedConversation>(
        { queryKey: ["conversation", conversationSlugId] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            metadata: {
              ...oldData.metadata,
              isClosed: false,
            },
          };
        }
      );

      return { previousConversations };
    },

    onSuccess: (data, { conversationSlugId }) => {
      if (data.success) {
        // Optimistic update was correct, mark feed as stale for next visit
        void queryClient.invalidateQueries({
          queryKey: ["feed"],
          refetchType: "none",
        });
      } else {
        // Handle error reasons
        if (data.reason === "not_allowed") {
          showNotifyMessage(t("openNotAllowed"));
        } else if (data.reason === "already_open") {
          showNotifyMessage(t("alreadyOpen"));
        }

        // Invalidate conversation to get fresh state from server
        void queryClient.invalidateQueries({
          queryKey: ["conversation", conversationSlugId],
        });
      }
    },

    onError: (_error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousConversations) {
        for (const [queryKey, data] of context.previousConversations) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      showNotifyMessage(t("openError"));
    },

    retry: false,
  });
}
