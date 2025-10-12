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
        <div class="back-link">
          <RouterLink
            :to="{
              name: '/conversation/[conversationSlugId]/export',
              params: { conversationSlugId: conversationSlugId },
            }"
          >
            <PrimeButton
              :label="t('backToHistory')"
              icon="pi pi-arrow-left"
              severity="secondary"
              text
            />
          </RouterLink>
        </div>

        <ExportStatusView :export-slug-id="exportSlugId" />
      </div>
    </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouteParams } from "@vueuse/router";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ExportStatusView from "src/components/conversation/export/ExportStatusView.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportStatusPageTranslations,
  type ExportStatusPageTranslations,
} from "./export.[exportId].i18n";

const { t } = useComponentI18n<ExportStatusPageTranslations>(
  exportStatusPageTranslations
);

const conversationSlugIdParam = useRouteParams("conversationSlugId");
const conversationSlugId = computed(() => {
  const value = conversationSlugIdParam.value;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});

const exportIdParam = useRouteParams("exportId");
const exportSlugId = computed(() => {
  const value = exportIdParam.value;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});
</script>

<style scoped lang="scss">
.export-status-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}

.back-link {
  display: flex;
  align-items: center;
}
</style>
