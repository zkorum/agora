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
        <!-- Export Info Card -->
        <div class="export-info-card">
          <dl class="export-info-grid">
            <div class="export-info-item">
              <dt class="export-info-label">{{ t("exportId") }}:</dt>
              <dd class="export-info-value">
                {{ exportStatusQuery.data.value.exportSlugId }}
              </dd>
            </div>
            <div class="export-info-item">
              <dt class="export-info-label">{{ t("status") }}:</dt>
              <dd class="export-info-value">
                {{ t(`status_${exportStatusQuery.data.value.status}`) }}
              </dd>
            </div>
            <div class="export-info-item">
              <dt class="export-info-label">{{ t("createdAt") }}:</dt>
              <dd class="export-info-value">
                {{ formatDateTime(exportStatusQuery.data.value.createdAt) }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Status Message -->
        <div
          v-if="
            exportStatusQuery.data.value.status === 'processing' ||
            exportStatusQuery.data.value.status === 'failed' ||
            exportStatusQuery.data.value.status === 'cancelled' ||
            exportStatusQuery.data.value.status === 'expired'
          "
          class="status-message"
        >
          <div
            v-if="exportStatusQuery.data.value.status === 'processing'"
            class="processing-message"
            role="status"
            aria-live="polite"
          >
            <q-spinner
              color="primary"
              size="md"
              :aria-label="t('processingMessage')"
            />
            <p>{{ t("processingMessage") }}</p>
          </div>
          <div
            v-else-if="exportStatusQuery.data.value.status === 'failed'"
            class="failed-message"
            role="alert"
            aria-live="assertive"
          >
            <q-icon
              name="error"
              color="negative"
              size="md"
              aria-hidden="true"
            />
            <p>{{ t("failedMessage") }}</p>
            <p
              v-if="exportStatusQuery.data.value.errorMessage"
              class="error-details"
            >
              {{ exportStatusQuery.data.value.errorMessage }}
            </p>
          </div>
          <div
            v-else-if="exportStatusQuery.data.value.status === 'cancelled'"
            class="cancelled-message"
            role="alert"
            aria-live="assertive"
          >
            <q-icon
              name="cancel"
              color="warning"
              size="md"
              aria-hidden="true"
            />
            <p>{{ t("cancelledMessage") }}</p>
            <p
              v-if="exportStatusQuery.data.value.cancellationReason"
              class="cancellation-details"
            >
              {{ exportStatusQuery.data.value.cancellationReason }}
            </p>
          </div>
          <div
            v-else-if="exportStatusQuery.data.value.status === 'expired'"
            class="expired-message"
            role="alert"
            aria-live="assertive"
          >
            <q-icon name="schedule" color="grey" size="md" aria-hidden="true" />
            <p>{{ t("expiredMessage") }}</p>
            <p class="expired-details">
              {{ t("expiredDeletedOn") }}:
              {{ formatDateTime(exportStatusQuery.data.value.deletedAt) }}
            </p>
            <p
              v-if="exportStatusQuery.data.value.errorMessage"
              class="error-details"
            >
              {{ t("originalError") }}:
              {{ exportStatusQuery.data.value.errorMessage }}
            </p>
            <p
              v-if="exportStatusQuery.data.value.cancellationReason"
              class="cancellation-details"
            >
              {{ t("originalCancellation") }}:
              {{ exportStatusQuery.data.value.cancellationReason }}
            </p>
            <PrimeButton
              :label="t('requestNewExport')"
              icon="pi pi-download"
              class="request-new-export-button"
              @click="handleRequestNewExport"
            />
          </div>
        </div>

        <!-- Delete Button (Moderator Only) -->
        <div
          v-if="
            isModerator && exportStatusQuery.data.value.status !== 'expired'
          "
          class="delete-section"
        >
          <PrimeButton
            :label="t('deleteExport')"
            icon="pi pi-trash"
            severity="danger"
            :loading="deleteExportMutation.isPending.value"
            :disabled="deleteExportMutation.isPending.value"
            :aria-label="t('deleteExport')"
            @click="handleDeleteExport"
          />
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
          <h2 class="section-title">{{ t("availableFiles") }}</h2>
          <div class="files-list">
            <div
              v-for="file in exportStatusQuery.data.value.files"
              :key="file.fileType"
              class="file-card"
            >
              <div class="file-header">
                <q-icon
                  name="description"
                  size="md"
                  color="primary"
                  aria-hidden="true"
                />
                <span class="file-name">{{ file.fileName }}</span>
              </div>

              <dl class="file-details">
                <div class="file-detail-item">
                  <dt class="detail-label">{{ t("fileSize") }}:</dt>
                  <dd class="detail-value">
                    {{ formatFileSize(file.fileSize) }}
                  </dd>
                </div>
                <div class="file-detail-item">
                  <dt class="detail-label">{{ t("recordCount") }}:</dt>
                  <dd class="detail-value">{{ file.recordCount }}</dd>
                </div>
              </dl>

              <div class="file-actions">
                <PrimeButton
                  :label="
                    isUrlExpired(file.urlExpiresAt)
                      ? t('downloadExpired')
                      : t('download')
                  "
                  icon="pi pi-download"
                  :disabled="isUrlExpired(file.urlExpiresAt)"
                  :aria-label="`${t('download')} ${file.fileName}`"
                  @click="handleDownload(file.downloadUrl)"
                />
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
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import {
  useExportStatusQuery,
  useDeleteExportMutation,
} from "src/utils/api/conversationExport/useConversationExportQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportStatusViewTranslations,
  type ExportStatusViewTranslations,
} from "./ExportStatusView.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useNotify } from "src/utils/ui/notify";
import { formatDateTime, formatFileSize, isUrlExpired } from "src/utils/format";

interface Props {
  exportSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ExportStatusViewTranslations>(
  exportStatusViewTranslations
);

const authStore = useAuthenticationStore();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(authStore);

const userStore = useUserStore();
const { profileData } = storeToRefs(userStore);

const $q = useQuasar();
const router = useRouter();
const { showNotifyMessage } = useNotify();

const exportStatusQuery = useExportStatusQuery({
  exportSlugId: props.exportSlugId,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

const deleteExportMutation = useDeleteExportMutation();

const isModerator = computed(() => profileData.value.isModerator);

function handleDeleteExport(): void {
  const exportData = exportStatusQuery.data.value;
  if (!exportData) return;

  $q.dialog({
    title: t("deleteConfirmTitle"),
    message: t("deleteConfirmMessage"),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    deleteExportMutation.mutate(
      {
        exportSlugId: props.exportSlugId,
        conversationSlugId: exportData.conversationSlugId,
      },
      {
        onSuccess: () => {
          showNotifyMessage(t("deleteSuccess"));
          void router.push({
            name: "/conversation/[conversationSlugId]/export",
            params: {
              conversationSlugId: exportData.conversationSlugId,
            },
          });
        },
        onError: (error) => {
          console.error("Failed to delete export:", error);
          showNotifyMessage(t("deleteError"));
        },
      }
    );
  });
}

function handleDownload(downloadUrl: string): void {
  window.open(downloadUrl, "_blank", "noopener,noreferrer");
}

function handleRequestNewExport(): void {
  const exportData = exportStatusQuery.data.value;
  if (!exportData) return;

  void router.push({
    name: "/conversation/[conversationSlugId]/export",
    params: {
      conversationSlugId: exportData.conversationSlugId,
    },
  });
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

.export-info-card {
  padding: 1.5rem;
  border: 1px solid $color-border-weak;
  border-radius: 8px;
  background-color: $color-background-default;
}

.export-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.export-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  dt {
    margin: 0;
  }

  dd {
    margin: 0;
  }
}

.export-info-label {
  font-size: 0.9rem;
  color: $color-text-weak;
  font-weight: var(--font-weight-semibold);
}

.export-info-value {
  font-size: 1rem;
  color: $color-text-strong;
  word-break: break-word;
}

.status-message {
  display: flex;
  justify-content: center;
  padding: 2rem;
  border-radius: 8px;
  background-color: $app-background-color;

  .processing-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .failed-message,
  .cancelled-message,
  .expired-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: left;
    max-width: 600px;

    .q-icon {
      flex-shrink: 0;
      margin-top: 0.25rem;
    }
  }

  p {
    margin: 0;
    font-size: 1.1rem;
    color: $color-text-strong;
  }

  .error-details {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: $negative;
  }

  .cancellation-details {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: $warning;
  }

  .expired-details {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: $color-text-weak;
  }

  .request-new-export-button {
    margin-top: 1.5rem;
  }
}

.delete-section {
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  border: 1px solid $color-border-weak;
  border-radius: 8px;
  background-color: $color-background-default;
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

  dt {
    margin: 0;
  }

  dd {
    margin: 0;
  }
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

  :deep(.p-button) {
    width: 100%;
    justify-content: center;

    @media (min-width: 768px) {
      width: auto;
      min-width: 200px;
    }
  }
}
</style>
