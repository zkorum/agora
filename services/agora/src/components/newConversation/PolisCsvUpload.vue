<template>
  <div>
    <ZKCard :padding="'2rem'" class="cardStyle">
      <div class="content-container">
        <div class="header">
          <i class="pi pi-file-import icon" />
          <div class="title">{{ t("uploadTitle") }}</div>
        </div>

        <div class="upload-container">
          <div class="description">
            {{ t("description") }}
          </div>

          <div class="required-files-info">
            <p class="required-files-title">{{ t("requiredFiles") }}</p>
            <ul class="required-files-list">
              <li><code>summary.csv</code></li>
              <li><code>comments.csv</code></li>
              <li><code>votes.csv</code></li>
            </ul>
            <p class="file-size-hint">{{ t("maxFileSize") }}</p>
          </div>

          <!-- Summary File Upload -->
          <CsvFileUploadField
            v-model="summaryFile"
            :label="t('summaryFile')"
            expected-file-name="summary.csv"
            :upload-prompt-text="t('fileUploadLabel')"
            :max-file-size="MAX_CSV_FILE_SIZE"
            :error-invalid-file-name="t('errorInvalidFileName')"
            :error-file-too-large="t('errorFileTooLarge')"
            @error="handleSummaryError"
          />

          <!-- Comments File Upload -->
          <CsvFileUploadField
            v-model="commentsFile"
            :label="t('commentsFile')"
            expected-file-name="comments.csv"
            :upload-prompt-text="t('fileUploadLabel')"
            :max-file-size="MAX_CSV_FILE_SIZE"
            :error-invalid-file-name="t('errorInvalidFileName')"
            :error-file-too-large="t('errorFileTooLarge')"
            @error="handleCommentsError"
          />

          <!-- Votes File Upload -->
          <CsvFileUploadField
            v-model="votesFile"
            :label="t('votesFile')"
            expected-file-name="votes.csv"
            :upload-prompt-text="t('fileUploadLabel')"
            :max-file-size="MAX_CSV_FILE_SIZE"
            :error-invalid-file-name="t('errorInvalidFileName')"
            :error-file-too-large="t('errorFileTooLarge')"
            @error="handleVotesError"
          />

          <!-- General Error Message -->
          <div v-if="generalError" class="general-error">
            <q-banner class="bg-negative text-white" rounded>
              <template #avatar>
                <q-icon name="mdi-alert-circle" />
              </template>
              {{ generalError }}
            </q-banner>
          </div>
        </div>
      </div>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKCard from "../ui-library/ZKCard.vue";
import CsvFileUploadField from "./CsvFileUploadField.vue";
import {
  polisCsvUploadTranslations,
  type PolisCsvUploadTranslations,
} from "./PolisCsvUpload.i18n";
import { MAX_CSV_FILE_SIZE } from "src/shared-app-api/csvUpload";

const { t } = useComponentI18n<PolisCsvUploadTranslations>(
  polisCsvUploadTranslations
);

const store = useNewPostDraftsStore();

// File state (stored in memory, not in the store)
const summaryFile = ref<File | null>(null);
const commentsFile = ref<File | null>(null);
const votesFile = ref<File | null>(null);

// Error state
const summaryError = ref<string>("");
const commentsError = ref<string>("");
const votesError = ref<string>("");
const generalError = ref<string>("");

/**
 * Updates store with file metadata
 */
function updateStoreMetadata(): void {
  store.conversationDraft.importSettings.csvFileMetadata = {
    summary: summaryFile.value
      ? { name: summaryFile.value.name, size: summaryFile.value.size }
      : null,
    comments: commentsFile.value
      ? { name: commentsFile.value.name, size: commentsFile.value.size }
      : null,
    votes: votesFile.value
      ? { name: votesFile.value.name, size: votesFile.value.size }
      : null,
  };
}

/**
 * Handle summary file error
 */
function handleSummaryError(error: string): void {
  summaryError.value = error;
  generalError.value = "";
}

/**
 * Handle comments file error
 */
function handleCommentsError(error: string): void {
  commentsError.value = error;
  generalError.value = "";
}

/**
 * Handle votes file error
 */
function handleVotesError(error: string): void {
  votesError.value = error;
  generalError.value = "";
}

/**
 * Checks if all files are valid and uploaded
 */
function isValid(): boolean {
  generalError.value = "";

  if (!summaryFile.value || !commentsFile.value || !votesFile.value) {
    generalError.value = t("errorAllFilesRequired");
    return false;
  }

  // Check for individual errors
  if (summaryError.value || commentsError.value || votesError.value) {
    return false;
  }

  return true;
}

/**
 * Returns the current files
 */
function getFiles(): {
  summary: File | null;
  comments: File | null;
  votes: File | null;
} {
  return {
    summary: summaryFile.value,
    comments: commentsFile.value,
    votes: votesFile.value,
  };
}

/**
 * Resets all files and errors
 */
function reset(): void {
  summaryFile.value = null;
  commentsFile.value = null;
  votesFile.value = null;
  summaryError.value = "";
  commentsError.value = "";
  votesError.value = "";
  generalError.value = "";
  updateStoreMetadata();
}

// Watch for file changes and update store metadata
watch([summaryFile, commentsFile, votesFile], () => {
  updateStoreMetadata();
});

// Expose methods to parent
defineExpose({
  isValid,
  getFiles,
  reset,
});
</script>

<style scoped lang="scss">
.cardStyle {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 1rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 1.5rem;
  color: $primary;
}

.title {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.upload-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.description {
  font-size: 0.95rem;
  color: $color-text-weak;
}

.required-files-info {
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid $primary;
}

.required-files-title {
  font-size: 0.85rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
  margin: 0 0 0.5rem 0;
}

.required-files-list {
  margin: 0 0 0.5rem 0;
  padding-left: 1rem;

  li {
    font-size: 0.8rem;
    color: $color-text-weak;
    margin-bottom: 0.25rem;

    &:last-child {
      margin-bottom: 0;
    }

    code {
      background-color: #e9ecef;
      padding: 0.125rem 0.25rem;
      border-radius: 3px;
      font-size: 0.75rem;
      color: #495057;
    }
  }
}

.file-size-hint {
  font-size: 0.75rem;
  color: $color-text-weak;
  margin: 0;
}

.general-error {
  margin-top: 0.5rem;
}
</style>
