import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type {
  ApiV1MaxdiffItemsFetchPost200ResponseItemsInner,
  ApiV1MaxdiffLoadPost200Response,
} from "src/api";
import type { ExtendedConversation, MaxDiffComparison } from "src/shared/types/zod";
import type { MaxDiffState } from "src/utils/maxdiff";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendAuthApi } from "../auth";
import { useInvalidateConversationQuery } from "../post/useConversationQuery";
import { useMaxDiffApi } from "./maxdiff";

export function useMaxDiffItemsQuery({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const { fetchMaxDiffItems } = useMaxDiffApi();

  return useQuery({
    queryKey: [
      "maxdiff-items",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: async (): Promise<
      ApiV1MaxdiffItemsFetchPost200ResponseItemsInner[]
    > => {
      const response = await fetchMaxDiffItems({
        conversationSlugId: toValue(conversationSlugId),
        lifecycleFilter: "active",
      });
      if (response.status !== "success") {
        throw new Error("Failed to fetch MaxDiff items");
      }
      return response.data.items;
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useMaxDiffLoadQuery({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const { loadMaxDiffResult } = useMaxDiffApi();

  return useQuery({
    queryKey: [
      "maxdiff-load",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: async (): Promise<ApiV1MaxdiffLoadPost200Response> => {
      const response = await loadMaxDiffResult({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to load MaxDiff state");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export interface MaxDiffSaveContext {
  previousState: MaxDiffState;
  previousIsComplete: boolean;
  previousFinalRanking: string[];
  previousCandidates: string[];
  previousCandidateBuffer: string[][];
  isFirstVote: boolean;
}

interface MaxDiffSaveMutationParams {
  ranking: string[] | null;
  comparisons: MaxDiffComparison[];
  isComplete: boolean;
  context: MaxDiffSaveContext;
}

export function useMaxDiffSaveMutation({
  conversationSlugId,
  onRollback,
  onSaveSuccess,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  onRollback: (context: MaxDiffSaveContext) => void;
  onSaveSuccess: () => void;
}) {
  const { saveMaxDiffResult } = useMaxDiffApi();
  const { updateAuthState } = useBackendAuthApi();
  const { invalidateConversation } = useInvalidateConversationQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MaxDiffSaveMutationParams) => {
      const response = await saveMaxDiffResult({
        conversationSlugId: toValue(conversationSlugId),
        ranking: params.ranking,
        comparisons: params.comparisons,
        isComplete: params.isComplete,
      });
      if (response.status !== "success") {
        throw new Error("Failed to save MaxDiff result");
      }
    },

    onSuccess: async (_data, variables) => {
      await updateAuthState({ partialLoginStatus: { isKnown: true } });

      // Optimistically bump counts in the conversation query cache
      const slugId = toValue(conversationSlugId);
      queryClient.setQueryData(
        ["conversation", slugId],
        (old: ExtendedConversation | undefined) => {
          if (old === undefined) return old;
          return {
            ...old,
            metadata: {
              ...old.metadata,
              voteCount: old.metadata.voteCount + 1,
              totalVoteCount: old.metadata.totalVoteCount + 1,
              ...(variables.context.isFirstVote
                ? {
                    participantCount: old.metadata.participantCount + 1,
                    totalParticipantCount: old.metadata.totalParticipantCount + 1,
                  }
                : {}),
            },
          };
        },
      );

      // Full server sync on key transitions
      if (variables.context.isFirstVote || variables.isComplete || variables.comparisons.length === 0) {
        invalidateConversation(slugId);
      }
      onSaveSuccess();
    },

    onError: (_error, variables) => {
      onRollback(variables.context);
    },

    retry: false,
  });
}