<template>
  <div class="vote-legend">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="vote-legend-entry"
    >
      <span class="vote-legend-swatch" :style="{ background: item.color }" />
      <span class="vote-legend-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; color: string }>;
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

.vote-legend-label {
  font-size: 0.7rem;
  color: #6d6a74;
}
</style>
