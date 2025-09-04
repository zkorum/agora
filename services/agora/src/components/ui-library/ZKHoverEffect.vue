<template>
  <!-- TODO: ACCESSIBILITY - Consider adding proper ARIA attributes and keyboard event handling -->
  <!-- Hover effect wrapper should support keyboard interaction for users who cannot use mouse -->
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
