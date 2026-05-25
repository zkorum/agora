<template>
  <div class="dialogContainer">
    <div v-if="title" class="dialog-header">
      <div class="dialog-heading">
        <div class="dialog-title">{{ title }}</div>
        <div v-if="subtitle" class="dialog-subtitle">{{ subtitle }}</div>
      </div>
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
  subtitle?: string;
}>(), {
  title: undefined,
  subtitle: undefined,
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

.dialog-heading {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dialog-subtitle {
  color: $color-text-weak;
  font-size: 0.85rem;
  line-height: 1.3;
}

.close-btn {
  color: $color-text-weak;
  flex-shrink: 0;
}
</style>
