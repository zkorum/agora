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
              :max-length="MAX_LENGTH_OPINION"
              :disabled="false"
              min-height="3rem"
              @update:model-value="(val) => $emit('update:modelValue', val)"
              @manually-focused="$emit('focus')"
              @blur="$emit('blur')"
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
      @click.stop="$emit('remove')"
      @mousedown.stop
    />
  </div>
</template>

<script setup lang="ts">
import Editor from "src/components/editor/Editor.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_LENGTH_OPINION } from "src/shared/shared";
import { ref } from "vue";

import {
  type SeedOpinionItemTranslations,
  seedOpinionItemTranslations,
} from "./SeedOpinionItem.i18n";

const props = defineProps<{
  modelValue: string;
  errorMessage?: string;
  isActive: boolean;
}>();

defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "remove"): void;
  (e: "focus"): void;
  (e: "blur"): void;
}>();

const { t } = useComponentI18n<SeedOpinionItemTranslations>(
  seedOpinionItemTranslations
);

const editorRef = ref<InstanceType<typeof Editor>>();

const handleCardClick = (): void => {
  if (!props.isActive) {
    editorRef.value?.focus();
  }
};

// Expose focus method for parent component
const focus = (): void => {
  editorRef.value?.focus();
};

defineExpose({
  focus,
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
