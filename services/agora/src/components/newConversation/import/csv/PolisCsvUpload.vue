<template>
  <div>
    <ZKCard padding="2rem" class="card-style">
      <div class="content-container">
        <!-- Header -->
        <div class="header">
          <i class="pi pi-file-import icon" />
          <div class="title">{{ t("uploadTitle") }}</div>
        </div>

        <!-- Description -->
        <div class="description">
          {{ t("description") }}
        </div>

        <!-- Three Drop Zones -->
        <div class="drop-zones-container">
          <CsvDropZone
            :label="t('summaryDropZoneLabel')"
            :drop-text="t('dropOrClickText')"
            :file="summaryFile.file.value"
            :error="summaryFile.error.value"
            :status="summaryFile.status.value"
            @upload="handleUpload($event, summaryFile, 'summary')"
            @remove="summaryFile.removeFile()"
          />

          <CsvDropZone
            :label="t('commentsDropZoneLabel')"
            :drop-text="t('dropOrClickText')"
            :file="commentsFile.file.value"
            :error="commentsFile.error.value"
            :status="commentsFile.status.value"
            @upload="handleUpload($event, commentsFile, 'comments')"
            @remove="commentsFile.removeFile()"
          />

          <CsvDropZone
            :label="t('votesDropZoneLabel')"
            :drop-text="t('dropOrClickText')"
            :file="votesFile.file.value"
            :error="votesFile.error.value"
            :status="votesFile.status.value"
            @upload="handleUpload($event, votesFile, 'votes')"
            @remove="votesFile.removeFile()"
          />
        </div>

        <!-- File Size Hint -->
        <div class="file-size-hint">
          {{ t("maxFileSize", { size: MAX_CSV_FILE_SIZE_MB }) }}
        </div>
      </div>
    </ZKCard>

    <!-- Login Dialog -->
    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="() => {}"
      active-intention="newConversation"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_CSV_FILE_SIZE_MB } from "src/shared-app-api/csvUpload";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useBackendPostApi } from "src/utils/api/post/post";
import { ref, watch } from "vue";

import { type CsvFileState, useCsvFile } from "./composables/useCsvFile";
import CsvDropZone from "./CsvDropZone.vue";
import {
  type PolisCsvUploadTranslations,
  polisCsvUploadTranslations,
} from "./PolisCsvUpload.i18n";

const { t } = useComponentI18n<PolisCsvUploadTranslations>(
  polisCsvUploadTranslations
);

const store = useNewPostDraftsStore();
const { validateCsvFiles } = useBackendPostApi();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

// Login dialog state
const showLoginDialog = ref(false);

// Create CSV file state using composable for each file type
const summaryFile = useCsvFile("summary");
const commentsFile = useCsvFile("comments");
const votesFile = useCsvFile("votes");

/**
 * Handle file upload for a specific drop zone
 */
async function handleUpload(
  file: File,
  csvFileState: CsvFileState,
  fileType: "summary" | "comments" | "votes"
): Promise<void> {
  // Check if user is logged in
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  // Try to upload the file (checks size)
  const success = csvFileState.uploadFile(file);

  if (!success) {
    csvFileState.error.value = t("errorFileTooLarge", {
      size: MAX_CSV_FILE_SIZE_MB,
    });
    return;
  }

  // Validate only this file
  await validateSingleFile(csvFileState, fileType);
}

/**
 * Validates a single uploaded CSV file via backend API
 */
async function validateSingleFile(
  csvFileState: CsvFileState,
  fileType: "summary" | "comments" | "votes"
): Promise<void> {
  if (!csvFileState.file.value) return;

  try {
    csvFileState.setValidating(true);

    // Send only this file to validation endpoint
    const response = await validateCsvFiles({
      summaryFile: fileType === "summary" ? csvFileState.file.value : null,
      commentsFile: fileType === "comments" ? csvFileState.file.value : null,
      votesFile: fileType === "votes" ? csvFileState.file.value : null,
    });

    // Extract the result for this specific file
    const result = response[`${fileType}File`];

    if (result) {
      // Check if validation was successful
      if (result.isValid) {
        csvFileState.setValidationResult(result);
      } else {
        // Validation failed - display the specific error message from backend
        csvFileState.error.value = result.error || t("unknownError");
      }
    } else {
      // No result returned for this file type
      csvFileState.error.value = t("noValidationResult");
    }
  } catch (error) {
    console.error(`CSV validation error for ${fileType}:`, error);
    // Network error or other exception - show in the specific drop zone
    csvFileState.error.value = t("serverError");
  } finally {
    csvFileState.setValidating(false);
  }
}

/**
 * Updates store with file metadata
 */
function updateStoreMetadata(): void {
  store.conversationDraft.importSettings.csvFileMetadata = {
    summary: summaryFile.file.value
      ? { name: summaryFile.file.value.name, size: summaryFile.file.value.size }
      : null,
    comments: commentsFile.file.value
      ? {
          name: commentsFile.file.value.name,
          size: commentsFile.file.value.size,
        }
      : null,
    votes: votesFile.file.value
      ? { name: votesFile.file.value.name, size: votesFile.file.value.size }
      : null,
  };
}

/**
 * Checks if all files are valid and uploaded
 */
function isValid(): boolean {
  if (
    !summaryFile.file.value ||
    !commentsFile.file.value ||
    !votesFile.file.value
  ) {
    // Parent component should handle "all files required" validation
    // by disabling submit button or showing error at form level
    return false;
  }

  return summaryFile.isValid() && commentsFile.isValid() && votesFile.isValid();
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
    summary: summaryFile.file.value,
    comments: commentsFile.file.value,
    votes: votesFile.file.value,
  };
}

/**
 * Resets all files and errors
 */
function reset(): void {
  summaryFile.removeFile();
  commentsFile.removeFile();
  votesFile.removeFile();
  updateStoreMetadata();
}

// Watch for file changes to update store metadata
watch([summaryFile.file, commentsFile.file, votesFile.file], () => {
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
.card-style {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.description {
  font-size: 0.95rem;
  color: $color-text-weak;
  line-height: 1.5;
}

.drop-zones-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-size-hint {
  font-size: 0.75rem;
  color: $color-text-weak;
  text-align: center;
}
</style>
