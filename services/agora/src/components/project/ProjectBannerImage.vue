<template>
  <img
    class="project-banner-image"
    :src="src"
    :alt="alt"
    fetchpriority="high"
  />
</template>

<script setup lang="ts">
defineProps<{
  src: string;
  alt: string;
}>();
</script>

<style scoped lang="scss">
.project-banner-image {
  display: block;
  width: 100%;
  height: auto;
  // Use a 3:1 loading placeholder, then follow the artwork's natural proportions.
  aspect-ratio: auto 3 / 1;
  object-fit: contain;
  object-position: center;
}
</style>
