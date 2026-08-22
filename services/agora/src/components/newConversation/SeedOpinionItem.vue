<template>
  <div class="seed-opinion-item-wrapper" @click="handleCardClick">
    <PrimeCard
      class="opinion-card"
      :class="{
        'opinion-card-error': !!errorMessage,
      }"
    >
      <template #content>
        <div class="opinion-card-content-wrapper">
          <div class="opinion-input-container">
            <div v-if="errorMessage" class="opinion-error-message">
              <q-icon name="mdi-alert-circle" class="opinion-error-icon" />
              {{ errorMessage }}
            </div>

            <Editor
              ref="editorRef"
              :model-value="modelValue"
              class="textarea-border-style"
              :placeholder="t('inputTextPlaceholder')"
              :show-toolbar="true"
              :single-line="false"
              :disabled="disabled"
              :max-length="maxLengthOpinion"
              :submit-on-shift-enter="true"
              min-height="3rem"
              @update:model-value="
                (val: string) => emit('update:modelValue', val)
              "
              @manually-focused="emit('focus')"
              @blur="emit('blur')"
              @submit="emit('addNext')"
            />
          </div>
        </div>
      </template>
    </PrimeCard>

    <PrimeButton
      icon="pi pi-trash"
      text
      rounded
      severity="secondary"
      class="delete-button"
      :disabled="disabled"
      @click.stop="handleDeleteClick"
      @mousedown.stop
    />

    <ZKConfirmDialog
      v-model="showDeleteConfirm"
      :message="t('confirmDeleteMessage')"
      :confirm-text="t('confirmDeleteConfirm')"
      :cancel-text="t('confirmDeleteCancel')"
      variant="destructive"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { htmlToCountedText } from "src/shared/richText";
import { MAX_LENGTH_OPINION } from "src/shared/shared";
import { defineAsyncComponent, ref, watch } from "vue";

import {
  type SeedOpinionItemTranslations,
  seedOpinionItemTranslations,
} from "./SeedOpinionItem.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

const props = defineProps<{
  modelValue: string;
  errorMessage: string | undefined;
  isActive: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "remove"): void;
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "addNext"): void;
}>();

const maxLengthOpinion = MAX_LENGTH_OPINION;

const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);

const { t } = useComponentI18n<SeedOpinionItemTranslations>(
  seedOpinionItemTranslations
);

interface FocusableEditor {
  focus: () => void;
}

const editorRef = ref<FocusableEditor | null>(null);
const showDeleteConfirm = ref(false);
let focusWhenEditorIsReady = false;

watch(editorRef, () => {
  if (focusWhenEditorIsReady) {
    focusEditor();
  }
});

const handleCardClick = (): void => {
  if (!props.disabled && !props.isActive) {
    focusEditor();
  }
};

function handleDeleteClick(): void {
  if (props.disabled) {
    return;
  }

  if (htmlToCountedText(props.modelValue).trim().length === 0) {
    emit("remove");
    return;
  }

  showDeleteConfirm.value = true;
}

function handleConfirmDelete(): void {
  if (!props.disabled) {
    emit("remove");
  }
}

function focusEditor(): void {
  const editorInstance = editorRef.value;
  if (editorInstance === null) {
    focusWhenEditorIsReady = true;
    return;
  }

  focusWhenEditorIsReady = false;
  editorInstance.focus();
}

defineExpose({
  focus: focusEditor,
});
</script>

<style scoped lang="scss">
.seed-opinion-item-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.opinion-card-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.opinion-card {
  flex: 1;
  min-width: 0;
  &:deep(.p-card-body) {
    padding-top: 1rem;
    padding-left: 0rem;
    padding-right: 0rem;
    padding-bottom: 1rem;
  }
  background-color: white;
  border-radius: 20px;
}

.opinion-card-error {
  border-color: #f44336;
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.15);
}

.textarea-border-style {
  padding: 0 1rem 1rem 1rem;
  background-color: transparent;

  // Remove border as the parent card now handles it
  border: none;
  border-radius: 12px;
}

.opinion-input-container {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.opinion-error-message {
  display: flex;
  align-items: center;
  color: #f44336;
  font-size: 0.9rem;
}

.opinion-error-icon {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.delete-button {
  flex-shrink: 0;
}
</style>
