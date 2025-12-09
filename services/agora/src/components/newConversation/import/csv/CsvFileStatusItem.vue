<template>
  <div class="csv-file-status-item" :class="statusClass">
    <div class="status-icon-container">
      <ZKIcon
        v-if="status === 'pending'"
        name="lucide:clock"
        size="1.5rem"
        color="#9e9e9e"
        class="status-icon pending"
      />
      <ZKIcon
        v-else-if="status === 'uploaded'"
        name="lucide:circle-check-big"
        size="1.5rem"
        color="#4caf50"
        class="status-icon uploaded"
      />
      <ZKIcon
        v-else-if="status === 'validating'"
        name="lucide:loader-circle"
        size="1.5rem"
        color="#2196f3"
        class="status-icon validating spinning"
      />
      <ZKIcon
        v-else-if="status === 'error'"
        name="lucide:circle-x"
        size="1.5rem"
        color="#ef5350"
        class="status-icon error"
      />
    </div>

    <div class="file-info">
      <div class="file-name">
        <code>{{ fileName }}</code>
        <span v-if="label" class="file-label">{{ label }}</span>
      </div>

      <div class="file-status">
        <span v-if="status === 'pending'" class="status-text pending">
          {{ t("statusPending") }}
        </span>
        <span v-else-if="status === 'uploaded'" class="status-text uploaded">
          {{ t("statusUploaded") }}
          <span v-if="file" class="file-size"
            >• {{ formatFileSize(file.size) }}</span
          >
        </span>
        <span
          v-else-if="status === 'validating'"
          class="status-text validating"
        >
          {{ t("statusValidating") }}
        </span>
        <span v-else-if="status === 'error'" class="status-text error">
          {{ t("statusError") }}
          <span v-if="errorMessage" class="error-detail">
            • {{ truncatedErrorMessage }}
            <a
              v-if="errorMessage"
              href="#"
              class="error-link"
              @click.prevent="showErrorDialog = true"
            >
              {{ t("viewDetails") }}
            </a>
          </span>
        </span>
      </div>
    </div>

    <PrimeButton
      v-if="status === 'uploaded' || status === 'error'"
      size="small"
      :aria-label="t('removeFileAriaLabel').replace('{fileName}', fileName)"
      @click.stop="handleRemove"
    >
      <span>{{ t("removeFile") }}</span>
    </PrimeButton>

    <!-- Error Details Dialog -->
    <CsvErrorDetailsDialog
      v-if="errorMessage"
      v-model="showErrorDialog"
      :error-message="errorMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  csvFileStatusItemTranslations,
  type CsvFileStatusItemTranslations,
} from "./CsvFileStatusItem.i18n";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import CsvErrorDetailsDialog from "./CsvErrorDetailsDialog.vue";

const ERROR_TRUNCATE_LENGTH = 100;

const props = defineProps<{
  fileName: string;
  label?: string;
  status: "pending" | "uploaded" | "validating" | "error";
  file: File | null;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const { t } = useComponentI18n<CsvFileStatusItemTranslations>(
  csvFileStatusItemTranslations
);

const showErrorDialog = ref(false);

const statusClass = computed(() => `status-${props.status}`);

const truncatedErrorMessage = computed(() => {
  if (!props.errorMessage) return "";
  if (props.errorMessage.length <= ERROR_TRUNCATE_LENGTH) {
    return props.errorMessage;
  }
  return props.errorMessage.substring(0, ERROR_TRUNCATE_LENGTH) + "...";
});

function handleRemove(): void {
  emit("remove");
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
.csv-file-status-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  transition: all 0.2s ease;

  &.status-uploaded {
    background-color: #f0f9f4;
    border-color: #4caf50;
  }

  &.status-error {
    background-color: #ffebee;
    border-color: #ef5350;
  }

  &.status-validating {
    background-color: #e3f2fd;
    border-color: #2196f3;
  }
}

.status-icon-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
}

.status-icon {
  &.spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  code {
    font-size: 0.875rem;
    font-family: monospace;
    font-weight: var(--font-weight-semibold);
    color: $color-text-strong;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
  }

  .file-label {
    font-size: 0.75rem;
    color: $color-text-weak;
  }
}

.file-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-text {
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);

  &.pending {
    color: #757575;
  }

  &.uploaded {
    color: #2e7d32;
  }

  &.validating {
    color: #1976d2;
  }

  &.error {
    color: #c62828;
  }

  .file-size {
    font-weight: normal;
    color: $color-text-weak;
  }

  .error-detail {
    font-weight: normal;
    font-size: 0.75rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.error-link {
  color: $primary;
  text-decoration: none;
  margin-left: 0.5rem;
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
}
</style>
