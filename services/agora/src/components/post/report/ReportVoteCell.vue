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
  min-width: 80px;
}

.bar {
  display: flex;
  height: 8px;
  border-radius: 2px;
  overflow: hidden;
  background: #f0f0f5;
}

.bar-segment {
  height: 100%;
  min-width: 0;

  &.agree {
    background: #6b4eff;
  }

  &.pass {
    background: #cdcbd3;
  }

  &.disagree {
    background: #ffb323;
  }
}

.percentages {
  display: flex;
  gap: 0.25rem;
  margin-top: 5px;
  font-size: 0.8rem;
  line-height: 1;
}

.pct {
  &.agree-text {
    color: #6b4eff;
  }

  &.pass-text {
    color: #9e9ba5;
  }

  &.disagree-text {
    color: #a05e03;
  }
}

</style>
