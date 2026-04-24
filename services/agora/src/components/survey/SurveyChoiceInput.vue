<template>
  <div
    v-if="!isMultipleSelection && !usesDropdown"
    class="choice-input__single-list"
  >
    <SurveySelectableOption
      v-for="option in options"
      :key="option.value"
      :label="option.label"
      :selected="selectedSingleOptionSlugId === option.value"
      @select="handleSingleSelect({ optionSlugId: option.value })"
    />
  </div>

  <q-option-group
    v-else-if="isMultipleSelection && !usesDropdown"
    :model-value="selectedMultiOptionSlugIds"
    type="checkbox"
    :options="optionGroupOptions"
    @update:model-value="handleMultiListUpdate"
  />

  <ZKSelect
    v-else
    :model-value="dropdownModelValue"
    :clearable="!isRequired"
    :label="selectOptionLabel"
    :options="options"
    :searchable="true"
    :multiple="isMultipleSelection"
    :use-chips="isMultipleSelection"
    :counter="isMultipleSelection"
    :max-values="maxSelections"
    @update:model-value="handleDropdownUpdate"
  />
</template>

<script setup lang="ts">
import type { SurveyChoiceDisplay } from "src/shared/types/zod";
import {
  shouldUseSurveyChoiceDropdown,
  SURVEY_CHOICE_DROPDOWN_OPTION_THRESHOLD,
} from "src/utils/survey/config";
import { computed } from "vue";

import ZKSelect from "../ui-library/ZKSelect.vue";
import SurveySelectableOption from "./SurveySelectableOption.vue";

interface ChoiceOption {
  label: string;
  value: string;
}

const props = withDefaults(
  defineProps<{
    choiceDisplay: SurveyChoiceDisplay;
    isMultipleSelection: boolean;
    isRequired: boolean;
    options: readonly ChoiceOption[];
    selectedSingleOptionSlugId: string | null;
    selectedMultiOptionSlugIds: readonly string[];
    selectOptionLabel: string;
    maxSelections?: number;
    dropdownThreshold?: number;
  }>(),
  {
    maxSelections: undefined,
    dropdownThreshold: SURVEY_CHOICE_DROPDOWN_OPTION_THRESHOLD,
  }
);

const emit = defineEmits<{
  "update:selectedSingleOptionSlugId": [value: string | null];
  "update:selectedMultiOptionSlugIds": [value: string[]];
}>();

const usesDropdown = computed(() => {
  return shouldUseSurveyChoiceDropdown({
    choiceDisplay: props.choiceDisplay,
    optionCount: props.options.length,
    dropdownThreshold: props.dropdownThreshold,
  });
});

const dropdownModelValue = computed<string | string[] | null>(() => {
  if (props.isMultipleSelection) {
    return [...props.selectedMultiOptionSlugIds];
  }

  return props.selectedSingleOptionSlugId;
});

const optionGroupOptions = computed<ChoiceOption[]>(() => {
  return [...props.options];
});

function handleSingleSelect({ optionSlugId }: { optionSlugId: string }): void {
  if (!props.isRequired && props.selectedSingleOptionSlugId === optionSlugId) {
    emit("update:selectedSingleOptionSlugId", null);
    return;
  }

  emit("update:selectedSingleOptionSlugId", optionSlugId);
}

function handleMultiListUpdate(value: string[] | null): void {
  emit("update:selectedMultiOptionSlugIds", value ?? []);
}

function handleDropdownUpdate(value: string | string[] | null): void {
  if (props.isMultipleSelection) {
    emit(
      "update:selectedMultiOptionSlugIds",
      Array.isArray(value) ? value : []
    );
    return;
  }

  emit("update:selectedSingleOptionSlugId", Array.isArray(value) ? null : value);
}
</script>

<style scoped lang="scss">
.choice-input__single-list {
  display: flex;
  flex-direction: column;
}
</style>
