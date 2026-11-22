import { buildRealtimeConversationTopic } from "src/shared/types/sse";
import {
  computed,
  type MaybeRefOrGetter,
  onActivated,
  onDeactivated,
  onUnmounted,
  ref,
  shallowRef,
  toValue,
  watch,
} from "vue";

const subscribers = shallowRef(new Map<symbol, readonly string[]>());
export const qvStatsTopics = computed(() =>
  [
    ...new Set(
      [...subscribers.value.values()]
        .flat()
        .map((conversationSlugId) =>
          buildRealtimeConversationTopic({ conversationSlugId })
        )
    ),
  ].sort()
);

/** Only active pages subscribe; cached KeepAlive pages retain data, not connections. */
export function useQvStatsSubscriptions(
  slugIds: MaybeRefOrGetter<readonly string[]>
): void {
  const id = Symbol();
  const active = ref(true);
  const stop = watch(
    () => (active.value ? toValue(slugIds) : []),
    (slugs) => {
      const next = new Map(subscribers.value);
      if (slugs.length === 0) next.delete(id);
      else next.set(id, slugs);
      subscribers.value = next;
    },
    { immediate: true }
  );
  onActivated(() => {
    active.value = true;
  });
  onDeactivated(() => {
    active.value = false;
  });
  onUnmounted(() => {
    stop();
    const next = new Map(subscribers.value);
    next.delete(id);
    subscribers.value = next;
  });
}
