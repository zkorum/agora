<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="custom-timer-dialog">
        <div class="dialog-header">
          <h3>Select Custom Date</h3>
          <p>Choose when your conversation should become public</p>
        </div>

        <q-date
          v-model="customDateString"
          :options="dateOptions"
          color="primary"
          flat
          bordered
          text-color="white"
          class="date-picker"
          @update:model-value="handleCustomDateChange"
        />

        <div class="dialog-actions">
          <button class="action-button secondary" @click="goBack">Back</button>
          <button
            class="action-button primary"
            :disabled="!customDate"
            @click="confirmSelection"
          >
            Confirm
          </button>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const emit = defineEmits<{
  goBack: [];
}>();

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const customDate = ref<Date>(new Date());

// Convert Date to string format for q-date (YYYY/MM/DD)
const customDateString = computed({
  get: () => {
    const date = customDate.value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  },
  set: (value: string) => {
    if (value) {
      const [year, month, day] = value.split("/").map(Number);
      const newDate = new Date(year, month - 1, day);
      // Set time to start of day (00:00:00) since we're only selecting date
      newDate.setHours(0, 0, 0, 0);
      customDate.value = newDate;
    }
  },
});

// Function to determine which dates are selectable (tomorrow and future dates only)
const dateOptions = (date: string) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const [year, month, day] = date.split("/").map(Number);
  const checkDate = new Date(year, month - 1, day);
  return checkDate >= tomorrow;
};

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
    tomorrow.setHours(0, 0, 0, 0); // Set to start of day
    customDate.value = tomorrow;
  }
};

watch(showDialog, (isOpen) => {
  if (isOpen) {
    initializeDate();
  }
});

function handleCustomDateChange(dateString: string): void {
  // The computed setter will handle the conversion from string to Date
  customDateString.value = dateString;
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
    font-weight: 600;
    color: #1f2937;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }
}

.date-picker {
  width: 100%;
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
  font-weight: 500;
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
