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

          <!-- File Upload Fields -->
          <CsvFileUploadField
            v-for="config in fileConfigs"
            :key="config.type"
            v-model="config.file.value"
            :label="config.label"
            :expected-file-name="config.expectedFileName"
            :upload-prompt-text="t('fileUploadLabel')"
            :max-file-size="MAX_CSV_FILE_SIZE"
            :error-invalid-file-name="t('errorInvalidFileName')"
            :error-file-too-large="t('errorFileTooLarge')"
            :custom-error="config.error.value"
            @error="(error) => handleFileError(config.type, error)"
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
import { ref, watch, computed } from "vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useBackendPostApi } from "src/utils/api/post";
import type { ValidateCsvResponse } from "src/shared/types/dto";
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
const { validateCsvFiles } = useBackendPostApi();

// Define file types
type FileType = "summary" | "comments" | "votes";

// File state (stored in memory, not in the store)
const summaryFile = ref<File | null>(null);
const commentsFile = ref<File | null>(null);
const votesFile = ref<File | null>(null);

// Error state
const summaryError = ref<string>("");
const commentsError = ref<string>("");
const votesError = ref<string>("");
const generalError = ref<string>("");

// Validation state
const isValidating = ref<boolean>(false);
const summaryValidation = ref<ValidateCsvResponse["summaryFile"]>(undefined);
const commentsValidation = ref<ValidateCsvResponse["commentsFile"]>(undefined);
const votesValidation = ref<ValidateCsvResponse["votesFile"]>(undefined);

// Configuration array for v-for - maps types to their refs
const fileConfigs = computed(() => [
  {
    type: "summary" as FileType,
    expectedFileName: "summary.csv",
    label: t("summaryFile"),
    file: summaryFile,
    error: summaryError,
    validation: summaryValidation,
  },
  {
    type: "comments" as FileType,
    expectedFileName: "comments.csv",
    label: t("commentsFile"),
    file: commentsFile,
    error: commentsError,
    validation: commentsValidation,
  },
  {
    type: "votes" as FileType,
    expectedFileName: "votes.csv",
    label: t("votesFile"),
    file: votesFile,
    error: votesError,
    validation: votesValidation,
  },
]);

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
 * Generic error handler for all file types
 */
function handleFileError(fileType: FileType, error: string): void {
  const config = fileConfigs.value.find((c) => c.type === fileType);
  if (config) {
    config.error.value = error;
  }
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

  // Check if currently validating
  if (isValidating.value) {
    return false;
  }

  // Check validation results - all must be valid
  const summaryValid = summaryValidation.value?.isValid ?? false;
  const commentsValid = commentsValidation.value?.isValid ?? false;
  const votesValid = votesValidation.value?.isValid ?? false;

  if (!summaryValid || !commentsValid || !votesValid) {
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
  summaryValidation.value = undefined;
  commentsValidation.value = undefined;
  votesValidation.value = undefined;
  updateStoreMetadata();
}

/**
 * Validates uploaded CSV files
 */
async function validateFiles(): Promise<void> {
  // Only validate if all files are present
  if (!summaryFile.value && !commentsFile.value && !votesFile.value) {
    return;
  }

  try {
    isValidating.value = true;
    generalError.value = "";

    const response = await validateCsvFiles({
      summaryFile: summaryFile.value,
      commentsFile: commentsFile.value,
      votesFile: votesFile.value,
    });

    // Store validation results
    summaryValidation.value = response.summaryFile;
    commentsValidation.value = response.commentsFile;
    votesValidation.value = response.votesFile;

    // Set errors for invalid files
    if (response.summaryFile && !response.summaryFile.isValid) {
      summaryError.value = response.summaryFile.error || t("validationFailed");
    } else {
      summaryError.value = "";
    }

    if (response.commentsFile && !response.commentsFile.isValid) {
      commentsError.value =
        response.commentsFile.error || t("validationFailed");
    } else {
      commentsError.value = "";
    }

    if (response.votesFile && !response.votesFile.isValid) {
      votesError.value = response.votesFile.error || t("validationFailed");
    } else {
      votesError.value = "";
    }
  } catch (error) {
    console.error("CSV validation error:", error);
    generalError.value = t("serverError");
  } finally {
    isValidating.value = false;
  }
}

// Watch for file changes and trigger validation
watch([summaryFile, commentsFile, votesFile], () => {
  updateStoreMetadata();
  void validateFiles();
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
