<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('contentPreference')" :center-content="true" />
  </Teleport>

  <MutedUsers v-if="isAuthInitialized" />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import MutedUsers from "src/components/settings/MutedUsers.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";

import {
  type ContentPreferenceTranslations,
  contentPreferenceTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });

const { t } = useComponentI18n<ContentPreferenceTranslations>(
  contentPreferenceTranslations
);

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
</script>
