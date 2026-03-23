<template>
  <div class="innerStyle" :style="{ width: enable ? 'min(31.25rem, 100%)' : '' }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  enable: boolean;
}>();
</script>

<style scoped>
.innerStyle {
  margin: auto;
}
</style>
