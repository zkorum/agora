import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type {
  ApiV1MaxdiffItemsFetchPost200ResponseItemsInner,
  ApiV1MaxdiffLoadPost200Response,
} from "src/api";
import type { ExtendedConversation, MaxDiffComparison } from "src/shared/types/zod";
import type { MaxDiffState } from "src/utils/maxdiff";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendAuthApi } from "../auth";
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

      const slugId = toValue(conversationSlugId);

      // Cancel in-flight refetches to prevent read replica stale data
      // from overwriting our optimistic updates (same pattern as Polis useVoteMutation)
      await queryClient.cancelQueries({ queryKey: ["conversation", slugId] });
      await queryClient.cancelQueries({ queryKey: ["maxdiff-load", slugId] });

      // Compute count deltas (supports vote, undo, and redo)
      const comparisonDelta =
        variables.comparisons.length -
        variables.context.previousState.comparisons.length;
      const becameParticipant =
        variables.context.previousState.comparisons.length === 0 &&
        variables.comparisons.length > 0;
      const lostParticipant =
        variables.context.previousState.comparisons.length > 0 &&
        variables.comparisons.length === 0;
      const participantDelta = becameParticipant ? 1 : lostParticipant ? -1 : 0;

      // Optimistically update conversation counts
      queryClient.setQueryData(
        ["conversation", slugId],
        (old: ExtendedConversation | undefined) => {
          if (old === undefined) return old;
          return {
            ...old,
            metadata: {
              ...old.metadata,
              voteCount: old.metadata.voteCount + comparisonDelta,
              totalVoteCount: old.metadata.totalVoteCount + comparisonDelta,
              ...(participantDelta !== 0
                ? {
                    participantCount:
                      old.metadata.participantCount + participantDelta,
                    totalParticipantCount:
                      old.metadata.totalParticipantCount + participantDelta,
                  }
                : {}),
            },
          };
        },
      );

      // Write saved state directly to cache instead of invalidating
      // (avoids read replica lag returning stale data before buffer flushes)
      queryClient.setQueryData<ApiV1MaxdiffLoadPost200Response>(
        ["maxdiff-load", slugId],
        {
          ranking: variables.ranking,
          comparisons: variables.comparisons.map((c) => ({
            best: c.best,
            worst: c.worst,
            set: c.set,
          })),
          isComplete: variables.isComplete,
        },
      );

      // Note: We don't invalidate the conversation query here to avoid
      // read replica lag overwriting the optimistic counts above.
      // The conversation query refreshes naturally on analysis tab switch
      // (via the route watcher in useConversationParentState).
      onSaveSuccess();
    },

    onError: (_error, variables) => {
      onRollback(variables.context);
    },

    retry: false,
  });
}