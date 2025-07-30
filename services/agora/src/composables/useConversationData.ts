import { storeToRefs } from "pinia";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useBackendPostApi } from "src/utils/api/post";
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

export function useConversationData() {
  const { fetchPostBySlugId } = useBackendPostApi();
  const { isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(
    useAuthenticationStore()
  );
  const { emptyPost } = useHomeFeedStore();
  const postData = ref<ExtendedConversation>(emptyPost);

  const dataLoaded = ref(false);

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
    await initialize();
  });

  watch(isAuthInitialized, async () => {
    await initialize();
  });

  async function initialize() {
    if (isAuthInitialized.value) {
      const isSuccessful = await loadData();
      if (isSuccessful) {
        dataLoaded.value = true;
      }
    }
  }

  async function loadData() {
    // Handle both main conversation page and embed page routes
    const isConversationRoute =
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed";
    if (isConversationRoute) {
      const slugId: string = Array.isArray(route.params.postSlugId)
        ? route.params.postSlugId[0]
        : route.params.postSlugId;
      const response = await fetchPostBySlugId(slugId, isGuestOrLoggedIn.value);
      if (response != null) {
        postData.value = response;
        return true;
      } else {
        postData.value = emptyPost;
        return false;
      }
    } else {
      postData.value = emptyPost;
      return false;
    }
  }

  function pullDownTriggered(done: () => void) {
    setTimeout(() => {
      void (async () => {
        await loadData();
        done();
      })();
    }, 500);
  }

  return {
    postData,
    dataLoaded,
    initialize,
    loadData,
    pullDownTriggered,
  };
}
