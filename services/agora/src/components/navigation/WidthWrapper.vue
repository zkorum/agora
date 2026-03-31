<template>
  <div class="innerStyle" :style="{ width: enable ? 'min(35.9375rem, 100%)' : '' }">
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
