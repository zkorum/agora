<template>
  <div class="import-status-view">
    <AsyncStateHandler
      :query="importStatusQuery"
      :config="{
        loading: { text: t('loadingStatus') },
        error: { title: t('errorLoadingStatus') },
      }"
    >
      <div v-if="statusData" class="status-content">
        <!-- Import Info Card -->
        <div class="import-info-card">
          <dl class="import-info-grid">
            <div class="import-info-item">
              <dt class="import-info-label">{{ t("importId") }}:</dt>
              <dd class="import-info-value">{{ importSlugId }}</dd>
            </div>
            <div class="import-info-item">
              <dt class="import-info-label">{{ t("status") }}:</dt>
              <dd class="import-info-value">
                {{ t(`status_${statusData.status}`) }}
              </dd>
            </div>
            <div class="import-info-item">
              <dt class="import-info-label">{{ t("createdAt") }}:</dt>
              <dd class="import-info-value">
                {{ formatDateTime(statusData.createdAt) }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Status Message -->
        <div class="status-message">
          <div
            v-if="statusData.status === 'processing'"
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
            v-else-if="statusData.status === 'completed'"
            class="completed-message"
            role="status"
            aria-live="polite"
          >
            <q-icon
              name="check_circle"
              color="positive"
              size="md"
              aria-hidden="true"
            />
            <p>{{ t("completedMessage") }}</p>
            <PrimeButton
              v-if="statusData.conversationSlugId"
              :label="t('viewConversation')"
              icon="pi pi-arrow-right"
              class="view-conversation-button"
              @click="handleViewConversation"
            />
          </div>
          <div
            v-else-if="statusData.status === 'failed'"
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
            <p v-if="statusData.failureReason" class="error-details">
              {{ getFailureReasonText(statusData.failureReason) }}
            </p>
          </div>
        </div>
      </div>
    </AsyncStateHandler>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ImportFailureReason } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useImportStatusQuery } from "src/utils/api/conversationImport/useConversationImportQueries";
import { formatDateTime } from "src/utils/format";
import { computed } from "vue";
import { useRouter } from "vue-router";

import {
  type ImportStatusViewTranslations,
  importStatusViewTranslations,
} from "./ImportStatusView.i18n";

interface Props {
  importSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ImportStatusViewTranslations>(
  importStatusViewTranslations
);

const authStore = useAuthenticationStore();
const { isGuestOrLoggedIn } = storeToRefs(authStore);

const router = useRouter();

const importStatusQuery = useImportStatusQuery({
  importSlugId: props.importSlugId,
  enabled: computed(() => isGuestOrLoggedIn.value),
});

// Type-safe accessor for import status data
// AsyncStateHandler guarantees data exists when content slot is rendered
const statusData = computed(() => importStatusQuery.data.value);

function handleViewConversation(): void {
  const data = importStatusQuery.data.value;
  if (!data || data.status !== "completed") return;

  void router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: data.conversationSlugId },
  });
}

function getFailureReasonText(reason: ImportFailureReason): string {
  switch (reason) {
    case "processing_error":
    case "server_restart":
      // Show server_restart as generic processing error (not helpful to show internal details)
      return t("failureReasonProcessingError");
    case "timeout":
      return t("failureReasonTimeout");
    case "invalid_data_format":
      return t("failureReasonInvalidDataFormat");
  }
}
</script>

<style scoped lang="scss">
.import-status-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.import-info-card {
  padding: 1.5rem;
  border: 1px solid $color-border-weak;
  border-radius: 8px;
  background-color: $color-background-default;
}

.import-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.import-info-item {
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

.import-info-label {
  font-size: 0.9rem;
  color: $color-text-weak;
  font-weight: var(--font-weight-semibold);
}

.import-info-value {
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

  .processing-message,
  .completed-message,
  .failed-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    max-width: 600px;

    .q-icon {
      flex-shrink: 0;
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
      text-align: left;
    }

    .view-conversation-button {
      margin-top: 1rem;
    }
  }
}
</style>
