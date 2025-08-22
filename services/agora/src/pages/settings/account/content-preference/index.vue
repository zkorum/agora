<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
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
        <template #middle> {{ t("contentPreference") }}</template>
      </DefaultMenuBar>
    </template>

    <MutedUsers v-if="isAuthInitialized" />
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import { storeToRefs } from "pinia";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import MutedUsers from "src/components/settings/MutedUsers.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  contentPreferenceTranslations,
  type ContentPreferenceTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<ContentPreferenceTranslations>(
  contentPreferenceTranslations
);

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
</script>
