import { defineStore } from "pinia";
import { ref } from "vue";

export const useOpinionUpdatesStore = defineStore("opinionUpdates", () => {
  const signalVersionsByConversationSlugId = ref(new Map<string, number>());

  function markNewOpinion(conversationSlugId: string): void {
    const nextSignalVersionsByConversationSlugId = new Map(
      signalVersionsByConversationSlugId.value
    );
    nextSignalVersionsByConversationSlugId.set(
      conversationSlugId,
      (nextSignalVersionsByConversationSlugId.get(conversationSlugId) ?? 0) + 1
    );
    signalVersionsByConversationSlugId.value = nextSignalVersionsByConversationSlugId;
  }

  function getNewOpinionSignalVersion(conversationSlugId: string): number {
    return signalVersionsByConversationSlugId.value.get(conversationSlugId) ?? 0;
  }

  return {
    markNewOpinion,
    getNewOpinionSignalVersion,
  };
});
