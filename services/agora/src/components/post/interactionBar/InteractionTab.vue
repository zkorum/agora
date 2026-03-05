<template>
  <div>
    <div class="container">
      <ZKTab
        icon-code="meteor-icons:comment"
        :text="formatAmount(opinionCount)"
        :is-highlighted="currentTab === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && currentTab === 'comment'"
        :to="compactMode ? undefined : { name: commentRouteName, params: { postSlugId: conversationSlugId } }"
        :replace="true"
        @click="clickedTab('comment')"
      />
      <ZKTab
        v-if="!compactMode"
        icon-code="ph:chart-donut"
        :text="t('analysis')"
        :is-highlighted="currentTab === 'analysis'"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && currentTab === 'analysis'"
        :to="{ name: analysisRouteName, params: { postSlugId: conversationSlugId } }"
        :replace="true"
        @click="clickedTab('analysis')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { formatAmount } from "src/utils/common";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
  type InteractionTabTranslations,
  interactionTabTranslations,
} from "./InteractionTab.i18n";

const props = defineProps<{
  opinionCount: number;
  compactMode: boolean;
  isLoading?: boolean;
  conversationSlugId: string;
}>();

const model = defineModel<"comment" | "analysis">({ required: true });
const { t } = useComponentI18n<InteractionTabTranslations>(
  interactionTabTranslations
);

const route = useRoute();

const isEmbed = computed(() => route.path.includes("/embed"));

const commentRouteName = computed(() =>
  isEmbed.value
    ? "/conversation/[postSlugId].embed/"
    : "/conversation/[postSlugId]/"
);

const analysisRouteName = computed(() =>
  isEmbed.value
    ? "/conversation/[postSlugId].embed/analysis"
    : "/conversation/[postSlugId]/analysis"
);

// Determine current tab from route path
const currentTab = computed<"comment" | "analysis">(() => {
  const pathSegments = route.path.split("/");
  const lastSegment = pathSegments[pathSegments.length - 1];

  if (lastSegment === "analysis") {
    return "analysis";
  }
  return "comment";
});

function clickedTab(tabKey: "comment" | "analysis") {
  if (props.compactMode) return;

  // Sync with v-model (router-link handles navigation)
  model.value = tabKey;
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
