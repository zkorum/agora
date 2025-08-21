<template>
  <button
    :class="['zk-gradient-button', `zk-gradient-button--${variant}`]"
    :style="buttonStyles"
    v-bind="$attrs"
  >
    <span class="zk-gradient-button__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface ZKGradientButtonProps {
  /** The text label displayed on the button */
  label: string;
  /** Button variant - 'default' shows gradient background, 'text' shows gradient only on hover */
  variant?: "default" | "text";
  /** CSS gradient background (e.g., 'linear-gradient(114.81deg, #6B4EFF 46.45%, #4F92F6 100.1%)') */
  gradientBackground?: string;
  /** Text color for the label */
  labelColor?: string;
}

const props = withDefaults(defineProps<ZKGradientButtonProps>(), {
  variant: "default",
  gradientBackground:
    "linear-gradient(114.81deg, #6B4EFF 46.45%, #4F92F6 100.1%)",
  labelColor: "#FFFFFF",
});

const buttonStyles = computed(() => {
  const styles: Record<string, string> = {
    "--gradient-background": props.gradientBackground,
    color: props.labelColor,
  };

  // Only apply background for default variant
  if (props.variant === "default") {
    styles.background = props.gradientBackground;
  }

  return styles;
});
</script>

<style lang="scss" scoped>
.zk-gradient-button {
  border: none;
  border-radius: 16px;
  cursor: pointer;
  outline: none;
  height: 40px;
  padding: 0 20px;
  transition:
    opacity 0.2s ease,
    transform 0.1s ease,
    background 0.2s ease;

  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // Default variant - current behavior
  &--default {
    &:hover {
      opacity: 0.9;
    }
  }

  // Text variant - no background by default, subtle grey on hover
  &--text {
    background: transparent !important;

    &:hover {
      background: rgba(0, 0, 0, 0.05) !important;
    }

    &:disabled {
      &:hover {
        background: transparent !important;
      }
    }
  }
}

.zk-gradient-button__label {
  font-style: normal;
  font-weight: 500;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  text-align: center;
  white-space: nowrap;
}
</style>
