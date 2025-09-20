<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-cog section-icon"></i>
        <span>{{ t("preferencesDialog") }}</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        {{ t("preferencesDialogDescription") }}
      </p>

      <div class="button-container">
        <PrimeButton
          :label="t('openPreferencesDialogButton')"
          icon="pi pi-external-link"
          class="test-button"
          @click="openPreferencesDialog"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useOnboardingPreferencesStore } from "src/stores/onboarding/preferences";
import {
  preferencesDialogTestTranslations,
  type PreferencesDialogTestTranslations,
} from "./PreferencesDialogTest.i18n";

const { t } = useComponentI18n<PreferencesDialogTestTranslations>(
  preferencesDialogTestTranslations
);

const preferencesStore = useOnboardingPreferencesStore();
const { openPreferencesDialog } = preferencesStore;
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 2rem 0;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.button-container {
  display: flex;
  justify-content: center;
}
</style>
