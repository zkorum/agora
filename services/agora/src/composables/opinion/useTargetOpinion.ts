import { useRouteQuery } from "@vueuse/router";
import type { OpinionItem } from "src/shared/types/zod";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { type Ref,ref } from "vue";
import { useRoute,useRouter } from "vue-router";

export interface UseTargetOpinionReturn {
  targetOpinion: Ref<OpinionItem | null>;
  opinionNotFoundState: Ref<{
    isVisible: boolean;
    opinionId: string | null;
  }>;
  setupHighlightFromRoute: () => Promise<void>;
  fetchTargetOpinion: (opinionSlugId: string) => Promise<void>;
  refreshAndHighlightOpinion: (opinionSlugId: string) => Promise<void>;
  clearRouteQueryParameters: () => Promise<void>;
  dismissOpinionNotFoundBanner: () => void;
  showOpinionNotFoundBanner: (opinionSlugId: string) => void;
}

export function useTargetOpinion(
  refreshDataCallback?: () => Promise<void>
): UseTargetOpinionReturn {
  const router = useRouter();
  const route = useRoute();
  const targetOpinion = ref<OpinionItem | null>(null);

  // Opinion not found banner state
  const opinionNotFoundState = ref<{
    isVisible: boolean;
    opinionId: string | null;
  }>({
    isVisible: false,
    opinionId: null,
  });

  const opinionSlugIdQuery = useRouteQuery("opinion", "", {
    transform: String,
  });

  // Simple target opinion fetching using the API
  const { fetchOpinionsBySlugIdList } = useBackendCommentApi();

  async function clearRouteQueryParameters(): Promise<void> {
    if (Object.keys(route.query).length > 0) {
      await router.replace({
        path: route.path,
        query: {},
      });
    }
  }

  async function setupHighlightFromRoute(): Promise<void> {
    const opinionSlugId = opinionSlugIdQuery.value;
    if (opinionSlugId && opinionSlugId.trim() !== "") {
      await fetchTargetOpinion(opinionSlugId);
    }
  }

  async function fetchTargetOpinion(opinionSlugId: string): Promise<void> {
    console.log("Fetching target opinion:", opinionSlugId);

    if (opinionSlugId === "") {
      return;
    }

    try {
      const opinions = await fetchOpinionsBySlugIdList([opinionSlugId]);
      if (opinions.length > 0) {
        targetOpinion.value = opinions[0];
        // Clear any existing banner when opinion is found
        dismissOpinionNotFoundBanner();
      } else {
        // Show banner instead of notification to avoid string concatenation
        showOpinionNotFoundBanner(opinionSlugId);
      }
    } catch (error) {
      console.error("Error fetching target opinion:", error);
      // Show banner instead of notification to avoid string concatenation
      showOpinionNotFoundBanner(opinionSlugId);
    }
  }

  async function refreshAndHighlightOpinion(
    opinionSlugId: string
  ): Promise<void> {
    // Use provided refresh callback if available
    if (refreshDataCallback) {
      await refreshDataCallback();
    }

    // Fetch the target opinion again
    await fetchTargetOpinion(opinionSlugId);

    // Scroll to the highlighted opinion with a delay to ensure DOM has updated
    setTimeout(() => {
      const element = document.getElementById(`comment-${opinionSlugId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }

  // Banner management functions
  function dismissOpinionNotFoundBanner(): void {
    opinionNotFoundState.value = {
      isVisible: false,
      opinionId: null,
    };
  }

  function showOpinionNotFoundBanner(opinionSlugId: string): void {
    opinionNotFoundState.value = {
      isVisible: true,
      opinionId: opinionSlugId,
    };
  }

  return {
    targetOpinion,
    opinionNotFoundState,
    setupHighlightFromRoute,
    fetchTargetOpinion,
    refreshAndHighlightOpinion,
    clearRouteQueryParameters,
    dismissOpinionNotFoundBanner,
    showOpinionNotFoundBanner,
  };
}
