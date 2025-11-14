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
          label="Test: X Browser"
          icon="pi pi-twitter"
          class="test-button"
          @click="openWarning('X', 'twitter')"
        />
        <PrimeButton
          label="Test: Telegram"
          icon="pi pi-telegram"
          class="test-button"
          @click="openWarning('Telegram', 'telegram')"
        />
        <PrimeButton
          label="Test: WeChat"
          icon="pi pi-comments"
          class="test-button"
          @click="openWarning('WeChat', 'wechat')"
        />
        <PrimeButton
          label="Test: Instagram"
          icon="pi pi-instagram"
          class="test-button"
          @click="openWarning('Instagram', 'instagram')"
        />
        <PrimeButton
          label="Test: Facebook"
          icon="pi pi-facebook"
          class="test-button"
          @click="openWarning('Facebook', 'facebook')"
        />
        <PrimeButton
          label="Test: Generic (no app name)"
          icon="pi pi-question-circle"
          class="test-button"
          severity="secondary"
          @click="openWarning(undefined, undefined)"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useEmbeddedBrowserWarningStore, type AppKey } from "src/stores/embeddedBrowserWarning";
import {
  embeddedBrowserWarningTestTranslations,
  type EmbeddedBrowserWarningTestTranslations,
} from "./EmbeddedBrowserWarningTest.i18n";

const { t } = useComponentI18n<EmbeddedBrowserWarningTestTranslations>(
  embeddedBrowserWarningTestTranslations
);

const warningStore = useEmbeddedBrowserWarningStore();

const openWarning = (appName: string | undefined, appKey: AppKey) => {
  warningStore.openWarning(appName, appKey);
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
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}
</style>
