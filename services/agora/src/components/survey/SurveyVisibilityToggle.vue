<template>
  <div class="survey-visibility-toggle">
    <span
      class="survey-visibility-toggle__label"
      :class="{
        'survey-visibility-toggle__label--active': displayMode === 'suppressed',
      }"
    >
      {{ t("suppressed") }}
    </span>

    <ZKSwitch
      v-model="isFullMode"
      :track-width="trackWidth"
      :track-height="trackHeight"
      :thumb-size="thumbSize"
    />

    <span
      class="survey-visibility-toggle__label"
      :class="{
        'survey-visibility-toggle__label--active': displayMode === 'full',
      }"
    >
      {{ t("full") }}
    </span>
  </div>
</template>

<script setup lang="ts">
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SurveyResultsDisplayMode } from "src/utils/survey/results";
import { computed } from "vue";

import {
  type SurveyVisibilityToggleTranslations,
  surveyVisibilityToggleTranslations,
} from "./SurveyVisibilityToggle.i18n";

const props = withDefaults(
  defineProps<{
    trackWidth?: number;
    trackHeight?: number;
    thumbSize?: number;
  }>(),
  {
    trackWidth: 48,
    trackHeight: 28,
    thumbSize: 24,
  }
);

const displayMode = defineModel<SurveyResultsDisplayMode>({ required: true });

const { t } = useComponentI18n<SurveyVisibilityToggleTranslations>(
  surveyVisibilityToggleTranslations
);

const isFullMode = computed({
  get: () => displayMode.value === "full",
  set: (value) => {
    displayMode.value = value ? "full" : "suppressed";
  },
});

const trackWidth = computed(() => props.trackWidth);
const trackHeight = computed(() => props.trackHeight);
const thumbSize = computed(() => props.thumbSize);
</script>

<style scoped lang="scss">
.survey-visibility-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &__label {
    font-size: 0.75rem;
    font-weight: var(--font-weight-medium);
    color: $ink-light;
    transition: color 0.2s ease;

    &--active {
      color: $primary;
    }
  }
}
</style>
