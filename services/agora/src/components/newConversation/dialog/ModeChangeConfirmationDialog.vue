<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card class="confirmation-card">
      <q-card-section class="header-section">
        <div class="header-content">
          <q-icon name="mdi-swap-horizontal" class="header-icon" />
          <h3 class="header-title">{{ t("switchToImportMode") }}</h3>
        </div>
      </q-card-section>

      <q-card-section class="content-section">
        <p class="main-message">
          {{ t("switchingWillClear") }}
        </p>

        <ul class="content-list">
          <li v-if="hasTitle">
            <q-icon name="mdi-format-title" class="list-icon" />
            {{ t("title") }}
          </li>
          <li v-if="hasBody">
            <q-icon name="mdi-text" class="list-icon" />
            {{ t("bodyText") }}
          </li>
          <li v-if="hasPoll">
            <q-icon name="mdi-poll" class="list-icon" />
            {{ t("pollOptions") }}
          </li>
        </ul>

        <p class="preserved-message">
          {{ t("settingsPreserved") }}
        </p>
      </q-card-section>

      <q-card-actions class="action-section">
        <ZKButton
          button-type="largeButton"
          flat
          text-color="primary"
          :label="t('cancel')"
          size="0.9rem"
          @click="handleCancel"
        />
        <ZKButton
          button-type="largeButton"
          color="primary"
          :label="t('continue')"
          size="0.9rem"
          @click="handleConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { computed } from "vue";

import {
  type ModeChangeConfirmationDialogTranslations,
  modeChangeConfirmationDialogTranslations,
} from "./ModeChangeConfirmationDialog.i18n";

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useComponentI18n<ModeChangeConfirmationDialogTranslations>(
  modeChangeConfirmationDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

// Computed properties to determine what content would be cleared
const hasTitle = computed(() => conversationDraft.value.title.trim() !== "");
const hasBody = computed(() => conversationDraft.value.content.trim() !== "");
const hasPoll = computed(
  () =>
    conversationDraft.value.poll.enabled &&
    conversationDraft.value.poll.options.some((opt) => opt.trim() !== "")
);

function handleConfirm(): void {
  showDialog.value = false;
  emit("confirm");
}

function handleCancel(): void {
  showDialog.value = false;
  emit("cancel");
}
</script>

<style scoped lang="scss">
.confirmation-card {
  min-width: 320px;
  max-width: 480px;
  border-radius: 12px;
}

.header-section {
  padding: 1.5rem 1.5rem 0.5rem 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
  color: $primary;
}

.header-title {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
  margin: 0;
}

.content-section {
  padding: 0.5rem 1.5rem 1rem 1.5rem;
}

.main-message {
  font-size: 0.95rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.content-list {
  margin: 0 0 1rem 0;
  padding-left: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    font-size: 0.9rem;
  }
}

.list-icon {
  font-size: 1rem;
  color: $negative;
  flex-shrink: 0;
}

.preserved-message {
  font-size: 0.85rem;
  color: $color-text-weak;
  margin: 0;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid $positive;
}

.action-section {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
