import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { processEnv } from "src/utils/processEnv";
import { computed, type Ref, ref, watch } from "vue";

interface FeaturedBannerVisibility {
  shouldShowBanner: Ref<boolean>;
  hasCompletedRanking: Ref<boolean>;
  dismiss: () => void;
}

export function useFeaturedBannerVisibility(): FeaturedBannerVisibility {
  const slug = processEnv.VITE_FEATURED_CONVERSATION_SLUG;

  if (!slug) {
    return {
      shouldShowBanner: ref(false),
      hasCompletedRanking: ref(false),
      dismiss: () => {},
    };
  }

  const conversationSlugId: string = slug;
  const storageKey = `featuredConvBanner:${conversationSlugId}:dismissed`;
  const sessionDismissed = ref(
    sessionStorage.getItem(storageKey) === "true"
  );
  const hasCompletedRanking = ref(false);
  const checkComplete = ref(false);

  const { isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(
    useAuthenticationStore()
  );
  const { loadMaxDiffResult } = useMaxDiffApi();

  let isChecking = false;

  async function checkParticipation(): Promise<void> {
    if (isChecking) return;
    isChecking = true;

    if (!isGuestOrLoggedIn.value) {
      hasCompletedRanking.value = false;
      checkComplete.value = true;
      isChecking = false;
      return;
    }

    const response = await loadMaxDiffResult({
      conversationSlugId,
    });

    if (response.status === "success") {
      hasCompletedRanking.value = response.data.isComplete === true;
    } else {
      hasCompletedRanking.value = false;
    }

    checkComplete.value = true;
    isChecking = false;
  }

  watch(
    isAuthInitialized,
    (initialized) => {
      if (initialized) {
        void checkParticipation();
      }
    },
    { immediate: true }
  );

  watch(isGuestOrLoggedIn, () => {
    if (isAuthInitialized.value) {
      checkComplete.value = false;
      void checkParticipation();
    }
  });

  const shouldShowBanner = computed(() => {
    if (!checkComplete.value) return false;
    if (hasCompletedRanking.value) return false;
    if (sessionDismissed.value) return false;
    return true;
  });

  function dismiss(): void {
    sessionDismissed.value = true;
    sessionStorage.setItem(storageKey, "true");
  }

  return { shouldShowBanner, hasCompletedRanking, dismiss };
}
