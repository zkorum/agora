import { storeToRefs } from "pinia";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useConversationStore } from "src/stores/conversation";
import { onMounted } from "vue";
import { useRoute } from "vue-router";

export function useConversationData() {
  const conversationStore = useConversationStore();
  const { conversationData, conversationLoaded } =
    storeToRefs(conversationStore);

  const route = useRoute();

  const {
    clearVotingIntention,
    clearOpinionAgreementIntention,
    clearReportUserContentIntention,
  } = useLoginIntentionStore();

  // Clear intentions on initialization
  clearVotingIntention();
  clearOpinionAgreementIntention();
  clearReportUserContentIntention();

  onMounted(async () => {
    await loadConversationData();
  });

  function getConversationSlugId(): string | null {
    const isConversationRoute =
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed";

    if (!isConversationRoute) {
      console.error(
        "Should not be calling conversation initialization outside of the conversation routes"
      );
      return null;
    }

    return Array.isArray(route.params.postSlugId)
      ? route.params.postSlugId[0]
      : route.params.postSlugId;
  }

  async function loadConversationData(refresh = false) {
    const slugId = getConversationSlugId();

    if (slugId) {
      return await conversationStore.loadConversationData(slugId, refresh);
    }

    return false;
  }

  function refreshConversation(done: () => void) {
    setTimeout(() => {
      void (async () => {
        await loadConversationData(true);
        done();
      })();
    }, 500);
  }

  return {
    conversationData,
    conversationLoaded,
    loadConversationData,
    refreshConversation,
  };
}
