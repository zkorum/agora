<template>
  <DialogStepLayout title="What languages do you speak?">
    <SpokenLanguageSelector
      :show-selected-section="false"
      @next="emit('next')"
    />

    <template #footer>
      <PrimeButton label="Next" class="next-button" @click="emit('next')" />
    </template>
  </DialogStepLayout>
</template>

<script setup lang="ts">
import DialogStepLayout from "src/components/onboarding/layouts/DialogStepLayout.vue";
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";

const emit = defineEmits<{ (e: "next"): void }>();
</script>

<style scoped lang="scss">
.next-button {
  width: 100%;
}
</style>
