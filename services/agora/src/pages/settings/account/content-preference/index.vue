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
      <StandardMenuBar :title="t('contentPreference')" :center-content="true" />
    </template>

    <MutedUsers v-if="isAuthInitialized" />
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import MutedUsers from "src/components/settings/MutedUsers.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";

import {
  type ContentPreferenceTranslations,
  contentPreferenceTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<ContentPreferenceTranslations>(
  contentPreferenceTranslations
);

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
</script>
