<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="error-details-dialog">
        <!-- Dialog Title -->
        <div class="dialog-header">
          <h3 class="dialog-title">{{ t("dialogTitle") }}</h3>
        </div>

        <!-- Error Message (Scrollable) -->
        <div class="error-message-container">
          <code class="error-message">{{ errorMessage }}</code>
        </div>

        <!-- Help Section -->
        <div class="help-section">
          <div class="help-text">
            <p>{{ t("helpText") }}</p>
          </div>
          <div class="support-info">
            <p>{{ t("supportText") }}</p>
          </div>
        </div>

        <!-- Close Button -->
        <div class="dialog-actions">
          <PrimeButton
            :label="t('close')"
            severity="primary"
            class="close-button"
            @click="handleClose"
          />
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  csvErrorDetailsDialogTranslations,
  type CsvErrorDetailsDialogTranslations,
} from "./CsvErrorDetailsDialog.i18n";

interface Props {
  errorMessage: string;
}

defineProps<Props>();

const showDialog = defineModel<boolean>();

const { t } = useComponentI18n<CsvErrorDetailsDialogTranslations>(
  csvErrorDetailsDialogTranslations
);

/**
 * Handle close button click
 */
function handleClose(): void {
  showDialog.value = false;
}
</script>

<style scoped lang="scss">
.error-details-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dialog-header {
  text-align: center;

  .dialog-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: var(--font-weight-semibold);
    color: $color-text-strong;
  }
}

.error-message-container {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;

  .error-message {
    font-size: 0.875rem;
    font-family: monospace;
    color: #c62828;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    display: block;
  }
}

.help-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;

  .help-text,
  .support-info {
    p {
      margin: 0;
      font-size: 0.9rem;
      color: $color-text-strong;
      line-height: 1.5;
    }
  }
}

.dialog-actions {
  display: flex;
  justify-content: stretch;

  .close-button {
    flex: 1;
  }
}
</style>
