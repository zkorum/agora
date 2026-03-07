<template>
  <div>
    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="breakdownGrid">
          <span>{{ totalLabel }}:</span>
          <span class="breakdownNumber">{{ formatAmount(totalCount) }}</span>
          <span>{{ analysisLabel }}:</span>
          <span class="breakdownNumber">{{ formatAmount(analysisCount) }}</span>
        </div>

        <div class="breakdownExplanation">
          {{ explanationText }}
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { formatAmount } from "src/utils/common";

defineProps<{
  totalCount: number;
  analysisCount: number;
  totalLabel: string;
  analysisLabel: string;
  explanationText: string;
}>();

const showDialog = defineModel<boolean>({ required: true });
</script>

<style lang="scss" scoped>
.breakdownGrid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 0.75rem;
  font-size: 0.95rem;
  align-items: baseline;
}

.breakdownNumber {
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-semibold);
  min-width: 3ch;
}

.breakdownExplanation {
  font-size: 0.85rem;
  color: #6d6a74;
}
</style>
