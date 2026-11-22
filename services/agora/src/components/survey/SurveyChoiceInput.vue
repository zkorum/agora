<template>
  <div
    class="choice-input"
    :class="{ 'choice-input--spaced': usesDropdown || isMultipleSelection }"
  >
    <ZKSelect
      v-if="usesDropdown"
      :model-value="dropdownModelValue"
      :clearable="!isRequired"
      :label="selectOptionLabel"
      :options="options"
      :searchable="true"
      :multiple="isMultipleSelection"
      :use-chips="isMultipleSelection"
      :counter="isMultipleSelection"
      :max-values="maxSelections"
      :popup-bottom-boundary="popupBottomBoundary"
      @update:model-value="handleDropdownUpdate"
      @popup-show="handleDropdownShow"
      @popup-hide="handleDropdownHide"
    />
    <div v-for="option in visibleOptions" :key="option.value">
      <q-checkbox
        v-if="!usesDropdown && isMultipleSelection"
        class="choice-input__checkbox"
        :model-value="option.selected"
        :label="option.label"
        :dense="props.density === 'compact'"
        @update:model-value="
          (selected) =>
            handleMultiToggle({
              optionSlugId: option.value,
              selected: selected === true,
            })
        "
      />
      <SurveySelectableOption
        v-else-if="!usesDropdown"
        :label="option.label"
        :selected="option.selected"
        :density="props.density"
        @select="handleSingleSelect({ optionSlugId: option.value })"
      />
      <div
        v-if="option.showText"
        :id="`${optionTextId}-${option.value}`"
        ref="optionTextElements"
        class="choice-input__text-reveal"
        :class="{ 'choice-input__option-text': !usesDropdown }"
      >
        <SurveyOptionTextInput
          :option-label="option.label"
          :show-option-label="usesDropdown && visibleOptions.length > 1"
          :text-value="option.textValue"
          :read-only="!option.allowsText"
          @update:text-value="
            (textValue) =>
              handleOptionTextUpdate({ optionSlugId: option.value, textValue })
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { hasVisiblePlainText } from "src/shared/shared";
import {
  getSurveyOptionText,
  type SurveyOptionText,
  surveyOptionTextToPlainText,
} from "src/shared/surveyChoiceText";
import type { SurveyChoiceDisplay } from "src/shared/types/zod";
import { shouldUseSurveyChoiceDropdown } from "src/utils/survey/config";
import { computed, nextTick, useId, useTemplateRef } from "vue";

import ZKSelect from "../ui-library/ZKSelect.vue";
import SurveyOptionTextInput from "./SurveyOptionTextInput.vue";
import SurveySelectableOption from "./SurveySelectableOption.vue";

interface ChoiceOption {
  label: string;
  value: string;
  allowsText: boolean;
}

const props = withDefaults(
  defineProps<{
    choiceDisplay: SurveyChoiceDisplay;
    isMultipleSelection: boolean;
    isRequired: boolean;
    options: readonly ChoiceOption[];
    optionTextValues: Readonly<Record<string, SurveyOptionText>>;
    selectedSingleOptionSlugId: string | null;
    selectedMultiOptionSlugIds: readonly string[];
    selectOptionLabel: string;
    maxSelections: number | undefined;
    popupBottomBoundary: HTMLElement | undefined;
    density?: "comfortable" | "compact";
  }>(),
  {
    density: "comfortable",
  }
);

const emit = defineEmits<{
  "update:selectedSingleOptionSlugId": [value: string | null];
  "update:selectedMultiOptionSlugIds": [value: string[]];
  "update:optionTextValues": [value: Record<string, SurveyOptionText>];
}>();
const optionTextElements = useTemplateRef<HTMLElement[]>("optionTextElements");
const optionTextId = useId();
let dropdownSelectionOnOpen: ReadonlySet<string> = new Set();

const usesDropdown = computed(() => {
  return shouldUseSurveyChoiceDropdown({
    choiceDisplay: props.choiceDisplay,
    optionCount: props.options.length,
  });
});

const dropdownModelValue = computed<string | string[] | null>(() => {
  if (props.isMultipleSelection) {
    return [...props.selectedMultiOptionSlugIds];
  }

  return props.selectedSingleOptionSlugId;
});

const selectedOptionSlugIds = computed(
  () =>
    new Set(
      props.isMultipleSelection
        ? props.selectedMultiOptionSlugIds
        : props.selectedSingleOptionSlugId === null
          ? []
          : [props.selectedSingleOptionSlugId]
    )
);
const visibleOptions = computed(() => {
  const options = props.options.map((option) => {
    const selected = selectedOptionSlugIds.value.has(option.value);
    const textValue = getSurveyOptionText({
      values: props.optionTextValues,
      optionSlugId: option.value,
    }) ?? { textValueHtml: "" };
    return {
      ...option,
      selected,
      textValue,
      showText:
        selected &&
        (option.allowsText ||
          hasVisiblePlainText(surveyOptionTextToPlainText(textValue))),
    };
  });
  return usesDropdown.value
    ? options.filter((option) => option.showText)
    : options;
});

function handleOptionTextUpdate({
  optionSlugId,
  textValue,
}: {
  optionSlugId: string;
  textValue: SurveyOptionText;
}): void {
  emit("update:optionTextValues", {
    ...props.optionTextValues,
    [optionSlugId]: textValue,
  });
}

async function revealOptionText(optionSlugId: string): Promise<void> {
  if (
    !props.options.some(
      (option) => option.value === optionSlugId && option.allowsText
    )
  ) {
    return;
  }
  await nextTick();
  // Tiptap mounts its editable content after the option itself has rendered.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const element = optionTextElements.value?.find(
    (element) => element.id === `${optionTextId}-${optionSlugId}`
  );
  // Reveal only the newly selected field, without opening the mobile keyboard
  // or scrolling past choices the user may still want to select.
  element?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}

async function handleSingleSelect({
  optionSlugId,
}: {
  optionSlugId: string;
}): Promise<void> {
  if (!props.isRequired && props.selectedSingleOptionSlugId === optionSlugId) {
    emit("update:selectedSingleOptionSlugId", null);
    return;
  }

  const isNewSelection = props.selectedSingleOptionSlugId !== optionSlugId;
  emit("update:selectedSingleOptionSlugId", optionSlugId);
  if (isNewSelection) await revealOptionText(optionSlugId);
}

async function handleMultiToggle({
  optionSlugId,
  selected,
}: {
  optionSlugId: string;
  selected: boolean;
}): Promise<void> {
  const selection = new Set(props.selectedMultiOptionSlugIds);
  if (selected) selection.add(optionSlugId);
  else selection.delete(optionSlugId);
  emit("update:selectedMultiOptionSlugIds", [...selection]);
  if (selected) await revealOptionText(optionSlugId);
}

function handleDropdownUpdate(value: string | string[] | null): void {
  if (props.isMultipleSelection) {
    emit(
      "update:selectedMultiOptionSlugIds",
      Array.isArray(value) ? value : []
    );
    return;
  }

  emit(
    "update:selectedSingleOptionSlugId",
    Array.isArray(value) ? null : value
  );
}

function handleDropdownShow(): void {
  dropdownSelectionOnOpen = selectedOptionSlugIds.value;
}

async function handleDropdownHide(): Promise<void> {
  const newTextOption = props.options.findLast(
    (option) =>
      option.allowsText &&
      selectedOptionSlugIds.value.has(option.value) &&
      !dropdownSelectionOnOpen.has(option.value)
  );
  if (newTextOption !== undefined) await revealOptionText(newTextOption.value);
}
</script>

<style scoped lang="scss">
.choice-input {
  display: flex;
  flex-direction: column;
}

.choice-input--spaced {
  gap: 0.75rem;
}

.choice-input__option-text {
  margin-inline-start: 2.225rem;
}

.choice-input__text-reveal {
  scroll-margin-block: 0.75rem;
}

.choice-input__checkbox {
  min-height: 2.25rem;
  width: 100%;
}
</style>
