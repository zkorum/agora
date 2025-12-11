<template>
  <div class="drop-zone-wrapper">
    <div class="drop-zone-label">{{ label }}</div>
    <div
      ref="dropZoneRef"
      class="drop-zone"
      :class="{
        'drop-zone-active': isOverDropZone,
        'drop-zone-empty': file === null,
        'drop-zone-uploaded': file !== null && status === 'uploaded',
        'drop-zone-validating': file !== null && status === 'validating',
        'drop-zone-error': file !== null && status === 'error',
        'drop-zone-pending': file !== null && status === 'pending',
      }"
      @click="handleClick"
    >
      <!-- Empty state: show upload icon and text -->
      <template v-if="file === null">
        <div class="drop-zone-content">
          <ZKIcon
            name="lucide:upload"
            size="1.5rem"
            color="var(--primary-color)"
            class="upload-icon"
          />
          <p class="drop-zone-text">{{ dropText }}</p>
        </div>
      </template>

      <!-- File uploaded state: show status inline -->
      <template v-else>
        <div class="file-status-container">
          <!-- Top Row: Badge Only -->
          <div class="top-row">
            <div class="status-badge-container">
              <Badge
                v-if="status === 'pending'"
                :value="t('statusPending')"
                severity="secondary"
                size="large"
              />
              <Badge
                v-else-if="status === 'uploaded'"
                :value="t('statusUploaded')"
                severity="success"
                size="large"
              />
              <Badge
                v-else-if="status === 'validating'"
                :value="t('statusValidating')"
                severity="info"
                size="large"
              />
              <Badge
                v-else-if="status === 'error'"
                :value="t('statusError')"
                severity="danger"
                size="large"
              />
            </div>
          </div>

          <!-- File Info -->
          <div class="file-info">
            <div class="file-name">
              <code>{{ file.name }}</code>
            </div>

            <div class="file-status">
              <span v-if="status === 'uploaded'" class="file-size">
                {{ formatFileSize(file.size) }}
              </span>
              <span
                v-else-if="status === 'error' && error"
                class="error-detail"
              >
                {{ truncatedErrorMessage }}
              </span>
            </div>
          </div>

          <!-- View Details Button (Full Width, shown in error state) -->
          <PrimeButton
            v-if="status === 'error' && error"
            class="view-details-button"
            severity="danger"
            :aria-label="t('ariaViewDetails').replace('{fileName}', file.name)"
            @click.stop="showErrorDialog = true"
          >
            <ZKIcon
              name="lucide:alert-circle"
              size="1rem"
              color="currentColor"
              class="button-icon"
            />
            <span>{{ t("viewDetails") }}</span>
          </PrimeButton>

          <!-- Remove Button (Full Width at Bottom) -->
          <PrimeButton
            v-if="status === 'uploaded' || status === 'error'"
            class="remove-button"
            :aria-label="t('ariaRemove').replace('{fileName}', file.name)"
            @click.stop="handleRemove"
          >
            <span>{{ t("remove") }}</span>
          </PrimeButton>
        </div>
      </template>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".csv"
      class="hidden-file-input"
      @change="handleFileInputChange"
    />

    <!-- Error Details Dialog -->
    <CsvErrorDetailsDialog
      v-if="error"
      v-model="showErrorDialog"
      :error-message="error"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useDropZone } from "@vueuse/core";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import Badge from "primevue/badge";
import CsvErrorDetailsDialog from "./CsvErrorDetailsDialog.vue";
import type { FileStatus } from "./composables/useCsvFile";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  csvDropZoneTranslations,
  type CsvDropZoneTranslations,
} from "./CsvDropZone.i18n";

const ERROR_TRUNCATE_LENGTH = 100;

interface Props {
  label: string;
  fileTypeLabel: string;
  dropText: string;
  file: File | null;
  error: string;
  status: FileStatus;
}

interface Emits {
  (e: "upload", file: File): void;
  (e: "remove"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useComponentI18n<CsvDropZoneTranslations>(
  csvDropZoneTranslations
);

const dropZoneRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const showErrorDialog = ref(false);

// Setup drop zone with VueUse
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: handleDrop,
  dataTypes: ["text/csv"],
  multiple: false,
  preventDefaultForUnhandled: false,
});

// Computed: truncated error message
const truncatedErrorMessage = computed(() => {
  if (!props.error) return "";
  if (props.error.length <= ERROR_TRUNCATE_LENGTH) {
    return props.error;
  }
  return props.error.substring(0, ERROR_TRUNCATE_LENGTH) + "...";
});

/**
 * Handle file dropped into drop zone
 */
function handleDrop(files: File[] | null): void {
  if (!files || files.length === 0) return;
  emit("upload", files[0]);
}

/**
 * Handle click on drop zone
 * Opens file picker when in empty state OR allows file replacement
 */
function handleClick(): void {
  // Only open file picker in empty state
  // When file exists, user needs to click remove first
  if (props.file === null) {
    fileInputRef.value?.click();
  }
}

/**
 * Handle file selected via file input
 */
function handleFileInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (files && files.length > 0) {
    emit("upload", files[0]);
  }
  // Reset input so the same file can be selected again if needed
  input.value = "";
}

/**
 * Handle remove button click
 */
function handleRemove(): void {
  emit("remove");
}

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
</script>

<style scoped lang="scss">
.drop-zone-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drop-zone-label {
  font-size: 0.9rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 1.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;

  /* Empty State */
  &.drop-zone-empty {
    background-color: #f8f9fa;
    border: 2px dashed #d0d0d0;
    cursor: pointer;

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

  /* File States - all maintain border and background */
  &.drop-zone-pending {
    background-color: #f5f5f5;
    border: 2px solid #9e9e9e;
    cursor: default;
  }

  &.drop-zone-uploaded {
    background-color: #dcfce7;
    border: 2px solid #22c55e;
    cursor: default;

    &:hover {
      background-color: #bbf7d0;
    }

    &.drop-zone-active {
      border-color: #16a34a;
      background-color: #bbf7d0;
    }
  }

  &.drop-zone-validating {
    background-color: #e3f2fd;
    border: 2px solid #2196f3;
    cursor: default;
  }

  &.drop-zone-error {
    background-color: #ffebee;
    border: 2px solid #ef5350;
    cursor: default;

    &:hover {
      background-color: #ffcdd2;
    }

    &.drop-zone-active {
      border-color: #c62828;
      background-color: #ffcdd2;
    }
  }
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.drop-zone-text {
  font-size: 0.875rem;
  color: $color-text-weak;
  margin: 0;
  text-align: center;
}

/* File Status Container (when file is present) */
.file-status-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.status-badge-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  code {
    font-size: 0.875rem;
    font-family: monospace;
    font-weight: var(--font-weight-semibold);
    color: $color-text-strong;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
  }
}

.file-type {
  font-size: 0.75rem;
  color: $color-text-weak;
}

.file-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
}

.file-size {
  color: $color-text-weak;
}

.error-detail {
  font-size: 0.75rem;
  color: $color-text-weak;
  white-space: pre-wrap;
  word-break: break-word;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.error-details-button {
  flex-shrink: 0;
}

.remove-button {
  width: 100%;
  margin-top: 0.5rem;
}

.hidden-file-input {
  display: none;
}
</style>
