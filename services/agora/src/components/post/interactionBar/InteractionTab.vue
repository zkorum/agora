<template>
  <div>
    <div class="container">
      <ZKTab
        icon-code="meteor-icons:comment"
        :text="formatAmount(opinionCount)"
        :is-highlighted="model === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'comment'"
        :to="compactMode ? undefined : { name: commentRouteName, params: { postSlugId: conversationSlugId } }"
        :replace="true"
      />
      <ZKTab
        v-if="!compactMode"
        icon-code="ph:chart-donut"
        :text="t('analysis')"
        :is-highlighted="model === 'analysis'"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'analysis'"
        :to="{ name: analysisRouteName, params: { postSlugId: conversationSlugId } }"
        :replace="true"
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

defineProps<{
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
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
