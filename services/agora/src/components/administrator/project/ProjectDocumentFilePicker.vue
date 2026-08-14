<template>
  <q-uploader
    ref="uploader"
    class="project-document-file-picker"
    flat
    bordered
    no-thumbnails
    hide-upload-btn
    color="grey-1"
    text-color="dark"
    :accept="accept"
    :max-file-size="maxFileSize"
    :max-files="1"
    :disable="disable"
    @added="selectFile"
    @rejected="emit('rejected')"
  >
    <template #header>
      <div class="project-document-file-picker__header">
        <div :id="labelId" class="project-document-file-picker__label">
          {{ label }}
        </div>
        <div
          :id="descriptionId"
          class="project-document-file-picker__description"
        >
          {{ description }}
        </div>
      </div>
    </template>

    <template #list>
      <div
        v-if="modelValue === null"
        class="project-document-file-picker__empty"
        role="button"
        :tabindex="disable ? -1 : 0"
        :aria-labelledby="`${labelId} ${dropLabelId}`"
        :aria-describedby="descriptionId"
        :aria-disabled="disable"
        @keydown.enter.prevent="pickFiles"
        @keydown.space.prevent="pickFiles"
      >
        <q-icon name="mdi-tray-arrow-up" size="2rem" aria-hidden="true" />
        <strong :id="dropLabelId">{{ dropLabel }}</strong>
        <q-uploader-add-trigger />
      </div>
      <q-item v-else class="project-document-file-picker__file">
        <q-item-section avatar>
          <q-icon name="mdi-file-document-outline" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="project-document-file-picker__file-name">
            {{ modelValue.name }}
          </q-item-label>
          <q-item-label caption>
            {{ formatFileSize(modelValue.size) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            color="negative"
            icon="mdi-close"
            :disable="disable"
            :aria-label="`${removeLabel}: ${modelValue.name}`"
            @click="removeSelectedFile"
          />
        </q-item-section>
      </q-item>
    </template>
  </q-uploader>
</template>

<script setup lang="ts">
import type { QUploader } from "quasar";
import { formatFileSize } from "src/utils/format";
import { ref, useId, watch } from "vue";

const props = defineProps<{
  modelValue: File | null;
  label: string;
  description: string;
  dropLabel: string;
  removeLabel: string;
  accept: string;
  maxFileSize: number;
  disable: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [file: File | null];
  rejected: [];
}>();

const uploader = ref<QUploader>();
const pickerId = useId();
const labelId = `project-document-file-picker-${pickerId}-label`;
const descriptionId = `project-document-file-picker-${pickerId}-description`;
const dropLabelId = `project-document-file-picker-${pickerId}-drop-label`;

watch(
  [() => props.modelValue, () => props.disable],
  ([file, disable]) => {
    const uploaderInstance = uploader.value;
    if (
      file === null &&
      !disable &&
      uploaderInstance !== undefined &&
      uploaderInstance.files.length !== 0
    ) {
      uploaderInstance.reset();
    }
  },
  { flush: "post" }
);

function selectFile(files: readonly File[]): void {
  const file = files.at(0);
  if (file !== undefined) {
    emit("update:modelValue", file);
  }
}

function pickFiles(event: KeyboardEvent): void {
  uploader.value?.pickFiles(event);
}

function removeSelectedFile(): void {
  const file = props.modelValue;
  if (file === null) return;
  uploader.value?.removeFile(file);
  emit("update:modelValue", null);
}
</script>

<style scoped lang="scss">
.project-document-file-picker {
  width: 100%;
  max-height: none;
  border: 1px dashed #aeb7c5;
  border-radius: 0.75rem;
}

.project-document-file-picker__header {
  padding: 1rem;
}

.project-document-file-picker__label {
  color: #24272d;
  font-size: 1rem;
  font-weight: 700;
}

.project-document-file-picker__description {
  max-width: 32rem;
  margin-block-start: 0.25rem;
  color: #596579;
  line-height: 1.35;
}

.project-document-file-picker__empty {
  position: relative;
  display: flex;
  min-height: 7rem;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  color: #687386;
  cursor: pointer;
  text-align: center;
}

.project-document-file-picker__empty:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: -3px;
}

.project-document-file-picker__file {
  min-height: 7rem;
}

.project-document-file-picker__file-name {
  overflow-wrap: anywhere;
}
</style>
