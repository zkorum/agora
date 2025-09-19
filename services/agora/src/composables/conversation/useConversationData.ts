import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useBackendPostApi } from "src/utils/api/post";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";

export function useConversationData() {
  const { fetchPostBySlugId } = useBackendPostApi();
  const { emptyPost } = useHomeFeedStore();
  const { isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(
    useAuthenticationStore()
  );
  const route = useRoute();

  const {
    clearVotingIntention,
    clearOpinionAgreementIntention,
    clearReportUserContentIntention,
  } = useLoginIntentionStore();

  // Simple reactive state
  const conversationData = ref<ExtendedConversation>(emptyPost);

  const hasConversationData = computed(
    () => conversationData.value.metadata.conversationSlugId !== ""
  );

  // Clear intentions on initialization
  clearVotingIntention();
  clearOpinionAgreementIntention();
  clearReportUserContentIntention();

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

    const postSlugId = (route.params as { postSlugId?: string | string[] })
      .postSlugId;
    return Array.isArray(postSlugId) ? postSlugId[0] : postSlugId || null;
  }

  async function loadConversationData() {
    const slugId = getConversationSlugId();
    if (!slugId) return false;

    // Wait for auth to be initialized
    if (!isAuthInitialized.value) {
      await new Promise<void>((resolve) => {
        const unwatch = watch(isAuthInitialized, (isReady) => {
          if (isReady) {
            unwatch();
            resolve();
          }
        });
      });
    }

    try {
      const response = await fetchPostBySlugId(slugId, isGuestOrLoggedIn.value);
      if (response != null) {
        conversationData.value = response;
        return true;
      } else {
        // Keep existing data on failure instead of clearing
        return false;
      }
    } catch (error) {
      console.error("Failed to load conversation data:", error);
      // Keep existing data on error instead of clearing
      return false;
    }
  }

  function refreshConversation(done: () => void) {
    setTimeout(() => {
      void (async () => {
        await loadConversationData();
        done();
      })();
    }, 500);
  }

  // Watch for route parameter changes to load new conversation data
  watch(
    () => (route.params as { postSlugId?: string | string[] }).postSlugId,
    async (newSlugId, oldSlugId) => {
      if (newSlugId && newSlugId !== oldSlugId) {
        await loadConversationData();
      }
    },
    { immediate: false }
  );

  onMounted(async () => {
    await loadConversationData();
  });

  return {
    // State
    conversationData,

    // Computed
    hasConversationData,

    // Actions
    refreshConversation,
  };
}
