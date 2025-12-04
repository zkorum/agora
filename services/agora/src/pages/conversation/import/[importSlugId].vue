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
      <div class="import-status-page">
        <ImportStatusView :import-slug-id="importSlugId" />
      </div>
    </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ImportStatusView from "src/components/conversation/import/ImportStatusView.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  importStatusPageTranslations,
  type ImportStatusPageTranslations,
} from "./[importSlugId].i18n";

const { t } = useComponentI18n<ImportStatusPageTranslations>(
  importStatusPageTranslations
);

const route = useRoute("/conversation/import/[importSlugId]");
const importSlugId = computed(() => {
  const value = route.params.importSlugId;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});
</script>

<style scoped lang="scss">
.import-status-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}
</style>
