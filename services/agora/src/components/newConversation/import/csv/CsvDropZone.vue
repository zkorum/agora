<template>
  <div class="drop-zone-wrapper">
    <div class="drop-zone-label">{{ label }}</div>
    <div
      ref="dropZoneRef"
      class="drop-zone"
      :class="{
        'drop-zone-active': isOverDropZone,
        'drop-zone-has-file': file !== null,
        'drop-zone-error': error !== '',
      }"
      @click="handleClick"
    >
      <!-- Empty state: show upload icon and text -->
      <div v-if="file === null" class="drop-zone-content">
        <i class="pi pi-upload upload-icon" />
        <p class="drop-zone-text">{{ dropText }}</p>
      </div>

      <!-- File uploaded state: show status item -->
      <CsvFileStatusItem
        v-else
        :file-name="file.name"
        :label="fileTypeLabel"
        :status="status"
        :file="file"
        :error-message="error"
        @remove="$emit('remove')"
      />
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".csv"
      class="hidden-file-input"
      @change="handleFileInputChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useDropZone } from "@vueuse/core";
import CsvFileStatusItem from "./CsvFileStatusItem.vue";
import type { FileStatus } from "./composables/useCsvFile";

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

const dropZoneRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();

// Setup drop zone with VueUse
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: handleDrop,
  dataTypes: ["text/csv"],
  multiple: false,
  preventDefaultForUnhandled: false,
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
 * Only opens file picker when no file is present (empty state)
 */
function handleClick(): void {
  // Don't open file picker if a file is already uploaded
  // (prevents opening picker when clicking remove button)
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

  &.drop-zone-has-file {
    background-color: transparent;
    border: none;
    padding: 0 1.5rem;
    cursor: default;

    &:hover {
      background-color: transparent;
      border: none;
    }
  }

  &.drop-zone-error {
    background-color: transparent;
    border: none;
    padding: 0 1.5rem;
    cursor: default;

    &:hover {
      background-color: transparent;
      border: none;
    }
  }
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.upload-icon {
  font-size: 1.5rem;
  color: $primary;
}

.drop-zone-text {
  font-size: 0.875rem;
  color: $color-text-weak;
  margin: 0;
  text-align: center;
}

.hidden-file-input {
  display: none;
}
</style>
