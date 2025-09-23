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
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <div class="container">
      <SpokenLanguageSelector />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  spokenLanguagesSettingsTranslations,
  type SpokenLanguagesSettingsTranslations,
} from "./index.i18n";

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
