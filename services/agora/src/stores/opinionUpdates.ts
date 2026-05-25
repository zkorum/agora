import { defineStore } from "pinia";
import { ref } from "vue";

export const useOpinionUpdatesStore = defineStore("opinionUpdates", () => {
  const pendingConversationSlugIds = ref(new Set<string>());

  function markNewOpinion(conversationSlugId: string): void {
    pendingConversationSlugIds.value = new Set([
      ...pendingConversationSlugIds.value,
      conversationSlugId,
    ]);
  }

  function clearNewOpinion(conversationSlugId: string): void {
    if (!pendingConversationSlugIds.value.has(conversationSlugId)) {
      return;
    }
    const nextPendingConversationSlugIds = new Set(
      pendingConversationSlugIds.value
    );
    nextPendingConversationSlugIds.delete(conversationSlugId);
    pendingConversationSlugIds.value = nextPendingConversationSlugIds;
  }

  function hasNewOpinion(conversationSlugId: string): boolean {
    return pendingConversationSlugIds.value.has(conversationSlugId);
  }

  return {
    markNewOpinion,
    clearNewOpinion,
    hasNewOpinion,
  };
});
