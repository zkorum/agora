<template>
  <ZKCard
    padding="1.5rem"
    :style="{ marginTop: '1rem', backgroundColor: 'white' }"
    class="pollBorder"
  >
    <div class="poll-container">
      <div class="poll-header">
        <div class="poll-title">
          <span class="poll-title-text">{{ t("addPoll") }}</span>
        </div>
        <PrimeButton
          icon="pi pi-times"
          text
          class="close-button"
          @click="resetPoll"
        />
      </div>

      <div v-if="validationState.poll.showError" class="pollErrorMessage">
        <q-icon name="mdi-alert-circle" class="pollErrorIcon" />
        {{ validationState.poll.error }}
      </div>

      <div class="polling-options-container">
        <div
          v-for="(option, index) in conversationDraft.poll.options"
          :key="index"
          class="polling-option-item"
        >
          <div class="option-label">{{ t("option") }} {{ index + 1 }}</div>
          <div class="option-input-container">
            <input
              :value="option"
              :placeholder="t('inputOptionText')"
              :maxlength="MAX_LENGTH_OPTION"
              class="option-input"
              type="text"
              @input="handleOptionInput(index, $event)"
            />
            <div
              v-if="conversationDraft.poll.options.length > 2"
              class="delete-option-icon"
              @click="removeOption(index)"
            >
              <q-icon name="mdi-delete" />
            </div>
          </div>
        </div>

        <div class="add-option-container">
          <PrimeButton
            :label="t('addOption')"
            icon="pi pi-plus"
            outlined
            :disabled="conversationDraft.poll.options.length >= 6"
            class="add-option-button"
            @click="addOption()"
          />
        </div>
      </div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { storeToRefs } from "pinia";
import { MAX_LENGTH_OPTION } from "src/shared/shared";
import {
  pollComponentTranslations,
  type PollComponentTranslations,
} from "./PollComponent.i18n";

const { t } = useComponentI18n<PollComponentTranslations>(
  pollComponentTranslations
);

const { resetPoll, updatePollOption, addPollOption, removePollOption } =
  useNewPostDraftsStore();
const { conversationDraft, validationState } = storeToRefs(
  useNewPostDraftsStore()
);

function handleOptionInput(index: number, event: Event) {
  if (event.target && event.target instanceof HTMLInputElement) {
    const value = event.target.value;
    updateOption(index, value);
  }
}

function updateOption(index: number, value: string) {
  updatePollOption(index, value);
}

function addOption() {
  addPollOption();
}

function removeOption(index: number) {
  removePollOption(index);
}
</script>

<style scoped lang="scss">
.poll-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.poll-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.poll-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.poll-title-text {
  font-size: 1.25rem;
  font-weight: var(--font-weight-normal);
  color: $color-text-strong;
}

.close-button {
  transition: $mouse-hover-transition;

  &:hover {
    background-color: #e9ecef !important;
  }
}

.poll-description {
  font-size: 0.9rem;
  color: $color-text-weak;
  line-height: 1.4;
}

.polling-options-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.polling-option-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-label {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: #666;
  margin-bottom: 0.25rem;
}

.option-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.option-input {
  width: 100%;
  font-size: 1rem;
  padding: 1rem 1.25rem;
  padding-right: 4rem;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  font-family: inherit;
  line-height: 1.5;

  &::placeholder {
    color: #adb5bd;
  }

  &:hover {
    border-color: #d0d0d0;
    background-color: #f0f1f2;
  }

  &:focus {
    border-color: #007bff;
    background-color: white;
    outline: none;
  }
}

.delete-option-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background-color: #e9ecef;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;

  &:hover {
    background-color: #dee2e6;
    color: #495057;
  }

  .q-icon {
    font-size: 1.2rem;
  }
}

.add-option-container {
  display: flex;
  justify-content: flex-start;
  margin-top: 0.5rem;
}

.add-option-button {
  border-radius: 16px !important;
  padding: 0.875rem 1.75rem !important;
  font-weight: var(--font-weight-medium) !important;
  font-size: 1rem !important;
  border-color: $primary !important;

  &.p-button.p-button-outlined.p-button-secondary {
    border: 1px solid $primary !important;
    background-color: transparent !important;
    color: #6366f1 !important;

    &:hover {
      background-color: #6366f1 !important;
      color: white !important;
      border-color: #6366f1 !important;
    }

    &:focus {
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
    }

    &:disabled {
      opacity: 0.6 !important;
      cursor: not-allowed !important;
    }
  }
}

.pollErrorMessage {
  display: flex;
  align-items: center;
  color: $negative;
  font-size: 0.9rem;
}

.pollErrorIcon {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.pollBorder {
  border-style: solid;
  border-width: 1px;
  border-color: #a391ff;
}
</style>
