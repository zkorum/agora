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
      <StandardMenuBar :title="t('componentTesting')" :center-content="true" />
    </template>

    <div class="container">
      <PreferencesDialogTest />
      <OpinionGroupVisualizationTest />
      <AsyncStateHandlerTest />
      <EmbeddedBrowserWarningTest />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import PreferencesDialogTest from "./test-components/PreferencesDialogTest.vue";
import OpinionGroupVisualizationTest from "./test-components/OpinionGroupVisualizationTest.vue";
import AsyncStateHandlerTest from "./test-components/AsyncStateHandlerTest.vue";
import EmbeddedBrowserWarningTest from "./test-components/EmbeddedBrowserWarningTest.vue";
import {
  componentTestingTranslations,
  type ComponentTestingTranslations,
} from "./component-testing.i18n";

const { t } = useComponentI18n<ComponentTestingTranslations>(
  componentTestingTranslations
);
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
