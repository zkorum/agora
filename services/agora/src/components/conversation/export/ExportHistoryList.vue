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
import { useTimeAgo } from "@vueuse/core";
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
import { formatDateTime } from "src/utils/format";

interface Props {
  conversationSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ExportHistoryListTranslations>(
  exportHistoryListTranslations
);
const router = useRouter();

const authStore = useAuthenticationStore();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(authStore);

const exportHistoryQuery = useExportHistoryQuery({
  conversationSlugId: props.conversationSlugId,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

const exportSettingsItems = computed<SettingsInterface[]>(() => {
  if (!exportHistoryQuery.data.value) {
    return [];
  }

  return exportHistoryQuery.data.value.map((exportItem) => ({
    type: "action",
    label: formatDateTime(exportItem.createdAt),
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
</script>

<style scoped lang="scss">
.history-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
