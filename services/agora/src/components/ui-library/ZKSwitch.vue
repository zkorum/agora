<template>
  <button
    type="button"
    class="zk-switch"
    :class="{
      'zk-switch--checked': modelValue,
      'zk-switch--disabled': disable,
    }"
    :style="switchStyleVars"
    role="switch"
    :aria-checked="modelValue"
    :aria-disabled="disable ? 'true' : undefined"
    :disabled="disable"
    @click="toggleSwitch"
  >
    <span class="zk-switch__thumb" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    disable?: boolean;
    trackWidth?: number;
    trackHeight?: number;
    thumbSize?: number;
  }>(),
  {
    disable: false,
    trackWidth: 56,
    trackHeight: 32,
    thumbSize: 28,
  }
);

const modelValue = defineModel<boolean>({ required: true });

const switchStyleVars = computed(() => {
  const offset = (props.trackHeight - props.thumbSize) / 2;
  const checkedLeft = props.trackWidth - props.thumbSize - offset;

  return {
    "--zk-switch-width": `${String(props.trackWidth)}px`,
    "--zk-switch-height": `${String(props.trackHeight)}px`,
    "--zk-switch-thumb-size": `${String(props.thumbSize)}px`,
    "--zk-switch-thumb-offset": `${String(offset)}px`,
    "--zk-switch-thumb-checked-left": `${String(checkedLeft)}px`,
  };
});

function toggleSwitch(): void {
  if (props.disable) {
    return;
  }

  modelValue.value = !modelValue.value;
}
</script>

<style scoped lang="scss">
.zk-switch {
  position: relative;
  width: var(--zk-switch-width);
  min-width: var(--zk-switch-width);
  height: var(--zk-switch-height);
  padding: 0;
  border: none;
  border-radius: var(--zk-switch-height);
  background: $sky-light;
  cursor: pointer;
  appearance: none;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;

  &__thumb {
    position: absolute;
    top: var(--zk-switch-thumb-offset);
    left: var(--zk-switch-thumb-offset);
    width: var(--zk-switch-thumb-size);
    height: var(--zk-switch-thumb-size);
    border-radius: 999px;
    background: $color-background-default;
    transition: left 0.2s ease;
  }

  &--checked {
    background: $primary;
  }

  &--checked &__thumb {
    left: var(--zk-switch-thumb-checked-left);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid rgba($primary, 0.22);
    outline-offset: 2px;
  }
}
</style>
