<template>
  <ZKCard
    padding="1.5rem"
    :style="{ marginTop: '1rem', backgroundColor: 'white' }"
  >
    <div class="poll-container">
      <div class="poll-header">
        <div class="poll-title">
          <q-icon name="mdi-poll" class="poll-icon" />
          <span class="poll-title-text">Add a Poll</span>
        </div>
        <ZKButton
          button-type="icon"
          flat
          text-color="black"
          icon="mdi-close"
          class="close-button"
          @click="closePolling"
        />
      </div>

      <div class="poll-description">
        Create poll options for your conversation. You can add up to 6 options.
      </div>

      <div class="polling-options-container">
        <div
          v-for="(option, index) in postDraft.pollingOptionList"
          :key="index"
          class="polling-option-item"
        >
          <InputText
            :model-value="option"
            type="text"
            :placeholder="`Enter option ${index + 1}`"
            :maxlength="MAX_LENGTH_OPTION"
            class="option-input"
            @update:model-value="updateOption(index, $event)"
          />

          <div
            v-if="postDraft.pollingOptionList.length > 2"
            class="delete-option-container"
          >
            <ZKButton
              button-type="icon"
              flat
              round
              icon="mdi-delete-outline"
              text-color="negative"
              @click="removeOption(index)"
            />
          </div>
        </div>

        <div class="add-option-container">
          <ZKButton
            button-type="standardButton"
            flat
            text-color="primary"
            icon="mdi-plus"
            label="Add Option"
            :disable="postDraft.pollingOptionList.length >= 6"
            @click="addOption()"
          />
        </div>
      </div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import InputText from "primevue/inputtext";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { storeToRefs } from "pinia";
import { MAX_LENGTH_OPTION } from "src/shared/shared";

const { postDraft } = storeToRefs(useNewPostDraftsStore());

function closePolling() {
  postDraft.value.enablePolling = false;
}

function updateOption(index: number, value: string | undefined) {
  postDraft.value.pollingOptionList[index] = value || "";
}

function addOption() {
  postDraft.value.pollingOptionList.push("");
}

function removeOption(index: number) {
  postDraft.value.pollingOptionList.splice(index, 1);
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

.poll-icon {
  font-size: 1.5rem;
  color: $primary;
}

.poll-title-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: $color-text-strong;
}

.close-button {
  transition: $mouse-hover-transition;

  &:hover {
    background-color: $mouse-hover-color;
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
  gap: 1rem;
}

.polling-option-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-radius: 12px;
}

.option-input {
  width: 100%;
  font-size: 1rem;
  padding: 0.875rem 1rem;
  border: 1px solid $primary;
  border-radius: 10px;
  background-color: white;
  transition: all 0.3s ease;
  font-family: inherit;
  line-height: 1.5;
}

:deep(.option-input) {
  &:hover {
    border-color: $primary !important;
    background-color: rgba($primary, 0.1);
  }

  &:focus {
    border-color: $primary !important;
    background-color: rgba($primary, 0.1);
  }
}

.delete-option-container {
  display: flex;
  align-items: flex-start;
  padding-top: 0.25rem;
}

.add-option-container {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}
</style>
