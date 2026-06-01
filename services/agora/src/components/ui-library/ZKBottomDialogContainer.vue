<template>
  <div class="dialogContainer">
    <div v-if="title" class="dialog-header">
      <div class="dialog-title-row">
        <slot name="leadingAction" />
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
      <div v-if="subtitle || $slots.subtitleAction" class="dialog-subtitle-row">
        <div v-if="subtitle" class="dialog-subtitle">{{ subtitle }}</div>
        <slot name="subtitleAction" />
      </div>
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
  flex-direction: column;
  gap: 0.85rem;
  flex-shrink: 0;
}

.dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.dialog-title {
  flex: 1;
  min-width: 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.dialog-subtitle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dialog-subtitle {
  color: $color-text-weak;
  font-size: 0.85rem;
  line-height: 1.3;
  min-width: 0;
}

.close-btn {
  color: $color-text-weak;
  flex-shrink: 0;
}
</style>
