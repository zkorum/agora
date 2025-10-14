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
        <!-- Status Message -->
        <div
          v-if="
            exportStatusQuery.data.value.status === 'processing' ||
            exportStatusQuery.data.value.status === 'failed'
          "
          class="status-message"
        >
          <div
            v-if="exportStatusQuery.data.value.status === 'processing'"
            class="processing-message"
          >
            <q-spinner color="primary" size="md" />
            <p>{{ t("processingMessage") }}</p>
          </div>
          <div
            v-else-if="exportStatusQuery.data.value.status === 'failed'"
            class="failed-message"
          >
            <q-icon name="error" color="negative" size="md" />
            <p>{{ t("failedMessage") }}</p>
          </div>
        </div>

        <!-- Export Information Card -->
        <div class="info-card">
          <h3 class="info-title">{{ t("exportInfo") }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t("exportId") }}:</span>
              <span class="info-value">{{
                exportStatusQuery.data.value.exportSlugId
              }}</span>
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
            <div
              v-if="exportStatusQuery.data.value.totalFileCount"
              class="info-item"
            >
              <span class="info-label">{{ t("totalFiles") }}:</span>
              <span class="info-value">{{
                exportStatusQuery.data.value.totalFileCount
              }}</span>
            </div>
            <div
              v-if="exportStatusQuery.data.value.totalFileSize"
              class="info-item"
            >
              <span class="info-label">{{ t("totalSize") }}:</span>
              <span class="info-value">{{
                formatFileSize(exportStatusQuery.data.value.totalFileSize)
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

        <!-- Available Files Section -->
        <div
          v-if="
            exportStatusQuery.data.value.status === 'completed' &&
            exportStatusQuery.data.value.files &&
            exportStatusQuery.data.value.files.length > 0
          "
          class="files-section"
        >
          <h3 class="section-title">{{ t("availableFiles") }}</h3>
          <div class="files-list">
            <div
              v-for="file in exportStatusQuery.data.value.files"
              :key="file.fileType"
              class="file-card"
            >
              <!-- Expiration Warning for this file -->
              <div
                v-if="isUrlExpiringSoon(file.urlExpiresAt)"
                class="file-warning"
              >
                <q-icon name="warning" size="xs" />
                <span>{{ t("urlExpiresSoon") }}</span>
              </div>

              <div class="file-header">
                <q-icon name="description" size="md" color="primary" />
                <span class="file-name">{{ file.fileName }}</span>
              </div>

              <div class="file-details">
                <div class="file-detail-item">
                  <span class="detail-label">{{ t("fileSize") }}:</span>
                  <span class="detail-value">{{
                    formatFileSize(file.fileSize)
                  }}</span>
                </div>
                <div class="file-detail-item">
                  <span class="detail-label">{{ t("recordCount") }}:</span>
                  <span class="detail-value">{{ file.recordCount }}</span>
                </div>
                <div class="file-detail-item">
                  <span class="detail-label">{{ t("urlExpiresAt") }}:</span>
                  <span class="detail-value">{{
                    formatDate(file.urlExpiresAt)
                  }}</span>
                </div>
              </div>

              <div class="file-actions">
                <a
                  :href="file.downloadUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  class="download-link"
                >
                  <PrimeButton
                    :label="t('download')"
                    icon="pi pi-download"
                    severity="success"
                    size="small"
                    as="span"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AsyncStateHandler>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDateFormat } from "@vueuse/core";
import { storeToRefs } from "pinia";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useExportStatusQuery } from "src/utils/api/conversationExport/useConversationExportQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportStatusViewTranslations,
  type ExportStatusViewTranslations,
} from "./ExportStatusView.i18n";
import { useAuthenticationStore } from "src/stores/authentication";

interface Props {
  exportSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ExportStatusViewTranslations>(
  exportStatusViewTranslations
);

const authStore = useAuthenticationStore();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(authStore);

const exportStatusQuery = useExportStatusQuery({
  exportSlugId: props.exportSlugId,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

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

  .download-link {
    text-decoration: none;
  }
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

.files-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.files-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.file-card {
  position: relative;
  padding: 1.5rem;
  border: 1px solid $color-border-weak;
  border-radius: 8px;
  background-color: $color-background-default;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.file-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: rgba($warning, 0.1);
  border: 1px solid $warning;
  color: $warning;
  font-size: 0.875rem;
  font-weight: var(--font-weight-semibold);
}

.file-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid $color-border-weak;
}

.file-name {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
  word-break: break-word;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.detail-label {
  font-size: 0.875rem;
  color: $color-text-weak;
  font-weight: var(--font-weight-semibold);
}

.detail-value {
  font-size: 0.875rem;
  color: $color-text-strong;
  text-align: right;
}

.file-actions {
  display: flex;
  justify-content: center;
  padding-top: 0.75rem;
  border-top: 1px solid $color-border-weak;

  .download-link {
    text-decoration: none;
    width: 100%;

    :deep(.p-button) {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
