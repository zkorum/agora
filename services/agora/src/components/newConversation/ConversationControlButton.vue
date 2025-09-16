<template>
  <button
    :class="['button-base-style', { 'show-border': showBorder }]"
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
  }>(),
  {
    showBorder: true,
    icon: undefined,
    iconPosition: "right",
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
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: var(--font-weight-medium);
  font-size: 1rem;
  background: #6b4eff;
  background-color: #e7e7ff;
  color: #6b4eff;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease-in-out;

  &.show-border {
    border-color: #6b4eff;
  }

  &:hover {
    background-color: #dcdcfd;

    &.show-border {
      border-color: #6247e9;
    }
  }

  .icon {
    font-size: 1rem;
    color: #6b4eff;
  }
}
</style>
