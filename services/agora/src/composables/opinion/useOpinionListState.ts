import {
  resolveLinkedOpinionFilter,
  resolveOpinionView,
} from "src/components/post/comments/opinionPresentation";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { computed, type MaybeRefOrGetter, ref, toValue, watch } from "vue";
import { useRoute } from "vue-router";

import {
  getLinkedOpinionSlugId,
  getOpinionFilterSelection,
  isOpinionListRoute,
} from "./opinionLinkRoute";
import { useOpinionFilterAccess } from "./useOpinionFilterAccess";
import { useTargetOpinion } from "./useTargetOpinion";

export type OpinionListState = ReturnType<typeof useOpinionListState>;

export function useOpinionListState({
  conversationSlugId,
  metadata,
  routeContext,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  metadata: MaybeRefOrGetter<ConversationTypeConfig | undefined>;
  routeContext: MaybeRefOrGetter<ConversationRouteContext>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const route = useRoute();
  const { resolveFilter } = useOpinionFilterAccess();
  const initialSelection = getOpinionFilterSelection(route);
  const requestedFilter = ref<CommentFilterOptions>(
    toValue(routeContext).kind === "embed"
      ? "discover"
      : initialSelection.kind === "explicit"
        ? initialSelection.filter
        : "discover"
  );
  const availableFilter = computed(() => resolveFilter(requestedFilter.value));
  const target = useTargetOpinion({
    conversationSlugId,
    enabled: () => {
      const config = toValue(metadata);
      return (
        toValue(enabled) &&
        config !== undefined &&
        !(
          config.conversationType === "ranking" && config.rankingMode === "bws"
        ) &&
        resolveOpinionView({
          metadata: config,
          routeContext: toValue(routeContext),
          filter: availableFilter.value,
        }).kind === "list"
      );
    },
  });
  const filter = computed(() => {
    const highlight = target.highlightState.value;
    const config = toValue(metadata);
    return resolveFilter(
      highlight.kind === "linked" && config !== undefined
        ? resolveLinkedOpinionFilter({
            metadata: config,
            target: highlight,
            filterSelection: highlight.filterSelection,
          })
        : requestedFilter.value
    );
  });

  function selectFilter(value: CommentFilterOptions): void {
    target.clearHighlight();
    requestedFilter.value = value;
  }

  watch([() => route.path, () => route.query.filter], () => {
    const slugId = toValue(conversationSlugId);
    const selection = getOpinionFilterSelection(route);
    if (
      toValue(routeContext).kind !== "embed" &&
      isOpinionListRoute({ route, conversationSlugId: slugId }) &&
      selection.kind === "explicit"
    ) {
      requestedFilter.value = selection.filter;
      if (
        getLinkedOpinionSlugId({ route, conversationSlugId: slugId }) ===
        undefined
      )
        target.clearHighlight();
    }
  });

  return { ...target, filter, selectFilter };
}
