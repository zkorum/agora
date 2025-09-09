<template>
  <q-dialog v-model="model">
    <q-card class="edit-card q-pa-md" style="min-width: 720px; max-width: 95vw">
      <q-card-section class="q-pb-sm">
        <div class="text-h6">{{ titleText }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input
          v-model="localTitle"
          :label="titleLabel"
          outlined
          dense
          :maxlength="titleMaxLength"
        />

        <div class="bodyLabel text-caption text-grey-7">{{ bodyLabel }}</div>
        <q-editor
          v-model="localBody"
          :definitions="editorDefs"
          :toolbar="editorToolbar"
          height="260px"
          class="rounded-borders bg-white"
        />
        <div class="text-caption text-grey-6">{{ localBody.length }}/{{ bodyMaxLength }}</div>
      </q-card-section>

      <q-card-actions align="right" class="q-pt-none">
        <q-btn flat :label="cancelText" color="grey-7" @click="onCancel" />
        <q-btn :label="saveText" color="primary" unelevated :disable="saveDisabled" @click="onSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', payload: { title: string; body: string }): void
}>()

const props = withDefaults(defineProps<{
  modelValue: boolean
  initialTitle: string
  initialBody: string
  titleText?: string
  titleLabel?: string
  bodyLabel?: string
  saveText?: string
  cancelText?: string
  titleMaxLength?: number
  bodyMaxLength?: number
}>(), {
  titleText: 'Edit Post',
  titleLabel: 'Title',
  bodyLabel: 'Body',
  saveText: 'Save',
  cancelText: 'Cancel',
  titleMaxLength: 120,
  bodyMaxLength: 20000,
})

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const localTitle = ref(props.initialTitle)
const localBody = ref(props.initialBody)

watch(() => props.modelValue, (open) => {
  if (open) {
    // reset values when dialog opens
    localTitle.value = props.initialTitle
    localBody.value = props.initialBody
  }
})

const saveDisabled = computed(() => !localTitle.value.trim())

// Editor toolbar and definitions
const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['quote', 'unordered', 'ordered'],
  ['link'],
  ['removeFormat']
] as const

const editorDefs = {
  // Extend if needed
}

function onCancel() {
  model.value = false
}

function onSave() {
  emit('save', { title: localTitle.value.trim(), body: localBody.value })
  model.value = false
}
</script>

<style scoped>
.edit-card {
  border-radius: 14px;
}

.rounded-borders {
  border-radius: 10px;
}

.bodyLabel {
  margin-top: 4px;
}
</style>
