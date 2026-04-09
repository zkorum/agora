<template>
  <button
    type="button"
    class="survey-selectable-option"
    :class="{ 'survey-selectable-option--selected': selected }"
    :role="indicatorType === 'radio' ? 'radio' : 'checkbox'"
    :aria-checked="selected"
    @click="emit('select')"
  >
    <span class="survey-selectable-option__indicator" aria-hidden="true">
      <span class="survey-selectable-option__indicator-inner" />
    </span>

    <span class="survey-selectable-option__label">
      {{ label }}
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    selected: boolean;
    indicatorType?: "radio" | "checkbox";
  }>(),
  {
    indicatorType: "radio",
  }
);

const emit = defineEmits<{
  select: [];
}>();
</script>

<style scoped lang="scss">
.survey-selectable-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 0;
  border: none;
  background: transparent;
  text-align: start;
  color: $color-text-strong;
  cursor: pointer;
}

.survey-selectable-option__indicator {
  width: 1.35rem;
  height: 1.35rem;
  flex: 0 0 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.4);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.survey-selectable-option__indicator-inner {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background-color: transparent;
  transition: background-color 0.15s ease;
}

.survey-selectable-option__label {
  min-width: 0;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.survey-selectable-option--selected {
  .survey-selectable-option__indicator {
    border-color: $primary;
  }

  .survey-selectable-option__indicator-inner {
    background-color: $primary;
  }
}

.survey-selectable-option:focus-visible {
  outline: 2px solid rgba($primary, 0.4);
  outline-offset: 4px;
  border-radius: 12px;
}
</style>
