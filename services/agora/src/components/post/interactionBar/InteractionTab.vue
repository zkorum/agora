<template>
  <div>
    <div class="container">
      <ZKTab
        :icon-code="props.conversationType === 'maxdiff' ? 'mdi:sort-numeric-ascending' : 'meteor-icons:comment'"
        :text="formatAmount(opinionCount)"
        :is-highlighted="model === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'comment'"
        :to="model === 'comment' ? (compactMode ? undefined : { name: commentRouteName, params: { postSlugId: conversationSlugId } }) : undefined"
        :replace="true"
        @click="handleCommentClick"
      />
      <ZKTab
        v-if="!compactMode"
        icon-code="ph:chart-donut"
        :text="t('analysis')"
        :is-highlighted="model === 'analysis'"
        :should-underline-on-highlight="true"
        :is-loading="isLoading && model === 'analysis'"
        :to="model === 'analysis' ? undefined : { name: analysisRouteName, params: { postSlugId: conversationSlugId } }"
        :replace="false"
        @click="handleAnalysisClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationType } from "src/shared/types/zod";
import { formatAmount } from "src/utils/common";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type InteractionTabTranslations,
  interactionTabTranslations,
} from "./InteractionTab.i18n";

const props = withDefaults(defineProps<{
  opinionCount: number;
  compactMode: boolean;
  isLoading?: boolean;
  conversationSlugId: string;
  onSameTabClick?: () => void;
  conversationType?: ConversationType;
}>(), {
  onSameTabClick: undefined,
  conversationType: "polis",
});

const model = defineModel<"comment" | "analysis">({ required: true });
const { t } = useComponentI18n<InteractionTabTranslations>(
  interactionTabTranslations
);

const route = useRoute();
const router = useRouter();

// Track whether we can use router.back() to return to comment tab
const canGoBackToComment = ref(false);

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

function handleCommentClick(): void {
  if (model.value === "comment") {
    props.onSameTabClick?.();
  } else {
    // Going from analysis back to comment — pop the analysis history entry
    if (canGoBackToComment.value) {
      canGoBackToComment.value = false;
      router.back();
    } else {
      // Fallback for deep links (entered directly on analysis)
      void router.replace({
        name: commentRouteName.value,
        params: { postSlugId: props.conversationSlugId },
      });
    }
  }
}

function handleAnalysisClick(): void {
  if (model.value === "analysis") {
    props.onSameTabClick?.();
  } else {
    canGoBackToComment.value = true;
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
