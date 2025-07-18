<template>
  <div>
    <div class="vote-bar-container">
      <div
        class="vote-bar vote-bar-1"
        :style="{
          width: `${formatPercentage(calculatePercentage(props.voteCount1, numParticipants))}`,
        }"
        :title="`${props.voteCount1} votes (${formatPercentage(calculatePercentage(props.voteCount1, numParticipants))})`"
      ></div>
      <div
        class="vote-bar vote-bar-2"
        :style="{
          width: `${formatPercentage(calculatePercentage(props.voteCount2, numParticipants))}`,
        }"
        :title="`${props.voteCount2} votes (${formatPercentage(calculatePercentage(props.voteCount2, numParticipants))})`"
      ></div>
      <div
        class="vote-bar vote-bar-3"
        :style="{
          width: `${formatPercentage(calculatePercentage(props.voteCount3, numParticipants))}`,
        }"
        :title="`${props.voteCount3} votes (${formatPercentage(calculatePercentage(props.voteCount3, numParticipants))})`"
      ></div>
      <div
        class="vote-bar vote-bar-4"
        :style="{
          width: `${formatPercentage(calculatePercentage(props.voteCount4, numParticipants))}`,
        }"
        :title="`${props.voteCount4} votes (${formatPercentage(calculatePercentage(props.voteCount4, numParticipants))})`"
      ></div>
    </div>

    <div v-if="props.showLegend" class="legend-container">
      <div
        v-for="(item, index) in legendItems"
        :key="index"
        class="legend-item"
      >
        <div class="legend-color" :class="`legend-color-${index + 1}`"></div>
        <div class="legend-label">{{ item.label }}: {{ item.count }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calculatePercentage } from "src/shared/common/util";
import { formatPercentage } from "src/utils/common";
import { computed } from "vue";

const props = defineProps<{
  voteCount1: number;
  voteCount2: number;
  voteCount3: number;
  voteCount4: number;
  numParticipants: number;
  label1?: string;
  label2?: string;
  label3?: string;
  label4?: string;
  showLegend?: boolean;
}>();

const legendItems = computed(() => {
  return [
    { label: props.label1 || "Group 1", count: props.voteCount1 },
    { label: props.label2 || "Group 2", count: props.voteCount2 },
    { label: props.label3 || "Group 3", count: props.voteCount3 },
    { label: props.label4 || "Group 4", count: props.voteCount4 },
  ];
});
</script>

<style lang="scss" scoped>
.vote-bar-container {
  display: flex;
  height: 1rem;
  overflow: hidden;
  position: relative;
  background-color: transparent;
  border-radius: 4px;
}

.vote-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.vote-bar-1 {
  background: linear-gradient(90deg, #6b4eff 0%, #4f92f6 100%);
}

.vote-bar-2 {
  background: #cdcbd3;
}

.vote-bar-3 {
  background: linear-gradient(90deg, #ffb323 0%, #ffdd1c 100%);
}

.vote-bar-4 {
  background: #e9e9f1;
}

.legend-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
}

.legend-color-1 {
  background: linear-gradient(90deg, #6b4eff 0%, #4f92f6 100%);
}

.legend-color-2 {
  background: #cdcbd3;
}

.legend-color-3 {
  background: linear-gradient(90deg, #ffb323 0%, #ffdd1c 100%);
}

.legend-color-4 {
  background: #e9e9f1;
}

.legend-label {
  font-size: 0.875rem;
  color: #6d6a74;
}
</style>
