<template>
  <div>
    <div class="container">
      <ZKTab
        icon-code="meteor-icons:comment"
        :text="formatAmount(opinionCount)"
        :is-highlighted="currentTab === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && currentTab === 'comment'"
        @click="clickedTab('comment')"
      />
      <ZKTab
        v-if="!compactMode"
        icon-code="ph:chart-donut"
        :text="t('analysis')"
        :is-highlighted="currentTab === 'analysis'"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && currentTab === 'analysis'"
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
import { useRoute, useRouter } from "vue-router";

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

const router = useRouter();
const route = useRoute();

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

  if (tabKey === "comment") {
    // Analysis → Comment: use replace to avoid adding to history
    if (currentTab.value === "analysis") {
      void router.replace(`/conversation/${props.conversationSlugId}`);
    }
  } else if (tabKey === "analysis") {
    // Comment → Analysis: use replace to avoid adding to history
    // This ensures back button skips all tab switches and returns to referrer
    void router.replace(`/conversation/${props.conversationSlugId}/analysis`);
  }

  // Sync with v-model for backward compatibility
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
