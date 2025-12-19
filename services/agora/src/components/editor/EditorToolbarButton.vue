<template>
  <PrimeButton
    type="button"
    class="editor-toolbar-button"
    :class="{ 'is-active': isActive }"
    :disabled="disabled"
    text
    severity="secondary"
    @click="handleClick"
  >
    <div class="icon-wrapper">
      <Icon :icon="icon" width="20" height="20" />
    </div>
  </PrimeButton>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";

interface Props {
  icon: string;
  isActive?: boolean;
  disabled?: boolean;
}

// Emits should be defined before logic, though not strict.
const emit = defineEmits<{
  click: [];
}>();

withDefaults(defineProps<Props>(), {
  isActive: false,
  disabled: false,
});

function handleClick() {
  emit("click");
}
</script>

<style scoped lang="scss">
.editor-toolbar-button {
  width: 40px;
  height: 40px;
  padding: 0 !important;
  border-radius: 8px !important;
  transition: all 0.2s ease;
  color: $color-text-strong !important;

  &:hover {
    background-color: $mouse-hover-color !important;
  }

  &.is-active {
    background-color: rgba($primary, 0.15) !important;
    color: $primary !important;

    &:hover {
      background-color: rgba($primary, 0.2) !important;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background-color: transparent !important;
  }

  // Ensure content is centered
  :deep(.p-button-label) {
    display: none;
  }
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
