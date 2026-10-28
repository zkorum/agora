import { skipToken, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OpinionTarget } from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import type { OpinionQueryScope } from "src/utils/api/comment/opinionQueryScope";
import { getOpinionTargetQueryKey } from "src/utils/api/comment/opinionTargetQueryKey";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  type MaybeRefOrGetter,
  nextTick,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { useRoute } from "vue-router";

import {
  getLinkedOpinionSlugId,
  getOpinionFilterSelection,
  isOpinionListRoute,
  type OpinionFilterSelection,
} from "./opinionLinkRoute";
import {
  type UseTargetOpinionTranslations,
  useTargetOpinionTranslations,
} from "./useTargetOpinion.i18n";

type Highlight =
  | { kind: "none" }
  | ({
      kind: "linked";
      filterSelection: OpinionFilterSelection;
    } & OpinionTarget)
  | { kind: "local"; opinion: DisplayedOpinionItem };

type LinkRequest =
  | { kind: "inactive" }
  | {
      kind: "active";
      path: string;
      conversationSlugId: string;
      opinionSlugId: string;
      filterSelection: OpinionFilterSelection;
      scope: OpinionQueryScope;
    };

type LinkFetch =
  | { kind: "idle" }
  | { kind: "pending"; controller: AbortController };

type TargetLookup =
  | { status: "not_found" }
  | { status: "found"; target: OpinionTarget };

export function useTargetOpinion({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const route = useRoute();
  const queryClient = useQueryClient();
  const { fetchOpinionsBySlugIdList } = useBackendCommentApi();
  const { userId } = storeToRefs(useAuthenticationStore());
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseTargetOpinionTranslations>(
    useTargetOpinionTranslations
  );
  const highlight = ref<Highlight>({ kind: "none" });
  const isActive = ref(true);
  const linkFetch = shallowRef<LinkFetch>({ kind: "idle" });
  const linkedSlugId = computed(() =>
    getLinkedOpinionSlugId({
      route,
      conversationSlugId: toValue(conversationSlugId),
    })
  );
  const linkRequest = computed<LinkRequest>(() => {
    const opinionSlugId = linkedSlugId.value;
    if (!isActive.value || !toValue(enabled) || opinionSlugId === undefined)
      return { kind: "inactive" };
    const scope: OpinionQueryScope = {
      viewerUserId: userId.value,
      displayLanguage: displayLanguage.value,
      spokenLanguages: [...spokenLanguages.value].sort(),
    };
    return {
      kind: "active",
      path: route.path,
      conversationSlugId: toValue(conversationSlugId),
      opinionSlugId,
      filterSelection: getOpinionFilterSelection(route),
      scope,
    };
  });
  const linkRequestKey = computed(() => JSON.stringify(linkRequest.value));
  const highlightState = computed(() => highlight.value);
  const targetOpinion = computed(() =>
    highlight.value.kind === "none" ? null : highlight.value.opinion
  );
  const isResolvingLink = computed(
    () => linkFetch.value.kind === "pending" && highlight.value.kind === "none"
  );

  function queryKey(opinionSlugId: string) {
    return getOpinionTargetQueryKey({
      opinionSlugId,
      viewerUserId: userId.value,
      displayLanguage: displayLanguage.value,
      spokenLanguages: spokenLanguages.value,
    });
  }

  async function fetchTarget({
    opinionSlugId,
    conversationSlugId: requestedConversation,
    signal,
  }: {
    opinionSlugId: string;
    conversationSlugId: string;
    signal: AbortSignal;
  }): Promise<TargetLookup> {
    const targets = await fetchOpinionsBySlugIdList({
      opinionSlugIdList: [opinionSlugId],
      signal,
    });
    const target = targets.find(
      (item) =>
        item.opinion.opinionSlugId === opinionSlugId &&
        item.conversationSlugId === requestedConversation
    );
    return target === undefined
      ? { status: "not_found" }
      : { status: "found", target };
  }

  const selectedQuery = useQuery(
    computed(() => {
      const selected = highlight.value;
      const requestedConversation = toValue(conversationSlugId);
      return {
        queryKey: queryKey(
          selected.kind === "none" ? "" : selected.opinion.opinionSlugId
        ),
        queryFn:
          selected.kind === "none"
            ? skipToken
            : async ({ signal }: { signal: AbortSignal }) => {
                const result = await fetchTarget({
                  opinionSlugId: selected.opinion.opinionSlugId,
                  conversationSlugId: requestedConversation,
                  signal,
                });
                if (result.status === "not_found")
                  throw new Error("Statement not found");
                return result.target.opinion;
              },
        // Linked requests seed this cache; observe edits without issuing a duplicate read.
        enabled:
          isActive.value && toValue(enabled) && selected.kind === "local",
        staleTime: 30_000,
        retry: false,
      };
    })
  );
  watch(selectedQuery.data, (opinion) => {
    const current = highlight.value;
    if (
      opinion !== undefined &&
      current.kind !== "none" &&
      opinion.opinionSlugId === current.opinion.opinionSlugId
    ) {
      highlight.value = { ...current, opinion };
    }
  });

  function scrollToOpinion(opinionSlugId: string): void {
    void nextTick(() => {
      const current = highlight.value;
      if (
        !isActive.value ||
        current.kind === "none" ||
        current.opinion.opinionSlugId !== opinionSlugId
      )
        return;
      document
        .getElementById(`comment-${opinionSlugId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function cancelPendingRequest(): void {
    const request = linkFetch.value;
    if (request.kind === "pending") request.controller.abort();
    linkFetch.value = { kind: "idle" };
  }

  function clearHighlight(): void {
    cancelPendingRequest();
    highlight.value = { kind: "none" };
  }

  watch(userId, clearHighlight, { flush: "sync" });
  watch(() => toValue(conversationSlugId), clearHighlight, { flush: "sync" });

  watch(
    linkRequestKey,
    async (requestKey, _previous, onCleanup) => {
      const request = linkRequest.value;
      if (request.kind === "inactive") {
        if (
          isActive.value &&
          isOpinionListRoute({
            route,
            conversationSlugId: toValue(conversationSlugId),
          }) &&
          highlight.value.kind === "linked"
        ) {
          highlight.value = { kind: "none" };
        }
        return;
      }
      const { opinionSlugId, filterSelection } = request;
      const controller = new AbortController();
      const cancel = () => {
        controller.abort();
        finishRequest();
      };
      function finishRequest(): void {
        const current = linkFetch.value;
        if (current.kind === "pending" && current.controller === controller)
          linkFetch.value = { kind: "idle" };
      }
      onCleanup(cancel);
      const previousHighlight = highlight.value;
      const isSameTarget =
        previousHighlight.kind === "linked" &&
        previousHighlight.opinion.opinionSlugId === opinionSlugId &&
        previousHighlight.conversationSlugId === request.conversationSlugId;
      if (!isSameTarget) highlight.value = { kind: "none" };
      linkFetch.value = { kind: "pending", controller };
      const isCurrent = () =>
        !controller.signal.aborted && linkRequestKey.value === requestKey;
      try {
        const result = await fetchTarget({
          ...request,
          signal: controller.signal,
        });
        if (!isCurrent()) return;
        if (result.status === "not_found") {
          highlight.value = { kind: "none" };
          showNotifyMessage(t("statementNotFound"));
          return;
        }
        const target = result.target;
        queryClient.setQueryData(
          getOpinionTargetQueryKey({ opinionSlugId, ...request.scope }),
          target.opinion
        );
        highlight.value = { kind: "linked", ...target, filterSelection };
        if (!isSameTarget) scrollToOpinion(opinionSlugId);
      } catch {
        if (!isCurrent()) return;
        highlight.value = { kind: "none" };
        showNotifyMessage(t("statementNotFound"));
      } finally {
        finishRequest();
      }
    },
    { immediate: true }
  );

  function highlightOpinion(opinion: DisplayedOpinionItem): void {
    const previous = highlight.value;
    cancelPendingRequest();
    queryClient.setQueryData(queryKey(opinion.opinionSlugId), opinion);
    highlight.value =
      previous.kind === "linked" &&
      previous.opinion.opinionSlugId === opinion.opinionSlugId
        ? { ...previous, opinion }
        : { kind: "local", opinion };
    scrollToOpinion(opinion.opinionSlugId);
  }

  function getCachedOpinion(
    opinion: DisplayedOpinionItem
  ): DisplayedOpinionItem {
    return (
      queryClient.getQueryData<DisplayedOpinionItem>(
        queryKey(opinion.opinionSlugId)
      ) ?? opinion
    );
  }

  function captureHighlight(): () => void {
    const previous = highlight.value;
    return () => {
      highlight.value =
        previous.kind === "none"
          ? previous
          : { ...previous, opinion: getCachedOpinion(previous.opinion) };
    };
  }

  onActivated(() => {
    isActive.value = true;
  });
  onDeactivated(() => {
    isActive.value = false;
  });
  onScopeDispose(() => {
    isActive.value = false;
    clearHighlight();
  });

  return {
    targetOpinion,
    highlightState,
    isResolvingLink,
    clearHighlight,
    highlightOpinion,
    captureHighlight,
  };
}
