<template>
  <div>
    <div class="container">
      <ZKTab
        icon-code="meteor-icons:comment"
        :text="formatAmount(opinionCount)"
        :is-highlighted="model === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'comment'"
        @click="clickedTab('comment')"
      />
      <ZKTab
        v-if="!compactMode"
        icon-code="ph:chart-donut"
        :text="t('analysis')"
        :is-highlighted="model === 'analysis'"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'analysis'"
        @click="clickedTab('analysis')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { formatAmount } from "src/utils/common";

import {
  type InteractionTabTranslations,
  interactionTabTranslations,
} from "./InteractionTab.i18n";

const props = defineProps<{
  opinionCount: number;
  compactMode: boolean;
  isLoading?: boolean;
}>();
const model = defineModel<"comment" | "analysis">({ required: true });
const { t } = useComponentI18n<InteractionTabTranslations>(
  interactionTabTranslations
);

function clickedTab(tabKey: "comment" | "analysis") {
  if (!props.compactMode) {
    model.value = tabKey;
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
