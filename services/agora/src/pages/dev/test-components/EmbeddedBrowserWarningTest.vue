<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-external-link section-icon"></i>
        <span>{{ t("embeddedBrowserWarning") }}</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        {{ t("embeddedBrowserWarningDescription") }}
      </p>

      <div class="button-container">
        <PrimeButton
          :label="t('openWarningButton')"
          icon="pi pi-exclamation-triangle"
          class="test-button"
          @click="openWarning"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useEmbeddedBrowserWarningStore } from "src/stores/embeddedBrowserWarning";
import {
  embeddedBrowserWarningTestTranslations,
  type EmbeddedBrowserWarningTestTranslations,
} from "./EmbeddedBrowserWarningTest.i18n";

const { t } = useComponentI18n<EmbeddedBrowserWarningTestTranslations>(
  embeddedBrowserWarningTestTranslations
);

const warningStore = useEmbeddedBrowserWarningStore();

const openWarning = () => {
  warningStore.openWarning("Telegram", "telegram");
};
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
