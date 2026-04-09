<template>
  <ZKCard padding="1rem" class="counts-card">
    <div class="counts-card__title">{{ t("title") }}</div>

    <div v-if="!hasSurvey" class="counts-card__empty">{{ t("noSurvey") }}</div>

    <div v-else class="counts-grid">
      <div class="counts-item"><span>{{ t("total") }}</span><strong>{{ counts.total }}</strong></div>
      <div class="counts-item"><span>{{ t("completeValid") }}</span><strong>{{ counts.completeValid }}</strong></div>
      <div class="counts-item"><span>{{ t("needsUpdate") }}</span><strong>{{ counts.needsUpdate }}</strong></div>
      <div class="counts-item"><span>{{ t("notStarted") }}</span><strong>{{ counts.notStarted }}</strong></div>
      <div class="counts-item"><span>{{ t("inProgress") }}</span><strong>{{ counts.inProgress }}</strong></div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SurveyCompletionCounts } from "src/shared/types/zod";

import {
  type SurveyCompletionCountsCardTranslations,
  surveyCompletionCountsCardTranslations,
} from "./SurveyCompletionCountsCard.i18n";

defineProps<{
  hasSurvey: boolean;
  counts: SurveyCompletionCounts;
}>();

const { t } = useComponentI18n<SurveyCompletionCountsCardTranslations>(
  surveyCompletionCountsCardTranslations
);
</script>

<style scoped lang="scss">
.counts-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.counts-card__title {
  font-size: 1rem;
  font-weight: 600;
}

.counts-card__empty {
  color: #6b7280;
}

.counts-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.counts-item {
  background: #f9fafb;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
}
</style>
