import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import type {
  SurveyFormFetchResponse,
  SurveyStatusCheckResponse,
} from "src/shared/types/dto";
import {
  type AnalysisView,
  type SurveyAnswerSubmission,
  type SurveyConfig,
  type SurveyGateSummary,
  type SurveyRouteResolution,
} from "src/shared/types/zod";
import { useBackendAuthApi } from "src/utils/api/auth";
import { isSurveyAnswerSubmittable } from "src/utils/survey/answer";
import { useNotify } from "src/utils/ui/notify";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { updateConversationQueryCache } from "../post/useConversationQuery";
import { useBackendSurveyApi } from "./survey";

export type SurveyFormData = Extract<SurveyFormFetchResponse, { success: true }>;
type SurveyFormQuestion = SurveyFormData["questions"][number];

function deriveSurveyRouteResolutionFromForm({
  surveyGate,
  surveyForm,
}: {
  surveyGate: SurveyGateSummary;
  surveyForm: SurveyFormData | undefined;
}): SurveyRouteResolution | undefined {
  if (!surveyGate.hasSurvey) {
    return { kind: "none" };
  }
  if (surveyGate.status === "complete_valid") {
    return { kind: "summary" };
  }
  if (surveyForm === undefined) {
    return undefined;
  }

  const incompleteQuestion = surveyForm.questions.find((question) => {
    return !question.isCurrentAnswerValid && !question.isPassed;
  });
  if (incompleteQuestion?.questionSlugId !== undefined) {
    return {
      kind: "question",
      questionSlugId: incompleteQuestion.questionSlugId,
    };
  }

  const hasRequiredQuestion = surveyForm.questions.some((question) => {
    return question.isRequired;
  });
  if (!hasRequiredQuestion) {
    return { kind: "none" };
  }

  const firstQuestionSlugId = surveyForm.questions[0]?.questionSlugId;
  return firstQuestionSlugId === undefined
    ? { kind: "none" }
    : { kind: "question", questionSlugId: firstQuestionSlugId };
}

function getCachedSurveyForm({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): SurveyFormData | undefined {
  const formEntries = queryClient.getQueriesData<SurveyFormData>({
    queryKey: ["survey-form", conversationSlugId],
  });
  return formEntries.find((entry) => entry[1] !== undefined)?.[1];
}

function updateSurveyStatusCache({
  queryClient,
  conversationSlugId,
  surveyGate,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  surveyGate: SurveyGateSummary;
}): void {
  const cachedSurveyForm = getCachedSurveyForm({ queryClient, conversationSlugId });
  const routeResolution = deriveSurveyRouteResolutionFromForm({
    surveyGate,
    surveyForm: cachedSurveyForm,
  });

  queryClient.setQueriesData<SurveyStatusCheckResponse>(
    { queryKey: ["survey-status", conversationSlugId] },
    (oldData) => {
      if (oldData === undefined) {
        return oldData;
      }

      return {
        ...oldData,
        surveyGate,
        routeResolution: routeResolution ?? oldData.routeResolution,
      };
    }
  );
}

function updateSurveyGateViewerCaches({
  queryClient,
  conversationSlugId,
  surveyGate,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  surveyGate: SurveyGateSummary;
}): void {
  updateSurveyStatusCache({ queryClient, conversationSlugId, surveyGate });

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

function removeSurveyFormCaches({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): void {
  queryClient.removeQueries({ queryKey: ["survey-form", conversationSlugId] });
}

function updateSurveyQuestionWithSubmittedAnswer({
  question,
  answer,
}: {
  question: SurveyFormQuestion;
  answer: SurveyAnswerSubmission | null;
}): SurveyFormQuestion {
  if (answer === null) {
    return {
      ...question,
      currentAnswer: undefined,
      isPassed: !question.isRequired,
      isMissingRequired: question.isRequired,
      isStale: false,
      isCurrentAnswerValid: false,
      answeredQuestionSemanticVersion: question.isRequired
        ? undefined
        : question.currentSemanticVersion,
    };
  }

  const isCurrentAnswerValid = isSurveyAnswerSubmittable({ question, answer });
  return {
    ...question,
    currentAnswer: answer,
    isPassed: false,
    isMissingRequired: question.isRequired && !isCurrentAnswerValid,
    isStale: false,
    isCurrentAnswerValid,
    answeredQuestionSemanticVersion: question.currentSemanticVersion,
  };
}

function updateSurveyFormAnswerCaches({
  queryClient,
  conversationSlugId,
  questionSlugId,
  answer,
  surveyGate,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  questionSlugId: string;
  answer: SurveyAnswerSubmission | null;
  surveyGate: SurveyGateSummary;
}): void {
  queryClient.setQueriesData<SurveyFormData>(
    { queryKey: ["survey-form", conversationSlugId] },
    (oldData) => {
      if (oldData === undefined) {
        return oldData;
      }

      return {
        ...oldData,
        surveyGate,
        questions: oldData.questions.map((question) => {
          if (question.questionSlugId !== questionSlugId) {
            return question;
          }
          return updateSurveyQuestionWithSubmittedAnswer({ question, answer });
        }),
      };
    }
  );
}

function clearSurveyFormAnswerCaches({
  queryClient,
  conversationSlugId,
  surveyGate,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  surveyGate: SurveyGateSummary;
}): void {
  queryClient.setQueriesData<SurveyFormData>(
    { queryKey: ["survey-form", conversationSlugId] },
    (oldData) => {
      if (oldData === undefined) {
        return oldData;
      }

      return {
        ...oldData,
        surveyGate,
        questions: oldData.questions.map((question) => ({
          ...question,
          currentAnswer: undefined,
          isPassed: false,
          isMissingRequired: question.isRequired,
          isStale: false,
          isCurrentAnswerValid: false,
          answeredQuestionSemanticVersion: undefined,
        })),
      };
    }
  );
}

async function markSurveyViewerQueriesStale({
  queryClient,
  conversationSlugId,
  includeDerivedSurveyQueries = false,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  includeDerivedSurveyQueries?: boolean;
}): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: ["survey-form", conversationSlugId],
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: ["survey-status", conversationSlugId],
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: ["conversation", conversationSlugId],
      refetchType: "none",
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
        refetchType: "none",
      }),
      queryClient.invalidateQueries({
        queryKey: ["survey-results-aggregated", conversationSlugId],
        refetchType: "none",
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
  const { showNotifyMessage } = useNotify();

  return useQuery({
    queryKey: ["survey-form", computed(() => toValue(conversationSlugId))],
    queryFn: async (): Promise<SurveyFormData> => {
      const response = await fetchSurveyForm({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success") {
        throw new Error("Failed to load survey form");
      }
      if (!response.data.success) {
        if (response.data.reason === "content_not_found") {
          showNotifyMessage("Original content not found");
        }
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
  analysisView,
  checkpointViewSnapshotId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  analysisView?: MaybeRefOrGetter<AnalysisView | undefined>;
  checkpointViewSnapshotId?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchSurveyResultsAggregated } = useBackendSurveyApi();

  return useQuery({
    queryKey: [
      "survey-results-aggregated",
      computed(() => toValue(conversationSlugId)),
      computed(() => toValue(analysisView)),
      computed(() => toValue(checkpointViewSnapshotId)),
    ],
    queryFn: async () => {
      const response = await fetchSurveyResultsAggregated({
        conversationSlugId: toValue(conversationSlugId),
        analysisView: toValue(analysisView),
        checkpointViewSnapshotId: toValue(checkpointViewSnapshotId),
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
    onSuccess: async (data, variables) => {
      if (!data.success) {
        return;
      }

      await updateAuthState({ partialLoginStatus: { isKnown: true } });

      const slugId = toValue(conversationSlugId);
      updateSurveyFormAnswerCaches({
        queryClient,
        conversationSlugId: slugId,
        questionSlugId: variables.questionSlugId,
        answer: variables.answer,
        surveyGate: data.surveyGate,
      });
      updateSurveyGateViewerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
      });
      await markSurveyViewerQueriesStale({
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
      clearSurveyFormAnswerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
      });
      updateSurveyGateViewerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
      });
      await markSurveyViewerQueriesStale({
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
      removeSurveyFormCaches({ queryClient, conversationSlugId: slugId });
      updateSurveyGateViewerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
      });

      await markSurveyViewerQueriesStale({
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
    onSuccess: async (data) => {
      const slugId = toValue(conversationSlugId);
      removeSurveyFormCaches({ queryClient, conversationSlugId: slugId });
      updateSurveyGateViewerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
      });
      await markSurveyViewerQueriesStale({
        queryClient,
        conversationSlugId: slugId,
        includeDerivedSurveyQueries: true,
      });
    },
    retry: false,
  });
}
