<template>
  <SpaLink
    v-if="to && !disabled"
    :to="to"
    :replace="replace"
    class="zk-icon-button"
    v-bind="$attrs"
    @click="handleClick"
    @touchend="handleTouchEnd"
  >
    <ZKIcon :name="icon" :size="iconSize" :color="iconColor" />
  </SpaLink>

  <button
    v-else
    type="button"
    class="zk-icon-button"
    :disabled="disabled"
    v-bind="$attrs"
    @click="handleClick"
    @touchend="handleTouchEnd"
  >
    <ZKIcon :name="icon" :size="iconSize" :color="iconColor" />
  </button>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import SpaLink from "./SpaLink.vue";
import ZKIcon from "./ZKIcon.vue";

interface Props {
  icon: string;
  iconSize?: string;
  iconColor?: string;
  disabled?: boolean;
  to?: RouteLocationRaw;
  replace?: boolean;
}

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<Props>(), {
  iconSize: "1.2rem",
  iconColor: "7D7A85",
  disabled: false,
  to: undefined,
  replace: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

function handleClick(event: MouseEvent) {
  if (props.disabled) return;
  emit("click", event);
}

function handleTouchEnd(event: TouchEvent) {
  if (props.disabled) return;

  // Remove focus after touch interaction to prevent persistent focus state on mobile
  const target = event.target as HTMLElement;
  if (target) {
    target.blur();
  }
}
</script>

<style scoped lang="scss">
@import "src/css/hover-effects";

.zk-icon-button {
  // Reset default button/link styles
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
  text-decoration: none;
  color: inherit;

  // Apply icon button styling
  padding: 0.6rem 0.8rem;
  border-radius: 16px;
  color: $color-text-strong;

  // Ensure proper alignment of icon
  display: flex;
  align-items: center;
  justify-content: center;

  // Apply optimized hover effects for mobile compatibility
  @include hover-effects(rgb(233, 235, 236));

  // Custom active state with transform effect
  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
