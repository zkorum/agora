<template>
  <div>
    <ZKCard :padding="'2rem'" class="card-style">
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
            :file-type-label="t('summaryFile')"
            :drop-text="t('dropOrClickText')"
            :file="summaryFile.file.value"
            :error="summaryFile.error.value"
            :status="summaryFile.status.value"
            @upload="handleUpload($event, summaryFile, 'summary')"
            @remove="summaryFile.removeFile()"
          />

          <CsvDropZone
            :label="t('commentsDropZoneLabel')"
            :file-type-label="t('commentsFile')"
            :drop-text="t('dropOrClickText')"
            :file="commentsFile.file.value"
            :error="commentsFile.error.value"
            :status="commentsFile.status.value"
            @upload="handleUpload($event, commentsFile, 'comments')"
            @remove="commentsFile.removeFile()"
          />

          <CsvDropZone
            :label="t('votesDropZoneLabel')"
            :file-type-label="t('votesFile')"
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
    </ZKCard>

    <!-- Login Dialog -->
    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="() => {}"
      :active-intention="'newConversation'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendPostApi } from "src/utils/api/post/post";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import CsvDropZone from "./CsvDropZone.vue";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import {
  polisCsvUploadTranslations,
  type PolisCsvUploadTranslations,
} from "./PolisCsvUpload.i18n";
import { MAX_CSV_FILE_SIZE_MB } from "src/shared-app-api/csvUpload";
import { useCsvFile, type CsvFileState } from "./composables/useCsvFile";

const { t } = useComponentI18n<PolisCsvUploadTranslations>(
  polisCsvUploadTranslations
);

const store = useNewPostDraftsStore();
const { validateCsvFiles } = useBackendPostApi();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

// Login dialog state
const showLoginDialog = ref(false);

// General error state
const generalError = ref<string>("");

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

  generalError.value = "";

  // Try to upload the file (checks size)
  const success = csvFileState.uploadFile(file);

  if (!success) {
    generalError.value = t("errorFileTooLarge", { size: MAX_CSV_FILE_SIZE_MB });
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
    generalError.value = "";

    // Send only this file to validation endpoint
    const response = await validateCsvFiles({
      summaryFile: fileType === "summary" ? csvFileState.file.value : null,
      commentsFile: fileType === "comments" ? csvFileState.file.value : null,
      votesFile: fileType === "votes" ? csvFileState.file.value : null,
    });

    // Update only this file's validation result
    const result = response[`${fileType}File`];
    if (result) {
      csvFileState.setValidationResult(result);
    }
  } catch (error) {
    console.error(`CSV validation error for ${fileType}:`, error);
    generalError.value = t("serverError");
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
  generalError.value = "";

  if (
    !summaryFile.file.value ||
    !commentsFile.file.value ||
    !votesFile.file.value
  ) {
    generalError.value = t("errorAllFilesRequired");
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
  generalError.value = "";
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

.general-error {
  margin-top: 0.5rem;
}
</style>
