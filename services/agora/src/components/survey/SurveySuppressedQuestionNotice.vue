<template>
  <div class="survey-suppressed-notice">
    <div class="survey-suppressed-notice__title">{{ t("title") }}</div>
    <p class="survey-suppressed-notice__message">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SurveyAggregateSuppressionReason } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type SurveySuppressedQuestionNoticeTranslations,
  surveySuppressedQuestionNoticeTranslations,
} from "./SurveySuppressedQuestionNotice.i18n";

const props = defineProps<{
  suppressionReason: SurveyAggregateSuppressionReason | undefined;
}>();

const { t } = useComponentI18n<SurveySuppressedQuestionNoticeTranslations>(
  surveySuppressedQuestionNoticeTranslations
);

const description = computed(() => {
  if (props.suppressionReason === "cluster_deductive_disclosure") {
    return t("clusterMessage");
  }

  return t("lowCountMessage");
});
</script>

<style scoped lang="scss">
.survey-suppressed-notice {
  padding: 0.25rem 0;

  &__title {
    margin-bottom: 0.35rem;
    font-size: 0.875rem;
    font-weight: var(--font-weight-medium);
    color: $ink-dark;
  }

  &__message {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: $ink-light;
  }
}
</style>
