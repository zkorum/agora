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
        <template #middle>Component Testing</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <Card class="test-section-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-cog section-icon"></i>
            <span>Preferences Dialog</span>
          </div>
        </template>
        <template #content>
          <p class="section-description">
            Test the post-signup preferences dialog that allows users to select
            their language and topic preferences after creating an account.
          </p>

          <div class="button-container">
            <PrimeButton
              label="Open Preferences Dialog"
              icon="pi pi-external-link"
              class="test-button"
              @click="openPreferencesDialog"
            />
          </div>
        </template>
      </Card>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import Card from "primevue/card";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useOnboardingPreferencesStore } from "src/stores/onboarding/preferences";

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
