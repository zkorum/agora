<template>
  <div :class="{ desktopHoverEffect: enableHover }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  enableHover: boolean;
}>();
</script>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .desktopHoverEffect:hover {
    cursor: pointer;
  }
}
</style>
