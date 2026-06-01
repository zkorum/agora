<template>
  <span class="animated-amount" :class="directionClass">
    <Transition :name="transitionName">
      <span :key="formattedAmount" class="animated-amount__value">
        {{ formattedAmount }}
      </span>
    </Transition>
  </span>
</template>

<script setup lang="ts">
import { formatAmount } from "src/utils/common";
import { computed, ref, watch } from "vue";

type CountDirection = "up" | "down" | "neutral";

const props = defineProps<{
  amount: number;
}>();

const direction = ref<CountDirection>("neutral");

const formattedAmount = computed(() => formatAmount(props.amount));
const transitionName = computed(() => `amount-${direction.value}`);
const directionClass = computed(() => `animated-amount--${direction.value}`);

watch(
  () => props.amount,
  (nextAmount, previousAmount) => {
    if (nextAmount > previousAmount) {
      direction.value = "up";
      return;
    }

    if (nextAmount < previousAmount) {
      direction.value = "down";
      return;
    }

    direction.value = "neutral";
  }
);
</script>

<style scoped lang="scss">
.animated-amount {
  position: relative;
  display: inline-grid;
  overflow: hidden;
  color: inherit;
  background-image: inherit;
  background-clip: inherit;
  -webkit-background-clip: inherit;
  vertical-align: bottom;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.animated-amount__value {
  grid-area: 1 / 1;
  display: inline-block;
  color: inherit;
  background-image: inherit;
  background-clip: inherit;
  -webkit-background-clip: inherit;
}

.amount-up-enter-active,
.amount-up-leave-active,
.amount-down-enter-active,
.amount-down-leave-active,
.amount-neutral-enter-active,
.amount-neutral-leave-active {
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease;
}

.amount-up-leave-active,
.amount-down-leave-active,
.amount-neutral-leave-active {
  position: absolute;
  inset: 0;
}

.amount-up-enter-from {
  opacity: 0;
  transform: translateY(70%);
}

.amount-up-leave-to {
  opacity: 0;
  transform: translateY(-70%);
}

.amount-down-enter-from {
  opacity: 0;
  transform: translateY(-70%);
}

.amount-down-leave-to {
  opacity: 0;
  transform: translateY(70%);
}

.amount-neutral-enter-from,
.amount-neutral-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .amount-up-enter-active,
  .amount-up-leave-active,
  .amount-down-enter-active,
  .amount-down-leave-active,
  .amount-neutral-enter-active,
  .amount-neutral-leave-active {
    transition: opacity 120ms ease;
  }

  .amount-up-enter-from,
  .amount-up-leave-to,
  .amount-down-enter-from,
  .amount-down-leave-to,
  .amount-neutral-enter-from,
  .amount-neutral-leave-to {
    transform: none;
  }
}
</style>
