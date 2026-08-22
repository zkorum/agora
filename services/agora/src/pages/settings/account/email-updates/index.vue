<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      title="Email Updates"
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

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});
</script>
