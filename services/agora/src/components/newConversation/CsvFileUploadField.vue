<template>
  <div class="csv-file-upload-field">
    <div class="file-label">
      {{ label }} <span class="required-indicator">*</span>
    </div>
    <PrimeFileUpload
      mode="basic"
      :accept="'.csv'"
      :max-file-size="maxFileSize"
      :auto="true"
      :custom-upload="true"
      @select="handleFileSelect"
    >
      <template #empty>
        <div class="upload-prompt">
          <i class="pi pi-cloud-upload upload-icon" />
          <p class="upload-text">{{ uploadPromptText }}</p>
          <p class="file-name-hint">{{ expectedFileName }}</p>
        </div>
      </template>
    </PrimeFileUpload>

    <!-- File Info Display -->
    <div v-if="selectedFile" class="selected-file-info">
      <div class="file-details">
        <i class="pi pi-file file-icon" />
        <div class="file-info-text">
          <div class="file-name">{{ selectedFile.name }}</div>
          <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
        </div>
      </div>
      <PrimeButton
        icon="pi pi-times"
        severity="danger"
        text
        rounded
        @click="removeFile"
      />
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">
      <i class="pi pi-exclamation-circle" />
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    label: string;
    expectedFileName: string;
    uploadPromptText: string;
    maxFileSize: number;
    modelValue: File | null;
    errorInvalidFileName: string;
    errorFileTooLarge: string;
    customError?: string;
  }>(),
  {
    customError: "",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: File | null];
  error: [value: string];
}>();

const selectedFile = ref<File | null>(props.modelValue);
const errorMessage = ref<string>("");

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    selectedFile.value = newValue;
    if (!newValue) {
      errorMessage.value = "";
    }
  }
);

// Watch for custom errors from parent
watch(
  () => props.customError,
  (newError) => {
    if (newError) {
      errorMessage.value = newError;
    }
  }
);

function handleFileSelect(event: { files: File[] }): void {
  errorMessage.value = "";

  const file = event.files[0];
  if (!file) return;

  // Validate file name
  if (file.name !== props.expectedFileName) {
    errorMessage.value = props.errorInvalidFileName.replace(
      "{fileName}",
      props.expectedFileName
    );
    emit("error", errorMessage.value);
    return;
  }

  // Validate file size
  if (file.size > props.maxFileSize) {
    errorMessage.value = props.errorFileTooLarge;
    emit("error", errorMessage.value);
    return;
  }

  selectedFile.value = file;
  emit("update:modelValue", file);
}

function removeFile(): void {
  selectedFile.value = null;
  errorMessage.value = "";
  emit("update:modelValue", null);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
</script>

<style scoped lang="scss">
.csv-file-upload-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-label {
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-strong;
}

.required-indicator {
  color: $negative;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  text-align: center;
}

.upload-icon {
  font-size: 2rem;
  color: $primary;
  margin-bottom: 0.5rem;
}

.upload-text {
  font-size: 0.9rem;
  color: $color-text-weak;
  margin: 0 0 0.25rem 0;
}

.file-name-hint {
  font-size: 0.75rem;
  color: $color-text-weak;
  font-family: monospace;
  background-color: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin: 0.5rem 0 0 0;
}

.selected-file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.file-icon {
  font-size: 1.5rem;
  color: $primary;
}

.file-info-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-strong;
}

.file-size {
  font-size: 0.75rem;
  color: $color-text-weak;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #ffebee;
  border: 1px solid #ef5350;
  border-radius: 4px;
  color: #c62828;
  font-size: 0.85rem;

  i {
    font-size: 1rem;
  }
}
</style>
