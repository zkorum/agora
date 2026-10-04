<template>
  <div class="voting-session-toolbar" :aria-label="t('votingProgress')" :aria-busy="isBusy">
    <div class="status" role="status" aria-live="polite">
      <span class="status-text">{{ statusText }}</span>
      <q-linear-progress
        v-if="progress.kind === 'percentage'"
        :value="progress.value / 100"
        color="primary"
        rounded
        size="6px"
      />
    </div>
    <ZKDropdownSelectorButton
      class="undo-button"
      button-type="standardButton"
      :icon-name="undoIcon"
      icon-position="start"
      icon-size="1.3rem"
      label-overflow="wrap"
      :label="t('undo')"
      :accessibility-label="t('undo')"
      :disable="!canUndo || isBusy || isDisabled"
      @click="emit('undo')"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import ZKDropdownSelectorButton from "src/components/ui-library/ZKDropdownSelectorButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { formatPercentage } from "src/utils/common";
import { computed } from "vue";

import {
  type VotingSessionToolbarTranslations,
  votingSessionToolbarTranslations,
} from "./VotingSessionToolbar.i18n";
import type { VotingSessionProgress } from "./VotingSessionToolbar.types";

const props = defineProps<{
  progress: VotingSessionProgress;
  canUndo: boolean;
  isBusy: boolean;
  isDisabled: boolean;
}>();
const emit = defineEmits<{ undo: [] }>();

const statusText = computed(() => props.progress.kind === "count"
  ? props.progress.label
  : formatPercentage(props.progress.value));

const $q = useQuasar();
const undoIcon = computed(() => $q.lang.rtl ? "mdi-redo" : "mdi-undo");
const { t } = useComponentI18n<VotingSessionToolbarTranslations>(
  votingSessionToolbarTranslations
);
</script>

<style scoped lang="scss">
.voting-session-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-block-size: 2.5rem;
}

.status {
  display: grid;
  flex: 1;
  gap: 0.375rem;
  min-inline-size: 0;
  color: $color-text-weak;
  font-variant-numeric: tabular-nums;
}

.status-text {
  min-block-size: 1.25rem;
}

.undo-button {
  flex-shrink: 0;
  // Keep the control clear of the page header and sticky conversation tabs
  // when keyboard focus or scrollIntoView brings it back into the viewport.
  scroll-margin-block-start: 8rem;
}
</style>
