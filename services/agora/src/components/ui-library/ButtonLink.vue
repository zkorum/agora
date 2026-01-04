<template>
  <component
    :is="componentTag"
    :to="!disabled ? to : undefined"
    :class="buttonClasses"
    :aria-disabled="disabled"
    :tabindex="disabled ? -1 : undefined"
    class="button-link"
  >
    <i v-if="icon && iconPos === 'left'" :class="icon" aria-hidden="true"></i>
    <span v-if="label" class="button-link__label">{{ label }}</span>
    <i v-if="icon && iconPos === 'right'" :class="icon" aria-hidden="true"></i>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";

interface ButtonLinkProps {
  /** Router destination (typed route) */
  to: RouteLocationRaw;
  /** Button label text */
  label: string;
  /** Icon class (e.g., 'pi pi-arrow-right') */
  icon?: string;
  /** Icon position relative to label */
  iconPos?: "left" | "right";
  /** Visual style variant */
  variant?: "primary" | "secondary" | "text";
  /** Disabled state */
  disabled?: boolean;
}

const props = withDefaults(defineProps<ButtonLinkProps>(), {
  icon: undefined,
  iconPos: "right",
  variant: "primary",
  disabled: false,
});

const componentTag = computed(() => (props.disabled ? "span" : "router-link"));

const buttonClasses = computed(() => [
  `button-link--${props.variant}`,
  {
    "button-link--disabled": props.disabled,
    "button-link--icon-left": props.icon && props.iconPos === "left",
    "button-link--icon-right": props.icon && props.iconPos === "right",
  },
]);
</script>

<style lang="scss" scoped>
@use "sass:color";

.button-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 15px;
  font-weight: var(--font-weight-semibold);
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.1s ease;
  white-space: nowrap;
  user-select: none;

  &:active:not(.button-link--disabled) {
    transform: scale(0.98);
  }

  // Primary variant - matches PrimeVue primary button
  &--primary {
    background-color: $primary;
    color: white;

    &:hover:not(.button-link--disabled) {
      background-color: color.adjust($primary, $lightness: -10%);
    }

    &:focus-visible {
      outline: 2px solid $primary;
      outline-offset: 2px;
    }
  }

  // Secondary variant - outlined style
  &--secondary {
    background-color: transparent;
    color: $primary;
    border: 2px solid $primary;

    &:hover:not(.button-link--disabled) {
      background-color: rgba($primary, 0.1);
    }

    &:focus-visible {
      outline: 2px solid $primary;
      outline-offset: 2px;
    }
  }

  // Text variant - minimal style
  &--text {
    background-color: transparent;
    color: $primary;
    padding: 0.5rem 1rem;

    &:hover:not(.button-link--disabled) {
      background-color: rgba($primary, 0.1);
    }

    &:focus-visible {
      outline: 2px solid $primary;
      outline-offset: 2px;
    }
  }

  // Disabled state
  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  // Icon styles
  i {
    font-size: 1rem;
    flex-shrink: 0;
  }

  &__label {
    display: flex;
    align-items: center;
  }
}
</style>
