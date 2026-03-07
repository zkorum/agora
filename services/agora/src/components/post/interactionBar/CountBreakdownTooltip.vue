<template>
  <q-tooltip
    v-if="totalCount > analysisCount"
    anchor="top middle"
    self="bottom middle"
    :offset="[0, 8]"
  >
    <div class="zkCountTooltip">
      <div class="zkCountTooltip__grid">
        <span>{{ totalLabel }}:</span>
        <span class="zkCountTooltip__number">{{ formatAmount(totalCount) }}</span>
        <span>{{ analysisLabel }}:</span>
        <span class="zkCountTooltip__number">{{ formatAmount(analysisCount) }}</span>
      </div>
      <div class="zkCountTooltip__explanation">
        {{ explanationText }}
      </div>
    </div>
  </q-tooltip>
</template>

<script setup lang="ts">
import { formatAmount } from "src/utils/common";

defineProps<{
  totalCount: number;
  analysisCount: number;
  totalLabel: string;
  analysisLabel: string;
  explanationText: string;
}>();
</script>

<style lang="scss">
.zkCountTooltip {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  max-width: 250px;
}

.zkCountTooltip__grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 0.5rem;
  justify-items: stretch;
}

.zkCountTooltip__number {
  text-align: center;
  min-width: 2ch;
  font-variant-numeric: tabular-nums;
}

.zkCountTooltip__explanation {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  opacity: 0.85;
}
</style>
