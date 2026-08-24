<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      :title="t('pageTitle')"
      :center-content="true"
      fallback-route="/settings/"
    />
  </Teleport>

  <ConversationUpdatePreferenceSettings />
</template>

<script setup lang="ts">
import ConversationUpdatePreferenceSettings from "src/components/conversationUpdates/ConversationUpdatePreferenceSettings.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type EmailUpdatesSettingsPageTranslations,
  emailUpdatesSettingsPageTranslations,
} from "./emailUpdatesSettingsPage.i18n";

const { t } = useComponentI18n<EmailUpdatesSettingsPageTranslations>(
  emailUpdatesSettingsPageTranslations
);

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});
</script>
