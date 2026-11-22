<template>
  <div class="credit-cost">
    <div
      class="credit-square"
      :class="{ 'is-negative': votes < 0 }"
      :style="{
        '--square-side': `${(Math.abs(votes) / Math.sqrt(QV_CREDIT_BUDGET)) * 100}%`,
      }"
      role="img"
      :aria-label="
        t('squareLabel', {
          votes: numbers.integer(votes),
          credits: numbers.integer(votes ** 2),
          budget: numbers.integer(QV_CREDIT_BUDGET),
        })
      "
    >
      <div class="credit-square-fill" />
    </div>
    <span>{{
      t(Math.abs(votes) === 1 ? "oneCredit" : "creditCost", {
        credits: numbers.integer(votes ** 2),
      })
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useDisplayNumbers } from "src/i18n/numberFormats";
import { QV_CREDIT_BUDGET } from "src/shared/utils/qv";

import { qvVotingTranslations } from "./QvVoting.i18n";

defineProps<{ votes: number }>();
const numbers = useDisplayNumbers();
const { t } = useComponentI18n(qvVotingTranslations);
</script>

<style scoped lang="scss">
.credit-cost {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  color: $ink-light;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.credit-square {
  position: relative;
  inline-size: 4rem;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  background: $sky-lighter;
}
.credit-square-fill {
  position: absolute;
  inset-inline-start: 0;
  inset-block-end: 0;
  inline-size: var(--square-side);
  block-size: var(--square-side);
  border-radius: 2px;
  background: $green-base;
  transition:
    inline-size 180ms ease,
    block-size 180ms ease,
    background-color 150ms ease;
}
.is-negative .credit-square-fill {
  background: $red-base;
}
@media (prefers-reduced-motion: reduce) {
  .credit-square-fill {
    transition: none;
  }
}
</style>
