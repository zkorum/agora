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

        <!-- File Names List -->
        <div class="file-names-list">
          <ul>
            <li>summary.csv</li>
            <li>comments.csv</li>
            <li>votes.csv</li>
          </ul>
        </div>

        <!-- Drop Zone Section -->
        <div
          ref="dropZoneRef"
          class="drop-zone"
          :class="{ 'drop-zone-active': isOverDropZone }"
          @click="handleDropZoneClick"
        >
          <svg
            class="upload-icon"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 5v9m-5 0H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2M8 9l4-5 4 5m1 8h.01"
            />
          </svg>

          <p class="drop-zone-main-text">{{ t("dropZoneMainText") }}</p>
          <p class="drop-zone-sub-text">{{ t("dropZoneSubText") }}</p>
          <p class="file-size-hint">
            {{ t("maxFileSize", { size: MAX_CSV_FILE_SIZE_MB }) }}
          </p>

          <!-- Browse Files Button -->
          <PrimeButton
            type="button"
            :label="t('browseFilesButton')"
            icon="pi pi-folder-open"
            class="browse-button"
            @click.stop="handleBrowseClick"
          />
        </div>

        <!-- Hidden File Input -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv"
          multiple
          class="hidden-file-input"
          @change="handleFileInputChange"
        />

        <!-- Files Status Section -->
        <div class="files-status-section">
          <h3 class="files-status-title">{{ t("filesStatusTitle") }}</h3>
          <div class="files-status-list">
            <CsvFileStatusItem
              v-for="config in fileConfigs"
              :key="config.type"
              :file-name="config.expectedFileName"
              :label="config.label"
              :status="getFileStatus(config)"
              :file="config.file.value"
              :error-message="config.error.value"
              @remove="handleFileRemove(config.type)"
            />
          </div>
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
import { ref, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useDropZone } from "@vueuse/core";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendPostApi } from "src/utils/api/post/post";
import type { ValidateCsvResponse } from "src/shared/types/dto";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import CsvFileStatusItem from "./CsvFileStatusItem.vue";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import {
  polisCsvUploadTranslations,
  type PolisCsvUploadTranslations,
} from "./PolisCsvUpload.i18n";
import {
  MAX_CSV_FILE_SIZE,
  MAX_CSV_FILE_SIZE_MB,
} from "src/shared-app-api/csvUpload";

const { t } = useComponentI18n<PolisCsvUploadTranslations>(
  polisCsvUploadTranslations
);

const store = useNewPostDraftsStore();
const { validateCsvFiles } = useBackendPostApi();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

// Define file types
type FileType = "summary" | "comments" | "votes";
type FileStatus = "pending" | "uploaded" | "validating" | "error";

// Login dialog state
const showLoginDialog = ref(false);

// Drop zone setup
const dropZoneRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: handleDrop,
  dataTypes: ["text/csv"],
  multiple: true,
  preventDefaultForUnhandled: false,
});

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
 * Determines the status of a file configuration
 */
function getFileStatus(config: (typeof fileConfigs.value)[0]): FileStatus {
  if (config.error.value) return "error";
  if (config.file.value && isValidating.value) return "validating";
  if (config.file.value) return "uploaded";
  return "pending";
}

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
 * Handles files dropped into the drop zone
 */
function handleDrop(files: File[] | null): void {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }
  if (!files || files.length === 0) return;
  processFiles(files);
}

/**
 * Handles click on the drop zone (not on the button)
 */
function handleDropZoneClick(): void {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }
  fileInputRef.value?.click();
}

/**
 * Handles click on the browse button
 */
function handleBrowseClick(): void {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }
  fileInputRef.value?.click();
}

/**
 * Handles file input change event
 */
function handleFileInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (files && files.length > 0) {
    processFiles(Array.from(files));
  }
  // Reset input so the same file can be selected again if needed
  input.value = "";
}

/**
 * Processes uploaded or dropped files
 */
function processFiles(files: File[]): void {
  generalError.value = "";
  const invalidFiles: string[] = [];
  const fileSizeErrors: string[] = [];

  files.forEach((file) => {
    // Validate file size
    if (file.size > MAX_CSV_FILE_SIZE) {
      fileSizeErrors.push(file.name);
      return;
    }

    // Auto-match files to correct fields based on exact filename
    switch (file.name) {
      case "summary.csv":
        summaryFile.value = file;
        summaryError.value = "";
        break;
      case "comments.csv":
        commentsFile.value = file;
        commentsError.value = "";
        break;
      case "votes.csv":
        votesFile.value = file;
        votesError.value = "";
        break;
      default:
        invalidFiles.push(file.name);
    }
  });

  // Display appropriate error messages
  if (fileSizeErrors.length > 0) {
    generalError.value = t("errorFileTooLarge", { size: MAX_CSV_FILE_SIZE_MB });
  } else if (invalidFiles.length > 0) {
    generalError.value = t("errorInvalidDroppedFiles");
  }
}

/**
 * Handles file removal
 */
function handleFileRemove(fileType: FileType): void {
  const config = fileConfigs.value.find((c) => c.type === fileType);
  if (config) {
    config.file.value = null;
    config.error.value = "";
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

.file-names-list {
  ul {
    list-style: disc;
    margin: 0;
    padding-left: 1.5rem;
  }

  li {
    font-size: 0.9rem;
    color: $color-text-strong;
    font-family: monospace;
    margin-bottom: 0.25rem;
  }
}

/* Drop Zone Styling */
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background-color: #f8f9fa;
  border: 2px dashed #d0d0d0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: $primary;
    background-color: rgba($primary, 0.02);
  }

  &.drop-zone-active {
    border-color: $primary;
    border-style: solid;
    background-color: rgba($primary, 0.05);
  }
}

.upload-icon {
  width: 3rem;
  height: 3rem;
  color: $primary;
  margin-bottom: 1rem;
}

.drop-zone-main-text {
  font-size: 0.875rem;
  color: $color-text-weak;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.drop-zone-sub-text {
  font-size: 0.75rem;
  color: $color-text-weak;
  margin: 0 0 1rem 0;
  text-align: center;
}

.file-size-hint {
  font-size: 0.75rem;
  color: $color-text-weak;
  margin: 0 0 1.5rem 0;
  text-align: center;

  span {
    font-weight: var(--font-weight-semibold);
  }
}

.browse-button {
  pointer-events: auto;
}

.hidden-file-input {
  display: none;
}

/* Files Status Section */
.files-status-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.files-status-title {
  font-size: 0.95rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
  margin: 0;
}

.files-status-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.general-error {
  margin-top: 0.5rem;
}
</style>
