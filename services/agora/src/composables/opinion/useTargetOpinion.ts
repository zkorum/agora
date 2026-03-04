import { useRouteQuery } from "@vueuse/router";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OpinionItem } from "src/shared/types/zod";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useNotify } from "src/utils/ui/notify";
import { type Ref, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type UseTargetOpinionTranslations,
  useTargetOpinionTranslations,
} from "./useTargetOpinion.i18n";

export interface UseTargetOpinionReturn {
  targetOpinion: Ref<OpinionItem | null>;
  setupHighlightFromRoute: () => Promise<void>;
  fetchTargetOpinion: (opinionSlugId: string) => Promise<void>;
  refreshAndHighlightOpinion: (opinionSlugId: string) => Promise<void>;
  clearRouteQueryParameters: () => Promise<void>;
}

interface UseTargetOpinionParams {
  refreshDataCallback?: () => Promise<void>;
  onModeratedOpinionDetected?: (opinion: OpinionItem) => void;
}

export function useTargetOpinion({
  refreshDataCallback,
  onModeratedOpinionDetected,
}: UseTargetOpinionParams = {}): UseTargetOpinionReturn {
  const router = useRouter();
  const route = useRoute();
  const targetOpinion = ref<OpinionItem | null>(null);
  const { showNotifyMessage } = useNotify();

  const { t } = useComponentI18n<UseTargetOpinionTranslations>(
    useTargetOpinionTranslations
  );

  const opinionSlugIdQuery = useRouteQuery("opinion", "", {
    transform: String,
  });

  const { fetchOpinionsBySlugIdList } = useBackendCommentApi();

  async function clearRouteQueryParameters(): Promise<void> {
    if (Object.keys(route.query).length > 0) {
      await router.replace({
        path: route.path,
        query: {},
      });
    }
  }

  function scrollToOpinion(opinionSlugId: string): void {
    setTimeout(() => {
      const element = document.getElementById(`comment-${opinionSlugId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }

  async function setupHighlightFromRoute(): Promise<void> {
    const opinionSlugId = opinionSlugIdQuery.value;
    if (opinionSlugId && opinionSlugId.trim() !== "") {
      await fetchTargetOpinion(opinionSlugId);
      if (targetOpinion.value) {
        scrollToOpinion(opinionSlugId);
      }
    }
  }

  async function fetchTargetOpinion(opinionSlugId: string): Promise<void> {
    if (opinionSlugId === "") {
      return;
    }

    try {
      const opinions = await fetchOpinionsBySlugIdList([opinionSlugId]);
      if (opinions.length > 0) {
        targetOpinion.value = opinions[0];
        if (opinions[0].moderation.status === "moderated") {
          onModeratedOpinionDetected?.(opinions[0]);
        }
      } else {
        showNotifyMessage(t("statementNotFound"));
      }
    } catch (error) {
      console.error("Error fetching target opinion:", error);
      showNotifyMessage(t("statementNotFound"));
    }
  }

  async function refreshAndHighlightOpinion(
    opinionSlugId: string
  ): Promise<void> {
    if (refreshDataCallback) {
      await refreshDataCallback();
    }

    await fetchTargetOpinion(opinionSlugId);

    scrollToOpinion(opinionSlugId);
  }

  return {
    targetOpinion,
    setupHighlightFromRoute,
    fetchTargetOpinion,
    refreshAndHighlightOpinion,
    clearRouteQueryParameters,
  };
}
