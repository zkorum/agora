<template>
  <div class="project-body-editor">
    <Editor
      v-model="body"
      v-model:plain-text="plainText"
      :placeholder="placeholder"
      min-height="12rem"
      :show-toolbar="true"
      :single-line="false"
      :disabled="disabled"
      :max-length="MAX_LENGTH_CONVERSATION_BODY"
      :show-character-count="true"
      @update:is-over-limit="isOverLimit = $event"
    />
  </div>
</template>

<script setup lang="ts">
import Editor from "src/components/editor/Editor.vue";
import { MAX_LENGTH_CONVERSATION_BODY } from "src/shared/shared";

defineProps<{
  placeholder: string;
  disabled: boolean;
}>();

const body = defineModel<string>({ required: true });
const plainText = defineModel<string>("plainText", { required: true });
const isOverLimit = defineModel<boolean>("isOverLimit", { required: true });
</script>

<style scoped lang="scss">
.project-body-editor {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
}
</style>
