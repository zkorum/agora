<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="custom-timer-dialog">
        <div class="dialog-header">
          <h3>{{ t("selectCustomTime") }}</h3>
          <p>{{ t("chooseWhenPublic") }}</p>
        </div>

        <div class="date-picker-container">
          <PrimeDatePicker
            v-model="customDate"
            show-time
            show-icon
            hour-format="12"
            inline
            class="date-picker"
            :min-date="new Date()"
            @update:model-value="handleCustomDateChange"
          />
        </div>

        <div class="dialog-actions">
          <button class="action-button secondary" @click="goBack">
            {{ t("back") }}
          </button>
          <button
            class="action-button primary"
            :disabled="!customDate"
            @click="confirmSelection"
          >
            {{ t("confirm") }}
          </button>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  customTimerDialogTranslations,
  type CustomTimerDialogTranslations,
} from "./CustomTimerDialog.i18n";

const { t } = useComponentI18n<CustomTimerDialogTranslations>(
  customTimerDialogTranslations
);

const showDialog = defineModel<boolean>("showDialog", { required: true });

const emit = defineEmits<{
  goBack: [];
}>();

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const customDate = ref<Date>(new Date());

const initializeDate = () => {
  // Use existing conversionDate from conversationDraft if available and hasScheduledConversion is enabled
  if (
    conversationDraft.value.privateConversationSettings
      .hasScheduledConversion &&
    conversationDraft.value.privateConversationSettings.conversionDate
  ) {
    customDate.value = new Date(
      conversationDraft.value.privateConversationSettings.conversionDate
    );
  } else {
    // Set initial custom date to 1 day from now as fallback
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    customDate.value = tomorrow;
  }
};

watch(showDialog, (isOpen) => {
  if (isOpen) {
    initializeDate();
  }
});

function handleCustomDateChange(date: Date | null): void {
  if (date) {
    customDate.value = date;
  }
}

function goBack(): void {
  emit("goBack");
}

function confirmSelection(): void {
  if (customDate.value) {
    conversationDraft.value.privateConversationSettings.hasScheduledConversion = true;
    conversationDraft.value.privateConversationSettings.conversionDate =
      customDate.value;
    showDialog.value = false;
  }
}
</script>

<style scoped lang="scss">
.custom-timer-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dialog-header {
  text-align: center;

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: var(--font-weight-semibold);
    color: #1f2937;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }
}

.date-picker-container {
  display: flex;
  justify-content: center;

  .date-picker {
    width: 100%;

    :deep(.p-datepicker-input) {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
    }

    :deep(.p-datepicker-panel) {
      z-index: 9999;
    }

    :deep(.p-datepicker-overlay) {
      z-index: 9999;
    }
  }
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.action-button {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  &.secondary {
    background-color: #f3f4f6;
    color: #374151;

    &:hover {
      background-color: #e5e7eb;
    }
  }

  &.primary {
    background-color: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
      background-color: #2563eb;
    }

    &:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
  }
}
</style>
