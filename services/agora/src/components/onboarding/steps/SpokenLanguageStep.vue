<template>
  <DialogStepLayout :title="t('title')">
    <SpokenLanguageSelector
      :show-selected-section="false"
      @next="emit('next')"
    />

    <template #footer>
      <PrimeButton
        :label="t('nextButton')"
        class="next-button"
        @click="emit('next')"
      />
    </template>
  </DialogStepLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import DialogStepLayout from "src/components/onboarding/layouts/DialogStepLayout.vue";
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";
import {
  spokenLanguageStepTranslations,
  type SpokenLanguageStepTranslations,
} from "./SpokenLanguageStep.i18n";

const { t } = useComponentI18n<SpokenLanguageStepTranslations>(
  spokenLanguageStepTranslations
);

const emit = defineEmits<{ (e: "next"): void }>();
</script>

<style scoped lang="scss">
.next-button {
  width: 100%;
}
</style>
