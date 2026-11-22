import {
  CancelledError,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  SurveyAnswerSaveRequest,
  SurveyFormSnapshot,
  SurveyResponseWithdrawRequest,
} from "src/shared/types/dto";
import type {
  AnalysisView,
  SurveyAnswerDraft,
  SurveyConfig,
} from "src/shared/types/zod";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useLanguageStore } from "src/stores/language";
import {
  getSurveyFormQueryKey,
  getSurveyStatusQueryKey,
} from "src/utils/query/conversationQueryKeys";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { buildSurveyAnswerSubmission } from "src/utils/survey/answer";
import { useNotify } from "src/utils/ui/notify";
import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";

import { useBackendSurveyApi } from "./survey";
import {
  isNewerSurveyVersion,
  markSurveyQueriesStale,
  removeSurveyFormCaches,
  updateSurveyGateViewerCaches,
} from "./surveyCache";
import {
  type UseSurveyQueriesTranslations,
  useSurveyQueriesTranslations,
} from "./useSurveyQueries.i18n";
import { useSurveyWriteContext } from "./useSurveyWriteContext";

export type SurveyFormData = SurveyFormSnapshot;

function discardSurveyRead({
  queryClient,
  queryKey,
  signal,
}: {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  signal: AbortSignal;
}): never {
  // Cancel the query itself as well as discarding its value, so a first prefetch
  // cannot remain stuck in the fetching state after its viewer changes.
  if (!signal.aborted)
    void queryClient.cancelQueries({ queryKey, exact: true });
  throw new CancelledError({ revert: true });
}

function useSurveyStatusQueryOptions(
  conversationSlugId: MaybeRefOrGetter<string>
) {
  const { checkSurveyStatus } = useBackendSurveyApi();
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  return computed(() => {
    const queryKey = getSurveyStatusQueryKey({
      conversationSlugId: toValue(conversationSlugId),
      viewerScope: viewerScope.value,
    });
    return {
      queryKey,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const response = await checkSurveyStatus({
          conversationSlugId: queryKey[1],
          signal,
        });
        if (signal.aborted || queryKey[2].userId !== viewerScope.value.userId)
          discardSurveyRead({ queryClient, queryKey, signal });
        if (response.status !== "success")
          throw new Error("Failed to load survey status");
        return response.data;
      },
      staleTime: 30_000,
      retry: false,
    };
  });
}

export function useSurveyStatusQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const options = useSurveyStatusQueryOptions(conversationSlugId);
  return useQuery(
    computed(() => ({
      ...options.value,
      enabled: toValue(enabled) && toValue(conversationSlugId) !== "",
    }))
  );
}

function useSurveyFormQueryOptions({
  conversationSlugId,
  onContentNotFound,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  onContentNotFound: (() => void) | undefined;
}) {
  const { fetchSurveyForm } = useBackendSurveyApi();
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  return computed(() => {
    const queryKey = getSurveyFormQueryKey({
      conversationSlugId: toValue(conversationSlugId),
      displayLanguage: displayLanguage.value,
      spokenLanguages: spokenLanguages.value,
      viewerScope: viewerScope.value,
    });
    return {
      queryKey,
      queryFn: async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<SurveyFormData> => {
        const response = await fetchSurveyForm({
          conversationSlugId: queryKey[1],
          signal,
        });
        if (
          signal.aborted ||
          queryKey[4].userId !== viewerScope.value.userId ||
          queryKey[2] !== displayLanguage.value ||
          queryKey[3].join("\0") !==
            [...spokenLanguages.value].sort().join("\0")
        )
          discardSurveyRead({ queryClient, queryKey, signal });
        if (response.status !== "success")
          throw new Error("Failed to load survey form");
        if (!response.data.success) {
          if (response.data.reason === "content_not_found")
            onContentNotFound?.();
          throw new Error("Failed to load survey form");
        }
        const current = queryClient.getQueryData<SurveyFormData>(queryKey);
        return current !== undefined &&
          isNewerSurveyVersion({ current, incoming: response.data })
          ? current
          : response.data;
      },
      staleTime: 30_000,
      retry: false,
    };
  });
}

export function useSurveyFormQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseSurveyQueriesTranslations>(
    useSurveyQueriesTranslations
  );
  const options = useSurveyFormQueryOptions({
    conversationSlugId,
    onContentNotFound: () => showNotifyMessage(t("originalContentNotFound")),
  });
  return useQuery(
    computed(() => ({
      ...options.value,
      enabled: toValue(enabled) && toValue(conversationSlugId) !== "",
    }))
  );
}

export function useSurveyPrefetch({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
}): void {
  const queryClient = useQueryClient();
  const statusOptions = useSurveyStatusQueryOptions(conversationSlugId);
  const formOptions = useSurveyFormQueryOptions({
    conversationSlugId,
    onContentNotFound: undefined,
  });
  watch(
    [() => toValue(enabled), statusOptions, formOptions],
    async ([enabled, status, form]) => {
      if (!enabled || status.queryKey[1] === "") return;
      await Promise.all([
        queryClient.prefetchQuery(status),
        queryClient.prefetchQuery(form),
      ]);
    },
    { immediate: true }
  );
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
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  return useQuery({
    queryKey: [
      "survey-results-aggregated",
      computed(() => toValue(conversationSlugId)),
      computed(() => toValue(analysisView)),
      computed(() => toValue(checkpointViewSnapshotId)),
      displayLanguage,
      computed(() => [...spokenLanguages.value].sort()),
    ],
    queryFn: async () => {
      const response = await fetchSurveyResultsAggregated({
        conversationSlugId: toValue(conversationSlugId),
        analysisView: toValue(analysisView),
        checkpointViewSnapshotId: toValue(checkpointViewSnapshotId),
      });
      if (response.status !== "success")
        throw new Error("Failed to load survey results");
      return response.data;
    },
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: 30_000,
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
    queryKey: [
      "survey-completion-counts",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: async () => {
      const response = await fetchSurveyCompletionCounts({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success")
        throw new Error("Failed to load survey completion counts");
      return response.data;
    },
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: 30_000,
    retry: false,
  });
}

type SurveyAnswerSave = Pick<
  SurveyAnswerSaveRequest,
  "questionSlugId" | "expectedQuestionSemanticVersion" | "knownSurveyRevision"
> & { answer: SurveyAnswerDraft | null };

export function useSurveyAnswerSaveMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { saveSurveyAnswer } = useBackendSurveyApi();
  const onboarding = useConversationOnboardingStore();
  const writes = useSurveyWriteContext(conversationSlugId);
  const mutation = useMutation({
    scope: writes.scope,
    mutationKey: writes.mutationKey,
    mutationFn: async ({
      context,
      ...answer
    }: SurveyAnswerSave & { context: ReturnType<typeof writes.capture> }) => {
      if (!context.isViewerCurrent()) return undefined;
      const response = await saveSurveyAnswer({
        ...answer,
        conversationSlugId: context.conversationSlugId,
        answer:
          answer.answer === null
            ? null
            : buildSurveyAnswerSubmission(answer.answer),
        skipEmailUpdateConsent: onboarding.hasSkippedEmailUpdateConsent(
          context.conversationSlugId
        ),
        isCurrent: context.isViewerCurrent,
      });
      if (response.status === "cancelled") return undefined;
      if (response.status !== "success")
        throw new Error("Failed to save survey answer");
      return response.data;
    },
    onSuccess: (response, { context }) =>
      writes.reconcile({ response, context }),
    retry: false,
  });
  async function mutateAsync(answer: SurveyAnswerSave) {
    const context = writes.capture();
    try {
      const response = await mutation.mutateAsync({ ...answer, context });
      return writes.present({ response, context });
    } catch (error) {
      if (!context.isScreenCurrent() || !context.isViewerCurrent())
        return undefined;
      throw error;
    } finally {
      context.release();
    }
  }
  return { ...mutation, mutateAsync };
}

export function useSurveyWithdrawMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { withdrawSurveyResponse } = useBackendSurveyApi();
  const onboarding = useConversationOnboardingStore();
  const writes = useSurveyWriteContext(conversationSlugId);
  const mutation = useMutation({
    scope: writes.scope,
    mutationKey: writes.mutationKey,
    mutationFn: async ({
      context,
      expectedForm,
    }: {
      context: ReturnType<typeof writes.capture>;
      expectedForm: NonNullable<SurveyResponseWithdrawRequest["expectedForm"]>;
    }) => {
      if (!context.isViewerCurrent()) return undefined;
      const response = await withdrawSurveyResponse({
        conversationSlugId: context.conversationSlugId,
        expectedForm,
        skipEmailUpdateConsent: onboarding.hasSkippedEmailUpdateConsent(
          context.conversationSlugId
        ),
        isCurrent: context.isViewerCurrent,
      });
      if (response.status === "cancelled") return undefined;
      if (response.status !== "success")
        throw new Error("Failed to withdraw survey response");
      return response.data;
    },
    onSuccess: (response, { context }) =>
      writes.reconcile({ response, context }),
    retry: false,
  });
  async function mutateAsync(
    expectedForm: NonNullable<SurveyResponseWithdrawRequest["expectedForm"]>
  ) {
    const context = writes.capture();
    try {
      const response = await mutation.mutateAsync({ context, expectedForm });
      return writes.present({ response, context });
    } catch (error) {
      if (!context.isScreenCurrent() || !context.isViewerCurrent())
        return undefined;
      throw error;
    } finally {
      context.release();
    }
  }
  return { isPending: mutation.isPending, mutateAsync };
}

export function useSurveyConfigUpdateMutation({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const { updateSurveyConfig } = useBackendSurveyApi();
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  return useMutation({
    mutationFn: async ({ surveyConfig }: { surveyConfig: SurveyConfig }) => {
      const response = await updateSurveyConfig({
        conversationSlugId: toValue(conversationSlugId),
        surveyConfig,
      });
      if (response.status !== "success")
        throw new Error("Failed to update survey config");
      return response.data;
    },
    onSuccess: async (data) => {
      const slugId = toValue(conversationSlugId);
      removeSurveyFormCaches({ queryClient, conversationSlugId: slugId });
      updateSurveyGateViewerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
        routeResolution: undefined,
        viewerScope: viewerScope.value,
      });
      await markSurveyQueriesStale({ queryClient, conversationSlugId: slugId });
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
  const viewerScope = useViewerQueryScope();
  return useMutation({
    mutationFn: async () => {
      const response = await deleteSurveyConfig({
        conversationSlugId: toValue(conversationSlugId),
      });
      if (response.status !== "success")
        throw new Error("Failed to delete survey config");
      return response.data;
    },
    onSuccess: async (data) => {
      const slugId = toValue(conversationSlugId);
      removeSurveyFormCaches({ queryClient, conversationSlugId: slugId });
      updateSurveyGateViewerCaches({
        queryClient,
        conversationSlugId: slugId,
        surveyGate: data.surveyGate,
        routeResolution: undefined,
        viewerScope: viewerScope.value,
      });
      await markSurveyQueriesStale({ queryClient, conversationSlugId: slugId });
    },
    retry: false,
  });
}
