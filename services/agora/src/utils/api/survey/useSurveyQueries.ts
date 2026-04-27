import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { SurveyStatusCheckResponse } from "src/shared/types/dto";
import {
  type SurveyAnswerSubmission,
  type SurveyConfig,
  type SurveyGateSummary,
} from "src/shared/types/zod";
import { useBackendAuthApi } from "src/utils/api/auth";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { updateConversationQueryCache } from "../post/useConversationQuery";
import { useBackendSurveyApi } from "./survey";

function updateSurveyGateViewerCaches({
  queryClient,
  conversationSlugId,
  surveyGate,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  conversationSlugId: string;
  surveyGate: SurveyGateSummary;
}): void {
  queryClient.setQueriesData<SurveyStatusCheckResponse>(
    { queryKey: ["survey-status", conversationSlugId] },
    (oldData) => {
      if (oldData === undefined) {
        return oldData;
      }

      return {
        ...oldData,
        surveyGate,
      };
    }
  );

  updateConversationQueryCache({
    queryClient,
    conversationSlugId,
    updateConversation: (conversation) => ({
      ...conversation,
      interaction: {
        ...conversation.interaction,
        surveyGate,
      },
    }),
  });
}

async function invalidateSurveyViewerQueries({
  queryClient,
  conversationSlugId,
  includeDerivedSurveyQueries = false,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  conversationSlugId: string;
  includeDerivedSurveyQueries?: boolean;
}): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: ["survey-form", conversationSlugId],
      refetchType: "all",
    }),
    queryClient.invalidateQueries({
      queryKey: ["survey-status", conversationSlugId],
      refetchType: "all",
    }),
    queryClient.invalidateQueries({
      queryKey: ["conversation", conversationSlugId],
      refetchType: "all",
    }),
    queryClient.invalidateQueries({
      queryKey: ["feed"],
      refetchType: "none",
    }),
  ];

  if (includeDerivedSurveyQueries) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: ["survey-completion-counts", conversationSlugId],
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: ["survey-results-aggregated", conversationSlugId],
        refetchType: "all",
      })
    );
  }

  await Promise.all(invalidations);
}

export function useSurveyStatusQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { checkSurveyStatus } = useBackendSurveyApi();

  return useQuery({
    queryKey: ["survey-status", computed(() => toValue(conversationSlugId))],
    queryFn: async () => {
      const response = await checkSurveyStatus({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to load survey status");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled) && toValue(conversationSlugId) !== ""),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useSurveyFormQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchSurveyForm } = useBackendSurveyApi();

  return useQuery({
    queryKey: ["survey-form", computed(() => toValue(conversationSlugId))],
    queryFn: async () => {
      const response = await fetchSurveyForm({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to load survey form");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled) && toValue(conversationSlugId) !== ""),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useSurveyResultsAggregatedQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchSurveyResultsAggregated } = useBackendSurveyApi();

  return useQuery({
    queryKey: ["survey-results-aggregated", computed(() => toValue(conversationSlugId))],
    queryFn: async () => {
      const response = await fetchSurveyResultsAggregated({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to load survey results");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled) && toValue(conversationSlugId) !== ""),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useSurveyCompletionCountsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchSurveyCompletionCounts } = useBackendSurveyApi();

  return useQuery({
    queryKey: ["survey-completion-counts", computed(() => toValue(conversationSlugId))],
    queryFn: async () => {
      const response = await fetchSurveyCompletionCounts({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to load survey completion counts");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled) && toValue(conversationSlugId) !== ""),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useSurveyAnswerSaveMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { saveSurveyAnswer } = useBackendSurveyApi();
  const { updateAuthState } = useBackendAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionSlugId,
      answer,
    }: {
      questionSlugId: string;
      answer: SurveyAnswerSubmission | null;
    }) => {
      const response = await saveSurveyAnswer({
        conversationSlugId: toValue(conversationSlugId),
        questionSlugId,
        answer,
      });
      if (response.status !== "success") {
        throw new Error("Failed to save survey answer");
      }
      return response.data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        return;
      }

      await updateAuthState({ partialLoginStatus: { isKnown: true } });

      const slugId = toValue(conversationSlugId);
      await invalidateSurveyViewerQueries({
        queryClient,
        conversationSlugId: slugId,
      });
    },
    retry: false,
  });
}

export function useSurveyWithdrawMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { withdrawSurveyResponse } = useBackendSurveyApi();
  const { updateAuthState } = useBackendAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await withdrawSurveyResponse({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to withdraw survey response");
      }
      return response.data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        return;
      }

      await updateAuthState({ partialLoginStatus: { isKnown: true } });

      const slugId = toValue(conversationSlugId);
      await invalidateSurveyViewerQueries({
        queryClient,
        conversationSlugId: slugId,
      });
    },
    retry: false,
  });
}

export function useSurveyConfigUpdateMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { updateSurveyConfig } = useBackendSurveyApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ surveyConfig }: { surveyConfig: SurveyConfig }) => {
      const response = await updateSurveyConfig({
        conversationSlugId: toValue(conversationSlugId),
        surveyConfig,
      });
      if (response.status !== "success") {
        throw new Error("Failed to update survey config");
      }
      return response.data;
    },
    onSuccess: async (data) => {
      const slugId = toValue(conversationSlugId);
      if (data.surveyGate !== undefined) {
        updateSurveyGateViewerCaches({
          queryClient,
          conversationSlugId: slugId,
          surveyGate: data.surveyGate,
        });
      }

      await invalidateSurveyViewerQueries({
        queryClient,
        conversationSlugId: slugId,
        includeDerivedSurveyQueries: true,
      });
    },
    retry: false,
  });
}

export function useSurveyConfigDeleteMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { deleteSurveyConfig } = useBackendSurveyApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await deleteSurveyConfig({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to delete survey config");
      }
      return response.data;
    },
    onSuccess: async () => {
      await invalidateSurveyViewerQueries({
        queryClient,
        conversationSlugId: toValue(conversationSlugId),
        includeDerivedSurveyQueries: true,
      });
    },
    retry: false,
  });
}
