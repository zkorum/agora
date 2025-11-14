<template>
  <div class="options-list">
    <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
    <!-- Dialog options should be keyboard navigable for users with motor disabilities -->
    <div
      v-for="(option, index) in options"
      :key="index"
      class="option-item"
      :class="{ selected: isSelected(option), disabled: option.disabled }"
      @click="selectOption(option)"
    >
      <div class="option-header">{{ option.title }}</div>
      <div class="option-description">{{ option.description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OptionItem {
  title: string;
  description: string;
  value: string;
  disabled?: boolean;
}

interface Props {
  options: OptionItem[];
  selectedValue: string;
}

interface Emits {
  (e: "update:selectedValue", value: string): void;
  (e: "optionSelected", option: OptionItem): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function isSelected(option: OptionItem): boolean {
  return props.selectedValue === option.value;
}

function selectOption(option: OptionItem): void {
  if (option.disabled) {
    return;
  }
  emit("update:selectedValue", option.value);
  emit("optionSelected", option);
}
</script>

<style scoped lang="scss">
.options-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  @include hover-effects(
    $hover-background-color,
    $selected-hover-background-color
  );

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }
}

.option-header {
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
}

.option-description {
  color: $color-text-weak;
  font-size: 1rem;
  line-height: 1.4;
}
</style>
