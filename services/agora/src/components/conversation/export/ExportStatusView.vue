<template>
  <div class="export-status-view">
    <AsyncStateHandler
      :query="exportStatusQuery"
      :is-empty="() => false"
      :config="{
        loading: { text: t('loadingStatus') },
        error: { title: t('errorLoadingStatus') },
      }"
    >
      <div v-if="exportStatusQuery.data.value" class="status-content">
        <!-- Status Badge -->
        <div class="status-header">
          <q-chip
            :color="getStatusColor(exportStatusQuery.data.value.status)"
            text-color="white"
            :icon="getStatusIcon(exportStatusQuery.data.value.status)"
            size="lg"
          >
            {{ getStatusLabel(exportStatusQuery.data.value.status) }}
          </q-chip>
        </div>

        <!-- Status Message -->
        <div class="status-message">
          <div
            v-if="exportStatusQuery.data.value.status === 'processing'"
            class="processing-message"
          >
            <q-spinner color="primary" size="md" />
            <p>{{ t("processingMessage") }}</p>
          </div>
          <div
            v-else-if="exportStatusQuery.data.value.status === 'completed'"
            class="completed-message"
          >
            <q-icon name="check_circle" color="positive" size="md" />
            <p>{{ t("completedMessage") }}</p>
          </div>
          <div
            v-else-if="exportStatusQuery.data.value.status === 'failed'"
            class="failed-message"
          >
            <q-icon name="error" color="negative" size="md" />
            <p>{{ t("failedMessage") }}</p>
          </div>
        </div>

        <!-- URL Expiration Warning -->
        <div
          v-if="
            exportStatusQuery.data.value.status === 'completed' &&
            exportStatusQuery.data.value.urlExpiresAt &&
            isUrlExpiringSoon(exportStatusQuery.data.value.urlExpiresAt)
          "
          class="warning-banner"
        >
          <q-icon name="warning" size="sm" />
          <span>{{ t("urlExpiresSoon") }}</span>
        </div>

        <!-- Download Button -->
        <div
          v-if="
            exportStatusQuery.data.value.status === 'completed' &&
            exportStatusQuery.data.value.downloadUrl
          "
          class="download-section"
        >
          <PrimeButton
            :label="t('download')"
            icon="pi pi-download"
            severity="success"
            size="large"
            @click="handleDownload(exportStatusQuery.data.value.downloadUrl!)"
          />
        </div>

        <!-- Export Information Card -->
        <div class="info-card">
          <h3 class="info-title">{{ t("exportInfo") }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t("exportId") }}:</span>
              <span class="info-value"
                >#{{ exportStatusQuery.data.value.exportSlugId }}</span
              >
            </div>
            <div class="info-item">
              <span class="info-label">{{ t("conversationId") }}:</span>
              <span class="info-value">{{
                exportStatusQuery.data.value.conversationSlugId
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t("createdAt") }}:</span>
              <span class="info-value">{{
                formatDate(exportStatusQuery.data.value.createdAt)
              }}</span>
            </div>
            <div v-if="exportStatusQuery.data.value.fileSize" class="info-item">
              <span class="info-label">{{ t("fileSize") }}:</span>
              <span class="info-value">{{
                formatFileSize(exportStatusQuery.data.value.fileSize)
              }}</span>
            </div>
            <div
              v-if="exportStatusQuery.data.value.opinionCount !== undefined"
              class="info-item"
            >
              <span class="info-label">{{ t("opinionCount") }}:</span>
              <span class="info-value">{{
                exportStatusQuery.data.value.opinionCount
              }}</span>
            </div>
            <div
              v-if="
                exportStatusQuery.data.value.urlExpiresAt &&
                exportStatusQuery.data.value.status === 'completed'
              "
              class="info-item"
            >
              <span class="info-label">{{ t("urlExpiresAt") }}:</span>
              <span class="info-value">{{
                formatDate(exportStatusQuery.data.value.urlExpiresAt)
              }}</span>
            </div>
            <div
              v-if="
                exportStatusQuery.data.value.errorMessage &&
                exportStatusQuery.data.value.status === 'failed'
              "
              class="info-item error-item"
            >
              <span class="info-label">{{ t("errorMessage") }}:</span>
              <span class="info-value">{{
                exportStatusQuery.data.value.errorMessage
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </AsyncStateHandler>
  </div>
</template>

<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useExportStatusQuery } from "src/utils/api/conversationExport/useConversationExportQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportStatusViewTranslations,
  type ExportStatusViewTranslations,
} from "./ExportStatusView.i18n";
import type { ExportStatus } from "src/shared/types/zod";

interface Props {
  exportSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ExportStatusViewTranslations>(
  exportStatusViewTranslations
);

const exportStatusQuery = useExportStatusQuery({
  exportSlugId: props.exportSlugId,
  enabled: true,
});

function handleDownload(url: string): void {
  window.open(url, "_blank");
}

function formatDate(date: Date): string {
  return useDateFormat(date, "MMM D, YYYY HH:mm z").value;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function isUrlExpiringSoon(expiresAt: Date): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const thirtyMinutesInMs = 30 * 60 * 1000;
  return expiryTime - now < thirtyMinutesInMs && expiryTime > now;
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
.export-status-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.status-header {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.status-message {
  display: flex;
  justify-content: center;
  padding: 2rem;
  border-radius: 8px;
  background-color: $app-background-color;

  .processing-message,
  .completed-message,
  .failed-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;

    p {
      margin: 0;
      font-size: 1.1rem;
      color: $color-text-strong;
    }
  }
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: rgba($warning, 0.1);
  border: 1px solid $warning;
  color: $warning;
  font-weight: var(--font-weight-semibold);
}

.download-section {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.info-card {
  padding: 2rem;
  border: 1px solid $color-border-weak;
  border-radius: 8px;
  background-color: $color-background-default;
}

.info-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &.error-item {
    grid-column: 1 / -1;
  }
}

.info-label {
  font-size: 0.9rem;
  color: $color-text-weak;
  font-weight: var(--font-weight-semibold);
}

.info-value {
  font-size: 1rem;
  color: $color-text-strong;
  word-break: break-word;
}

.error-item .info-value {
  color: $negative;
}
</style>
