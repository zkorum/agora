<template>
  <div class="dialogContainer">
    <q-btn
      v-close-popup
      flat
      round
      dense
      icon="mdi-close"
      size="sm"
      class="close-btn"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ClosePopup } from "quasar";

const vClosePopup = ClosePopup;
</script>

<style lang="scss" scoped>
.dialogContainer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  position: relative;
  background-color: white;
  border-radius: 25px 25px 0 0;
  width: min(30rem, 100%);
  max-height: 85vh;
  overflow-y: auto;

  @media (min-width: $breakpoint-sm-min) {
    gap: 1rem;
    padding: 2rem;
  }
}

.close-btn {
  position: absolute;
  top: 0.75rem;
  inset-inline-end: 0.75rem;
  color: $color-text-weak;
  z-index: 1;

  @media (min-width: $breakpoint-sm-min) {
    top: 1rem;
    inset-inline-end: 1rem;
  }
}
</style>
