<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar
        :title="t('pageTitle')"
        :center-content="true"
        :fallback-route="`/conversation/${conversationSlugId}/`"
      />
    </Teleport>

    <WidthWrapper :enable="true">
      <div class="export-status-page">
        <ExportStatusView :export-slug-id="exportSlugId" />
      </div>
    </WidthWrapper>
  </div>
</template>

<script setup lang="ts">
import ExportStatusView from "src/components/conversation/export/ExportStatusView.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { processEnv } from "src/utils/processEnv";
import { getSingleRouteParam } from "src/utils/router/params";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ExportStatusPageTranslations,
  exportStatusPageTranslations,
} from "./export.[exportId].i18n";

const { isActive } = usePageLayout({ enableFooter: false, addBottomPadding: true });

const { t } = useComponentI18n<ExportStatusPageTranslations>(
  exportStatusPageTranslations
);
const router = useRouter();
const { showNotifyMessage } = useNotify();

const route = useRoute();

const conversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.conversationSlugId);
});

const exportSlugId = computed(() => {
  return getSingleRouteParam(route.params.exportId);
});

// Redirect if export feature is disabled
if (processEnv.VITE_EXPORT_CONVOS_ENABLED === "false") {
  showNotifyMessage(t("exportFeatureDisabled"));
  void router.replace({
    name: "/conversation/[postSlugId]/",
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
