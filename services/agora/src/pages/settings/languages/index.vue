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
        <template #middle>{{ t("settings.language.title") }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <SettingsSection :settings-item-list="languageSettings" />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import SettingsSection from "src/components/settings/SettingsSection.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

const languageSettings: SettingsInterface[] = [
  {
    label: t("settings.language.displayLanguage"),
    action: () => {
      void router.push({ name: "/settings/languages/display-language/" });
    },
    style: "none",
  },
  {
    label: t("settings.language.spokenLanguages"),
    action: () => {
      void router.push({ name: "/settings/languages/spoken-languages/" });
    },
    style: "none",
  },
];
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
