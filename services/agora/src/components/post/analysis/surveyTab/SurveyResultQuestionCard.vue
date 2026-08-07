<template>
  <ZKCard padding="1rem" class="question-card">
    <div class="question-text">{{ displayedQuestionText }}</div>

    <ContentTranslationControl
      v-if="translationPreview !== undefined"
      v-model="translationMode"
      :source-language-label="translationPreview.sourceLanguageLabel"
      :translation-status="translationPreview.translationStatus"
    />

    <SurveySuppressedQuestionNotice
      v-if="props.question.isSuppressed"
      :suppression-reason="props.question.suppressionReason"
      class="question-card__suppressed"
    />

    <div v-else class="option-list">
      <div
        v-for="option in displayedOptions"
        :key="option.id"
        class="option-row"
      >
        <div class="option-row__header">
          <span class="option-row__label">{{ option.label }}</span>
          <span class="option-row__value">
            <template v-if="option.isSuppressed">
              {{ props.suppressedLabel }}
            </template>
            <template v-else>
              {{ formatAmount(option.count ?? 0) }} /
              {{ formatPercentage(option.percentage ?? 0) }}
            </template>
          </span>
        </div>

        <div class="option-row__bar">
          <div
            class="option-row__fill"
            :class="{
              'option-row__fill--suppressed': option.isSuppressed,
            }"
            :style="{
              width: `${option.isSuppressed ? 0 : (option.percentage ?? 0)}%`,
            }"
          />
        </div>
      </div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import SurveySuppressedQuestionNotice from "src/components/survey/SurveySuppressedQuestionNotice.vue";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import type { SurveyQuestionDisplayedContent } from "src/shared/types/zod";
import { formatAmount, formatPercentage } from "src/utils/common";
import type { SurveyQuestionGroup } from "src/utils/survey/results";
import { useSurveyQuestionDisplayContent } from "src/utils/translation/useSurveyQuestionDisplayContent";
import { computed } from "vue";

const props = defineProps<{
  conversationSlugId: string;
  question: SurveyQuestionGroup;
  displayContent: SurveyQuestionDisplayedContent | undefined;
  suppressedLabel: string;
}>();

const originalContent = computed(() => ({
  questionText: props.question.question,
  options: props.question.options.map((option) => ({
    optionSlugId: option.id,
    optionText: option.label,
  })),
}));
const {
  displayedContent,
  translationPreview,
  translationMode,
} = useSurveyQuestionDisplayContent({
    sourceLanguageCode: undefined,
    conversationSlugId: computed(() => props.conversationSlugId),
    questionSlugId: computed(() => props.question.id),
    originalContent,
    displayContent: computed(() => props.displayContent),
  });

const displayedQuestionText = computed(() => displayedContent.value.questionText);
const displayedOptions = computed(() => {
  const displayedOptionsById = new Map(
    displayedContent.value.options.map((option) => [
      option.optionSlugId,
      option.optionText,
    ])
  );
  return props.question.options.map((option) => ({
    ...option,
    label: displayedOptionsById.get(option.id) ?? option.label,
  }));
});
</script>

<style lang="scss" scoped>
.question-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-text {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: #333238;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card__suppressed {
  margin-top: 0.25rem;
}

.option-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.option-row__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.option-row__label {
  color: #434149;
}

.option-row__value {
  font-size: 0.875rem;
  color: #6d6a74;
  white-space: nowrap;
}

.option-row__bar {
  height: 0.5rem;
  border-radius: 999px;
  background: #efedf8;
  overflow: hidden;
}

.option-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6b4eff 0%, #9b8cff 100%);
}

.option-row__fill--suppressed {
  background: #d8d6de;
}

@media (max-width: $breakpoint-xs-max) {
  .option-row__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
  }
}
</style>
