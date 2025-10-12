<template>
  <div class="history-section">
    <AsyncStateHandler
      :query="exportHistoryQuery"
      :is-empty="() => !exportHistoryQuery.data.value?.length"
      :config="{
        loading: { text: t('loadingExports') },
        empty: { text: t('noExportsYet') },
        error: { title: t('errorLoadingExports') },
      }"
    >
      <SettingsSection :settings-item-list="exportSettingsItems" />
    </AsyncStateHandler>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDateFormat, useTimeAgo } from "@vueuse/core";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import SettingsSection from "src/components/settings/SettingsSection.vue";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { useExportHistoryQuery } from "src/utils/api/conversationExport/useConversationExportQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportHistoryListTranslations,
  type ExportHistoryListTranslations,
} from "./ExportHistoryList.i18n";
import { useAuthenticationStore } from "src/stores/authentication";

interface Props {
  conversationSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ExportHistoryListTranslations>(
  exportHistoryListTranslations
);
const router = useRouter();

const authStore = useAuthenticationStore();
const { isAuthInitialized } = storeToRefs(authStore);

const exportHistoryQuery = useExportHistoryQuery({
  conversationSlugId: props.conversationSlugId,
  enabled: computed(() => isAuthInitialized.value),
});

const exportSettingsItems = computed<SettingsInterface[]>(() => {
  if (!exportHistoryQuery.data.value) {
    return [];
  }

  return exportHistoryQuery.data.value.map((exportItem) => ({
    type: "action",
    label: formatDate(exportItem.createdAt),
    value: useTimeAgo(exportItem.createdAt).value,
    action: () => {
      void router.push({
        name: "/conversation/[conversationSlugId]/export.[exportId]",
        params: {
          conversationSlugId: props.conversationSlugId,
          exportId: exportItem.exportSlugId,
        },
      });
    },
  }));
});

function formatDate(date: Date): string {
  return useDateFormat(date, "MMM D, YYYY hh:mm A").value;
}
</script>

<style scoped lang="scss">
.history-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 5rem;
}
</style>
