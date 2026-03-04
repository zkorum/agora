<template>
  <div class="vote-legend">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="vote-legend-entry"
    >
      <span :class="['vote-legend-swatch', `swatch-${item.type}`]" />
      <span class="vote-legend-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
export type VoteLegendType = "agree" | "unsure" | "disagree" | "noVote";

defineProps<{
  items: Array<{ label: string; type: VoteLegendType }>;
}>();
</script>

<style lang="scss" scoped>
.vote-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.vote-legend-entry {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.vote-legend-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.swatch-agree {
  background: linear-gradient(90deg, var(--sentiment-positive), var(--sentiment-positive-end));
}

.swatch-unsure {
  background: var(--sentiment-neutral);
}

.swatch-disagree {
  background: linear-gradient(90deg, var(--sentiment-negative), var(--sentiment-negative-end));
}

.swatch-noVote {
  background: var(--sentiment-empty);
}

.vote-legend-label {
  font-size: 0.7rem;
  color: #6d6a74;
}
</style>
