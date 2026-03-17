<template>
  <div v-if="numUsers === 0" class="no-data">—</div>
  <div v-else class="vote-cell">
    <div class="bar">
      <div
        class="bar-segment agree"
        :style="{ width: agreeWidth }"
      />
      <div
        class="bar-segment pass"
        :style="{ width: passWidth }"
      />
      <div
        class="bar-segment disagree"
        :style="{ width: disagreeWidth }"
      />
    </div>
    <div class="percentages">
      <span class="pct agree-text">{{ agreeStr }}</span>
      <span class="pct pass-text">{{ passStr }}</span>
      <span class="pct disagree-text">{{ disagreeStr }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calculatePercentage } from "src/shared/util";
import { formatPercentage } from "src/utils/common";
import { computed } from "vue";

const props = defineProps<{
  numAgrees: number;
  numDisagrees: number;
  numPasses: number;
  numUsers: number;
}>();

const agreePct = computed(() => calculatePercentage(props.numAgrees, props.numUsers));
const passPct = computed(() => calculatePercentage(props.numPasses, props.numUsers));
const disagreePct = computed(() => calculatePercentage(props.numDisagrees, props.numUsers));

const agreeStr = computed(() => formatPercentage(agreePct.value));
const passStr = computed(() => formatPercentage(passPct.value));
const disagreeStr = computed(() => formatPercentage(disagreePct.value));

const agreeWidth = computed(() => `${agreePct.value}%`);
const passWidth = computed(() => `${passPct.value}%`);
const disagreeWidth = computed(() => `${disagreePct.value}%`);
</script>

<style lang="scss" scoped>
.no-data {
  color: #9e9ba5;
  text-align: center;
  font-size: 0.8rem;
}

.vote-cell {
  width: 100%;
}

.bar {
  display: flex;
  height: 8px;
  border-radius: 2px;
  overflow: hidden;
  background: $sentiment-empty;
}

.bar-segment {
  height: 100%;
  min-width: 0;

  &.agree {
    background: $sentiment-positive;
  }

  &.pass {
    background: $sentiment-neutral;
  }

  &.disagree {
    background: $sentiment-negative;
  }
}

.percentages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
  margin-top: 3px;
  font-size: 0.65rem;
  line-height: 1;
}

.pct {
  &.agree-text {
    color: $sentiment-positive;
  }

  &.pass-text {
    color: #9e9ba5;
  }

  &.disagree-text {
    color: $sentiment-negative-text;
  }
}

</style>
