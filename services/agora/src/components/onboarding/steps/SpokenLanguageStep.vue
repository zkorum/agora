<template>
  <DialogStepLayout
    title="Select Spoken Languages"
    description="Choose one or more languages you speak"
  >
    <SpokenLanguageSelector
      :show-selected-section="false"
      @next="emit('next')"
    />

    <template #footer>
      <button class="confirm-button" @click="emit('next')">Confirm</button>
    </template>
  </DialogStepLayout>
</template>

<script setup lang="ts">
import DialogStepLayout from "src/components/onboarding/layouts/DialogStepLayout.vue";
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";

const emit = defineEmits<{ (e: "next"): void }>();
</script>

<style scoped lang="scss">
.confirm-button {
  width: 100%;
  padding: 0.75rem;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: #0056d3;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
}
</style>
