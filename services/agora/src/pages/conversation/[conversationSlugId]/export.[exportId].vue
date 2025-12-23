<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: true,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <WidthWrapper :enable="true">
      <div class="export-status-page">
        <ExportStatusView :export-slug-id="exportSlugId" />
      </div>
    </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import ExportStatusView from "src/components/conversation/export/ExportStatusView.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { processEnv } from "src/utils/processEnv";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ExportStatusPageTranslations,
  exportStatusPageTranslations,
} from "./export.[exportId].i18n";

const { t } = useComponentI18n<ExportStatusPageTranslations>(
  exportStatusPageTranslations
);
const router = useRouter();
const { showNotifyMessage } = useNotify();

const route = useRoute("/conversation/[conversationSlugId]/export.[exportId]");

const conversationSlugId = computed(() => {
  const value = route.params.conversationSlugId;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});

const exportSlugId = computed(() => {
  const value = route.params.exportId;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});

// Redirect if export feature is disabled
if (processEnv.VITE_CONVERSATION_EXPORT_ENABLED === "false") {
  showNotifyMessage(t("exportFeatureDisabled"));
  void router.replace({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: conversationSlugId.value },
  });
}
</script>

<style scoped lang="scss">
.export-status-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}
</style>
