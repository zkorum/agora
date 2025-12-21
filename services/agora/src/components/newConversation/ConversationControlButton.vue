<template>
  <button
    :class="[
      'button-base-style',
      `variant-${variant}`,
      { 'show-border': showBorder },
    ]"
    type="button"
    @click="$emit('click')"
  >
    <i v-if="icon && iconPosition === 'left'" :class="icon" class="icon" />
    <span>{{ label }}</span>
    <i v-if="icon && iconPosition === 'right'" :class="icon" class="icon" />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    icon?: string;
    showBorder?: boolean;
    iconPosition?: "left" | "right";
    variant?: "light" | "filled";
  }>(),
  {
    showBorder: true,
    icon: undefined,
    iconPosition: "right",
    variant: "light",
  }
);

defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.button-base-style {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-weight: var(--font-weight-medium);
  font-size: 1rem;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease-in-out;
  min-height: 48px; // WCAG 2.2 AA minimum touch target

  // Light variant (default - original style)
  &.variant-light {
    background-color: #e7e7ff;
    color: #6b4eff;

    &.show-border {
      border-color: #6b4eff;
    }

    &:hover {
      background-color: #dcdcfd;

      &.show-border {
        border-color: #6247e9;
      }
    }

    &:active {
      background-color: #d0d0fb;
      transform: scale(0.98);
    }

    .icon {
      color: #6b4eff;
    }
  }

  // Filled variant (prominent CTA style)
  &.variant-filled {
    background-color: #6b4eff;
    color: #ffffff;
    box-shadow:
      0 2px 8px rgba(107, 78, 255, 0.25),
      0 1px 3px rgba(107, 78, 255, 0.15);

    &.show-border {
      border-color: #5a3de8;
    }

    &:hover {
      background-color: #5a3de8;
      box-shadow:
        0 4px 12px rgba(107, 78, 255, 0.3),
        0 2px 4px rgba(107, 78, 255, 0.2);
    }

    &:active {
      background-color: #4d32d1;
      transform: scale(0.98);
      box-shadow:
        0 1px 4px rgba(107, 78, 255, 0.2),
        0 1px 2px rgba(107, 78, 255, 0.1);
    }

    .icon {
      color: #ffffff;
    }
  }

  .icon {
    font-size: 1rem;
  }
}
</style>
