<template>
  <div class="history-section">
    <AsyncStateHandler
      :query="props.exportHistoryQuery"
      :is-empty="() => isHistoryEmpty"
      :config="{
        loading: { text: t('loadingExports') },
        empty: { text: t('noExportsYet') },
        error: { title: t('errorLoadingExports') },
      }"
    >
      <!-- Export List -->
      <SettingsSection
        v-if="exports.length > 0"
        :settings-item-list="exportSettingsItems"
      />

      <!-- Empty State -->
      <div v-else class="empty-state">
        <p>{{ t("noExportsYet") }}</p>
      </div>
    </AsyncStateHandler>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import SettingsSection from "src/components/settings/SettingsSection.vue";
import type { UseQueryReturnType } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportHistoryListTranslations,
  type ExportHistoryListTranslations,
} from "./ExportHistoryList.i18n";
import { formatDateTime } from "src/utils/format";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import type { GetConversationExportHistoryResponse } from "src/shared/types/dto";

interface Props {
  conversationSlugId: string;
  exportHistoryQuery: UseQueryReturnType<
    GetConversationExportHistoryResponse,
    Error
  >;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ExportHistoryListTranslations>(
  exportHistoryListTranslations
);
const router = useRouter();

// Get export data directly (now a simple array)
const exports = computed(() => {
  return props.exportHistoryQuery.data.value ?? [];
});

const isHistoryEmpty = computed(() => {
  return exports.value.length === 0;
});

// Transform exports into SettingsInterface items
const exportSettingsItems = computed<SettingsInterface[]>(() => {
  return exports.value.map((item) => {
    const statusLabel = getStatusLabel(item.status);

    return {
      type: "action",
      key: item.exportSlugId,
      label: formatDateTime(new Date(item.createdAt)),
      value: statusLabel,
      action: () => navigateToExport(item.exportSlugId),
    };
  });
});

function navigateToExport(exportSlugId: string): void {
  void router.push({
    name: "/conversation/[conversationSlugId]/export.[exportId]",
    params: {
      conversationSlugId: props.conversationSlugId,
      exportId: exportSlugId,
    },
  });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "processing":
      return t("statusProcessing");
    case "completed":
      return t("statusCompleted");
    case "failed":
      return t("statusFailed");
    case "cancelled":
      return t("statusCancelled");
    default:
      return status;
  }
}
</script>

<style scoped lang="scss">
.history-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

// Empty State
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  p {
    margin: 0;
    font-size: 1rem;
  }
}
</style>
