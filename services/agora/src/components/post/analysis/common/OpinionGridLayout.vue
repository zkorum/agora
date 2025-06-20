<template>
  <div>
    <div class="container" @click="$emit('click')">
      <div>
        <slot name="content" />
      </div>
      <div>
        <slot name="visualizer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: "click"): void;
}>();
</script>

<style lang="scss" scoped>
.container {
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr 8rem;
  gap: 1rem;
  align-items: center;
  transition: background-color 0.2s ease;
  padding-top: 1rem;
  padding-bottom: 1rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-radius: 8px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
