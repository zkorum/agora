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
      <div class="export-page">
        <div class="page-description">
          {{ t("pageDescription") }}
        </div>

        <!-- Request New Export Section -->
        <div class="request-section">
          <PrimeButton
            :label="t('requestNewExport')"
            icon="pi pi-download"
            :loading="requestExportMutation.isPending.value"
            :disabled="requestExportMutation.isPending.value"
            @click="handleRequestExport"
          />
          <div v-if="requestExportMutation.isError.value" class="error-message">
            {{ t("failedToRequestExport") }}
          </div>
          <div
            v-if="requestExportMutation.isSuccess.value"
            class="success-message"
          >
            {{ t("exportRequestSuccessful") }}
          </div>
        </div>

        <!-- Export History List -->
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
            <div class="export-list">
              <div
                v-for="exportItem in exportHistoryQuery.data.value"
                :key="exportItem.exportSlugId"
                class="export-item"
              >
                <div class="export-info">
                  <div class="export-id">
                    {{ t("exportId") }}: #{{ exportItem.exportSlugId }}
                  </div>
                  <div class="export-date">
                    {{ t("createdAt") }}: {{ formatDate(exportItem.createdAt) }}
                  </div>
                  <div class="export-status">
                    <q-chip
                      :color="getStatusColor(exportItem.status)"
                      text-color="white"
                      :icon="getStatusIcon(exportItem.status)"
                    >
                      {{ getStatusLabel(exportItem.status) }}
                    </q-chip>
                  </div>
                </div>

                <div class="export-actions">
                  <PrimeButton
                    v-if="
                      exportItem.status === 'completed' &&
                      exportItem.downloadUrl
                    "
                    :label="t('download')"
                    icon="pi pi-download"
                    severity="success"
                    @click="handleDownload(exportItem.downloadUrl!)"
                  />
                  <div
                    v-if="exportItem.status === 'failed'"
                    class="failed-message"
                  >
                    {{ t("exportFailed") }}
                  </div>
                </div>
              </div>
            </div>
          </AsyncStateHandler>
        </div>
      </div>
    </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDateFormat } from "@vueuse/core";
import { useRouteParams } from "@vueuse/router";
import { useRouter } from "vue-router";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import {
  useExportHistoryQuery,
  useRequestExportMutation,
} from "src/utils/api/conversationExport/useConversationExportQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportPageTranslations,
  type ExportPageTranslations,
} from "./export.i18n";
import type { ExportStatus } from "src/shared/types/zod";

const { t } = useComponentI18n<ExportPageTranslations>(exportPageTranslations);
const router = useRouter();

const conversationSlugIdParam = useRouteParams("conversationSlugId");
const conversationSlugId = computed(() => {
  const value = conversationSlugIdParam.value;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});

// Queries and mutations
const exportHistoryQuery = useExportHistoryQuery({
  conversationSlugId: conversationSlugId.value,
  enabled: true,
});

const requestExportMutation = useRequestExportMutation();

async function handleRequestExport(): Promise<void> {
  try {
    const result = await requestExportMutation.mutateAsync(
      conversationSlugId.value
    );
    // Navigate to the export status page to track progress
    await router.push({
      name: "/conversation/[conversationSlugId]/export.[exportId]",
      params: {
        conversationSlugId: conversationSlugId.value,
        exportId: result.exportSlugId,
      },
    });
  } catch (error) {
    // Error handling is managed by the mutation's error state
    console.error("Failed to request export:", error);
  }
}

function handleDownload(url: string): void {
  window.open(url, "_blank");
}

function formatDate(date: Date): string {
  return useDateFormat(date, "MMM D, YYYY HH:mm z").value;
}

function getStatusColor(status: ExportStatus): string {
  switch (status) {
    case "processing":
      return "blue";
    case "completed":
      return "green";
    case "failed":
      return "red";
  }
}

function getStatusIcon(status: ExportStatus): string {
  switch (status) {
    case "processing":
      return "hourglass_empty";
    case "completed":
      return "check_circle";
    case "failed":
      return "error";
  }
}

function getStatusLabel(status: ExportStatus): string {
  switch (status) {
    case "processing":
      return t("statusProcessing");
    case "completed":
      return t("statusCompleted");
    case "failed":
      return t("statusFailed");
  }
}
</script>

<style scoped lang="scss">
.export-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}

.page-description {
  font-size: 1rem;
  color: $color-text-strong;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.request-section {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 1rem;
}

.error-message {
  color: $negative;
  font-size: 0.9rem;
}

.success-message {
  color: $positive;
  font-size: 0.9rem;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 5rem;
}

.export-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.export-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid $color-border-weak;
  border-radius: 8px;
  background-color: $color-background-default;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.export-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.export-id {
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.export-date {
  font-size: 0.9rem;
  color: $color-text-weak;
}

.export-status {
  margin-top: 0.25rem;
}

.export-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;

  @media (min-width: 768px) {
    align-items: flex-end;
  }
}

.failed-message {
  font-size: 0.9rem;
  color: $negative;
}
</style>
