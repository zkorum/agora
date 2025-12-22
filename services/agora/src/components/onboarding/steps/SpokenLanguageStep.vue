<template>
  <DialogStepLayout :title="t('title')">
    <SpokenLanguageSelector @next="emit('next')" />

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
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";
import DialogStepLayout from "src/components/onboarding/layouts/DialogStepLayout.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type SpokenLanguageStepTranslations,
  spokenLanguageStepTranslations,
} from "./SpokenLanguageStep.i18n";

const emit = defineEmits<{ (e: "next"): void }>();

const { t } = useComponentI18n<SpokenLanguageStepTranslations>(
  spokenLanguageStepTranslations
);

</script>

<style scoped lang="scss">
.next-button {
  width: 100%;
}
</style>
