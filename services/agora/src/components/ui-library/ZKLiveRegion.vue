<template>
  <span class="visually-hidden" :aria-live="politeness" aria-atomic="true">
    {{ message }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  politeness: "assertive" | "polite";
}>();
</script>

<style scoped lang="scss">
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
