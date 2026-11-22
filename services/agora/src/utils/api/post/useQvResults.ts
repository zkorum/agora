import { hashKey, useQuery, useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import { useLanguageStore } from "src/stores/language";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { useContentTranslationRecovery } from "src/utils/translation/useContentTranslationRecovery";
import {
  computed,
  type MaybeRefOrGetter,
  onActivated,
  onDeactivated,
  ref,
  toValue,
} from "vue";

import { useQvApi } from "./qv";
import {
  acceptQvResultRead,
  getQvCalculationFrontier,
  reconcileQvCalculationLifecycle,
} from "./qvCalculationState";
import { updateConversationQueryCache } from "./useConversationQuery";

export function useQvResults(slug: MaybeRefOrGetter<string | undefined>) {
  const queryClient = useQueryClient();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const viewer = useViewerQueryScope();
  const active = ref(true);
  const { results } = useQvApi();
  const frontier = computed(() =>
    getQvCalculationFrontier({ queryClient, slug: toValue(slug) ?? "" })
  );
  const queryKey = computed(
    () =>
      [
        "qv-results",
        toValue(slug),
        frontier.value.generation,
        displayLanguage.value,
        [...spokenLanguages.value].sort(),
        viewer.value,
      ] as const
  );
  const query = useQuery({
    queryKey,
    placeholderData: (
      previous: Awaited<ReturnType<typeof results>> | undefined,
      previousQuery
    ) => {
      if (
        previous?.status !== "ready" ||
        previous.closedAnalysisSelection === undefined ||
        previous.closedAnalysisSelection.closeId !== frontier.value.closeId ||
        previousQuery === undefined
      )
        return undefined;
      // A new Live generation within the same close may reuse the last result,
      // but not across viewer, language, or conversation changes.
      const displayScope = (key: readonly unknown[]) =>
        hashKey(key.filter((_, index) => index !== 2));
      return displayScope(previousQuery.queryKey) ===
        displayScope(queryKey.value)
        ? previous
        : undefined;
    },
    enabled: computed(
      () =>
        active.value && toValue(slug) !== undefined && !frontier.value.pending
    ),
    queryFn: async ({ signal }) => {
      const id = toValue(slug);
      if (id === undefined)
        throw new DOMException("QV result context changed", "AbortError");
      const epoch = frontier.value.epoch;
      const result = await results({ conversationSlugId: id, signal });
      if (signal.aborted)
        throw new DOMException("QV lifecycle changed", "AbortError");
      const accepted = acceptQvResultRead({
        queryClient,
        slug: id,
        epoch,
        result,
      });
      if (accepted === undefined) {
        throw new DOMException("QV lifecycle changed", "AbortError");
      }
      updateConversationQueryCache({
        queryClient,
        conversationSlugId: id,
        updateConversation: (conversation) =>
          reconcileQvCalculationLifecycle({ queryClient, conversation }),
      });
      return accepted;
    },
    retry: false,
    refetchInterval: (current) => {
      const status = isAxiosError<unknown>(current.state.error)
        ? current.state.error.response?.status
        : undefined;
      if (status !== undefined && [401, 403, 404, 410].includes(status))
        return false;
      return current.state.data === undefined ||
        frontier.value.requiresFreshRead ||
        current.state.data.status === "calculating" ||
        (current.state.data.status === "ready" &&
          current.state.data.refreshStatus === "calculating") ||
        current.state.data.generation < frontier.value.generation
        ? 2000
        : false;
    },
  });
  const pendingTranslationItems = computed(() => {
    const data = query.data.value;
    return data?.status === "ready"
      ? data.items.filter(
          ({ displayContent }) =>
            displayContent.translationControl?.status === "pending" ||
            displayContent.translationControl?.status === "running"
        )
      : [];
  });
  useContentTranslationRecovery({
    identity: computed(() =>
      JSON.stringify([
        toValue(slug),
        displayLanguage.value,
        [...spokenLanguages.value].sort(),
        viewer.value,
        pendingTranslationItems.value.map(({ itemSlugId, sourceVersion }) => [
          itemSlugId,
          sourceVersion,
        ]),
      ])
    ),
    subscription: computed(() => {
      const conversationSlugId = toValue(slug);
      return conversationSlugId === undefined
        ? undefined
        : {
            kind: "conversation" as const,
            conversationSlugId,
            targetLanguageCode: displayLanguage.value,
          };
    }),
    enabled: computed(() => {
      const status = isAxiosError<unknown>(query.error.value)
        ? query.error.value.response?.status
        : undefined;
      return (
        active.value &&
        !frontier.value.pending &&
        (status === undefined || ![401, 403, 404, 410].includes(status))
      );
    }),
    isPending: computed(() => pendingTranslationItems.value.length > 0),
    canRefresh: computed(() => !query.isFetching.value),
    classifyEvent: (data) => {
      const subject = data.subject;
      return subject.kind === "ranking_item" &&
        subject.conversationSlugId === toValue(slug) &&
        data.targetLanguageCode === displayLanguage.value &&
        pendingTranslationItems.value.some(
          (item) =>
            item.itemSlugId === subject.itemSlugId &&
            item.sourceVersion === subject.sourceVersion
        )
        ? "refresh"
        : "ignore";
    },
    refresh: async () => {
      const result = await query.refetch();
      if (result.isError) return "pending";
      return pendingTranslationItems.value.length > 0 ? "pending" : "settled";
    },
    onFailure: () => {},
  });
  onDeactivated(() => {
    active.value = false;
  });
  onActivated(() => {
    active.value = true;
    if (query.data.value !== undefined) void query.refetch();
  });
  const ready = computed(() => {
    const data = query.data.value;
    return !frontier.value.pending &&
      !frontier.value.requiresFreshRead &&
      frontier.value.status !== "open" &&
      data?.status === "ready" &&
      (data.generation >= frontier.value.generation ||
        (data.closedAnalysisSelection !== undefined &&
          data.closedAnalysisSelection.closeId === frontier.value.closeId))
      ? data
      : undefined;
  });
  return { query, ready };
}
