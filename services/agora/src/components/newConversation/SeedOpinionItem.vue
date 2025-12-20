<template>
  <PrimeCard
    class="opinion-card"
    :class="{
      'opinion-card-error': !!errorMessage,
    }"
    @click="handleCardClick"
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
            :show-toolbar="isActive"
            :disabled="false"
            min-height="3rem"
            @update:model-value="(val) => $emit('update:modelValue', val)"
            @manually-focused="$emit('focus')"
            @blur="$emit('blur')"
          />
        </div>

        <PrimeButton
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          @mousedown="$emit('remove')"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Editor from "src/components/editor/Editor.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  seedOpinionItemTranslations,
  type SeedOpinionItemTranslations,
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
</script>

<style scoped lang="scss">
.opinion-card-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.opinion-card {
  &:deep(.p-card-body) {
    padding: 0.25rem;
  }
  background-color: white;
  border-radius: 20px;
}

.opinion-card-error {
  border-color: #f44336;
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.15);
}

.textarea-border-style {
  padding: 1rem;
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
</style>
