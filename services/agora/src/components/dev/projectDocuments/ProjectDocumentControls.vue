<template>
  <div class="document-controls">
    <q-btn-toggle
      v-model="viewer"
      aria-label="Document preview viewer"
      no-caps
      unelevated
      toggle-color="primary"
      :options="documentViewerOptions"
    />
    <q-select
      v-model="scenario"
      label="Document requests (dev simulation)"
      dense
      outlined
      emit-value
      map-options
      :options="documentScenarioOptions"
      :hint="documentScenarioHints[scenario]"
    />
    <ZKButton
      button-type="compactButton"
      flat
      color="primary"
      icon="mdi-file-document-outline"
      label="Jump to documents"
      :disable="!hasDocuments"
      @click="emit('jump')"
    />
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";

import {
  type DocumentScenario,
  documentScenarioHints,
  documentScenarioOptions,
  documentViewerOptions,
  type PreviewViewer,
} from "./useProjectDocumentDemo";

defineProps<{ hasDocuments: boolean }>();
const emit = defineEmits<{ jump: [] }>();
const viewer = defineModel<PreviewViewer>("viewer", { required: true });
const scenario = defineModel<DocumentScenario>("scenario", { required: true });
</script>

<style scoped lang="scss">
.document-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  width: 100%;

  .q-select {
    flex: 1 1 12rem;
  }
}
</style>
