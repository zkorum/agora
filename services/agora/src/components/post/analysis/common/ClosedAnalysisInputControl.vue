<template>
  <div class="closed-analysis-inputs">
    <button
      v-if="props.canSwitch"
      type="button"
      class="closed-analysis-inputs__button"
      :disabled="props.saving"
      @click="emit('selectMode', otherMode)"
    >
      {{ t("switchMode", { mode: modeLabel(otherMode) }) }}
    </button>
    <span role="status">
      <template v-if="props.selection.status === 'pending'">
        {{ t(sameMode ? "refreshing" : "pending", statusModes) }}
      </template>
      <template v-else-if="props.selection.status === 'failed'">
        {{ t(sameMode ? "refreshFailed" : "failed", statusModes) }}
      </template>
      <template v-else>
        {{ t("showing", statusModes) }}
      </template>
    </span>
    <span v-if="props.saveFailed" role="alert">{{ t("saveFailed") }}</span>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ClosedAnalysisInputMode,
  ClosedAnalysisSelection,
} from "src/shared/types/dto";
import { computed } from "vue";

import {
  type ClosedAnalysisInputTranslations,
  closedAnalysisInputTranslations,
} from "./ClosedAnalysisInputControl.i18n";

const props = defineProps<{
  selection: ClosedAnalysisSelection;
  canSwitch: boolean;
  saving: boolean;
  saveFailed: boolean;
}>();
const emit = defineEmits<{ selectMode: [mode: ClosedAnalysisInputMode] }>();
const { t } = useComponentI18n<ClosedAnalysisInputTranslations>(
  closedAnalysisInputTranslations
);
const requestedMode = computed(() =>
  props.selection.status === "ready"
    ? props.selection.servedInputMode
    : props.selection.requestedInputMode
);
const otherMode = computed(() =>
  requestedMode.value === "closing" ? "live" : "closing"
);
const sameMode = computed(
  () => requestedMode.value === props.selection.servedInputMode
);
const statusModes = computed(() => ({
  requested: modeLabel(requestedMode.value),
  served: modeLabel(props.selection.servedInputMode),
}));

function modeLabel(mode: ClosedAnalysisInputMode): string {
  return t(mode === "closing" ? "closing" : "live");
}
</script>

<style scoped lang="scss">
.closed-analysis-inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-inline-size: 0;
  font-size: 0.875rem;
}

.closed-analysis-inputs__button {
  max-inline-size: 100%;
  min-block-size: 2.75rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  white-space: normal;
}

.closed-analysis-inputs__button:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
