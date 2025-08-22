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
        <template #middle>{{ t("pageTitle") }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <SpokenLanguageSelector />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import SpokenLanguageSelector from "src/components/language/SpokenLanguageSelector.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  spokenLanguagesSettingsTranslations,
  type SpokenLanguagesSettingsTranslations,
} from "./SpokenLanguagesSettings.i18n";

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
