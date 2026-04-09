<template>
  <div class="dialogContainer">
    <div v-if="title" class="dialog-header">
      <div class="dialog-title">{{ title }}</div>
      <q-btn
        v-close-popup
        flat
        round
        dense
        icon="mdi-close"
        size="sm"
        class="close-btn"
      />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ClosePopup } from "quasar";

withDefaults(defineProps<{
  title?: string;
}>(), {
  title: undefined,
});

const vClosePopup = ClosePopup;

</script>

<style lang="scss" scoped>
.dialogContainer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  background-color: white;
  border-radius: 25px 25px 0 0;
  width: min(30rem, 100%);
  max-height: 70dvh;
  overflow-y: auto;

  @media (min-width: $breakpoint-sm-min) {
    gap: 1rem;
    padding: 2rem;
    max-height: 85dvh;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.close-btn {
  color: $color-text-weak;
  flex-shrink: 0;
}
</style>
