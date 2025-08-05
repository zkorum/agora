import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useBackendPostApi } from "src/utils/api/post";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";

export const useConversationStore = defineStore("conversation", () => {
  const { fetchPostBySlugId } = useBackendPostApi();
  const { emptyPost } = useHomeFeedStore();
  const { isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(
    useAuthenticationStore()
  );

  // State
  const conversationData = ref<ExtendedConversation>(emptyPost);
  const conversationLoaded = ref(false);
  const isLoading = ref(false);
  // Tracks the slug ID of the currently loaded conversation to avoid duplicate loading
  const currentPostSlugId = ref<string>("");
  // Stores a post slug ID when a load request is made before auth is initialized,
  // allowing the request to be processed once auth becomes ready
  const pendingPostSlugId = ref<string>("");

  const hasConversationData = computed(
    () =>
      conversationLoaded.value &&
      conversationData.value.metadata.conversationSlugId !== ""
  );

  // Wait for auth initialization to handle pending requests
  watch(isAuthInitialized, async (isReady) => {
    if (isReady && pendingPostSlugId.value) {
      const slugId = pendingPostSlugId.value;
      pendingPostSlugId.value = "";
      await loadConversationData(slugId, true);
    }
  });

  // Actions
  async function loadConversationData(postSlugId: string, forceReload = false) {
    // Avoid duplicate loading for the same post
    if (
      !forceReload &&
      currentPostSlugId.value === postSlugId &&
      hasConversationData.value
    ) {
      return true;
    }

    // If auth is not initialized yet, store the request for later
    if (!isAuthInitialized.value) {
      pendingPostSlugId.value = postSlugId;
      return false;
    }

    isLoading.value = true;
    try {
      const response = await fetchPostBySlugId(
        postSlugId,
        isGuestOrLoggedIn.value
      );
      if (response != null) {
        conversationData.value = response;
        conversationLoaded.value = true;
        currentPostSlugId.value = postSlugId;
        return true;
      } else {
        conversationData.value = emptyPost;
        conversationLoaded.value = false;
        currentPostSlugId.value = "";
        return false;
      }
    } catch (error) {
      console.error("Failed to load conversation data:", error);
      conversationData.value = emptyPost;
      conversationLoaded.value = false;
      currentPostSlugId.value = "";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshConversationData() {
    if (currentPostSlugId.value) {
      return await loadConversationData(currentPostSlugId.value, true);
    }
    return false;
  }

  function clearConversationData() {
    conversationData.value = emptyPost;
    conversationLoaded.value = false;
    currentPostSlugId.value = "";
    pendingPostSlugId.value = "";
    isLoading.value = false;
  }

  return {
    // State
    conversationData,
    conversationLoaded,
    isLoading,
    currentPostSlugId,

    // Computed
    hasConversationData,

    // Actions
    loadConversationData,
    refreshConversationData,
    clearConversationData,
  };
});
