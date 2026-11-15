import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
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
} from "./qvCalculationState";
import { reconcileQvCalculationLifecycle } from "./qvCalculationState";
import { updateConversationQueryCache } from "./useConversationQuery";

export function useQvResults(slug: MaybeRefOrGetter<string | undefined>) {
  const queryClient = useQueryClient();
  const viewer = useViewerQueryScope();
  const active = ref(true);
  const { results } = useQvApi();
  const frontier = computed(() =>
    getQvCalculationFrontier({ queryClient, slug: toValue(slug) ?? "" })
  );
  const query = useQuery({
    queryKey: [
      "qv-results",
      computed(() => toValue(slug)),
      computed(() => frontier.value.generation),
      viewer,
    ],
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
        current.state.data.generation < frontier.value.generation
        ? 2000
        : false;
    },
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
      data.generation >= frontier.value.generation
      ? data
      : undefined;
  });
  return { query, ready, frontier };
}
