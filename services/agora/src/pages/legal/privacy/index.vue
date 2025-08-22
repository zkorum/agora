<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
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
        <template #middle> {{ t("privacyPolicy") }}</template>
      </DefaultMenuBar>
    </template>

    <div>
      {{ t("referTo") }}
      <a
        href="https://zkorum.notion.site/Privacy-Policy-ac5d0d7c91f142e481daa8f826b0e2b2"
        rel="noopener noreferrer"
        target="_blank"
        >{{ t("externalPageLink") }}</a
      >
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import {
  privacyPolicyTranslations,
  type PrivacyPolicyTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<PrivacyPolicyTranslations>(
  privacyPolicyTranslations
);
</script>

<style scoped lang="scss">
a {
  color: $primary;
  text-decoration: underline;
}
</style>
