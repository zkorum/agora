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
        <template #middle>{{
          t("settings.language.spokenLanguages.title")
        }}</template>
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
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
