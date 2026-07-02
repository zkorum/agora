<template>
  <div>
    <!-- Analysis/comment tabs use deferred SpaLink navigation (not the global
         interceptor) because they need custom history management:
         canGoBackToComment + router.back() would conflict with the interceptor's
         router.push(). See SpaLink.vue for the two-mode explanation. -->
    <div class="container">
      <ZKTab
        :icon-code="
          props.conversationType === 'maxdiff'
            ? 'mdi:sort-numeric-ascending'
            : 'meteor-icons:comment'
        "
        :amount="opinionCount"
        :is-highlighted="model === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'comment'"
        :to="commentRoute"
        :deferred="true"
        @click="handleCommentClick"
      />
      <ZKTab
        v-if="!compactMode"
        icon-code="ph:chart-donut"
        :text="t('analysis')"
        :is-highlighted="model === 'analysis'"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'analysis'"
        :to="analysisRoute"
        :deferred="true"
        @click="handleAnalysisClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationType } from "src/shared/types/zod";
import {
  type ConversationRouteContext,
  getConversationAnalysisRoute,
  getConversationAnalysisRouteName,
  getConversationCommentRoute,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { computed, ref, watch } from "vue";
import { type LocationQueryRaw, type RouteLocationRaw, useRoute, useRouter } from "vue-router";

import {
  type InteractionTabTranslations,
  interactionTabTranslations,
} from "./InteractionTab.i18n";

const props = withDefaults(
  defineProps<{
    opinionCount: number;
    compactMode: boolean;
    isLoading?: boolean;
    conversationSlugId: string;
    onSameTabClick?: () => void;
    conversationType?: ConversationType;
    enableRouteNavigation: boolean;
    conversationRouteContext?: ConversationRouteContext;
  }>(),
  {
    onSameTabClick: undefined,
    conversationType: "polis",
    conversationRouteContext: () => normalConversationRouteContext,
  }
);

const model = defineModel<"comment" | "analysis">({ required: true });
const { t } = useComponentI18n<InteractionTabTranslations>(
  interactionTabTranslations
);

const route = useRoute();
const router = useRouter();

// Track whether we can use router.back() to return to comment tab
const canGoBackToComment = ref(false);
const lastAnalysisQuery = ref<LocationQueryRaw>({});

const analysisRouteName = computed(
  () =>
    getConversationAnalysisRouteName({
      routeContext: props.conversationRouteContext,
    })
);

const commentRoute = computed<RouteLocationRaw | undefined>(() => {
  if (props.compactMode || !props.enableRouteNavigation) {
    return undefined;
  }

  return getConversationCommentRoute({
    conversationSlugId: props.conversationSlugId,
    routeContext: props.conversationRouteContext,
  });
});

const analysisRoute = computed<RouteLocationRaw | undefined>(() => {
  if (!props.enableRouteNavigation) {
    return undefined;
  }

  return getConversationAnalysisRoute({
    conversationSlugId: props.conversationSlugId,
    routeContext: props.conversationRouteContext,
    query: lastAnalysisQuery.value,
  });
});

watch(
  () => ({ name: route.name, query: route.query }),
  ({ name, query }) => {
    if (name !== analysisRouteName.value) {
      return;
    }

    lastAnalysisQuery.value = { ...query };
  },
  { immediate: true }
);

function handleCommentClick(): void {
  if (model.value === "comment") {
    props.onSameTabClick?.();
  } else if (!props.enableRouteNavigation) {
    model.value = "comment";
  } else {
    // Going from analysis back to comment — pop the analysis history entry
    if (canGoBackToComment.value) {
      canGoBackToComment.value = false;
      router.back();
    } else {
      // Fallback for deep links (entered directly on analysis)
      void router.replace(
        getConversationCommentRoute({
          conversationSlugId: props.conversationSlugId,
          routeContext: props.conversationRouteContext,
        })
      );
    }
  }
}

function handleAnalysisClick(): void {
  if (model.value === "analysis" && route.name === analysisRouteName.value) {
    props.onSameTabClick?.();
  } else if (!props.enableRouteNavigation) {
    model.value = "analysis";
  } else {
    canGoBackToComment.value = true;
    void router.push(
      getConversationAnalysisRoute({
        conversationSlugId: props.conversationSlugId,
        routeContext: props.conversationRouteContext,
        query: lastAnalysisQuery.value,
      })
    );
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
