<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
  </Teleport>

  <div class="container">
    <SpokenLanguageSelector />
  </div>
</template>

<script setup lang="ts">
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type SpokenLanguagesSettingsTranslations,
  spokenLanguagesSettingsTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ enableFooter: false, reducedWidth: true, addBottomPadding: true });

const { t } = useComponentI18n<SpokenLanguagesSettingsTranslations>(
  spokenLanguagesSettingsTranslations
);
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
