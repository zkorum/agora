<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
        <template #middle>{{ t("componentTesting") }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
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
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useOnboardingPreferencesStore } from "src/stores/onboarding/preferences";
import {
  componentTestingTranslations,
  type ComponentTestingTranslations,
} from "./component-testing.i18n";

const { t } = useComponentI18n<ComponentTestingTranslations>(
  componentTestingTranslations
);

const preferencesStore = useOnboardingPreferencesStore();
const { openPreferencesDialog } = preferencesStore;
</script>

<style scoped lang="scss">
.container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;

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
