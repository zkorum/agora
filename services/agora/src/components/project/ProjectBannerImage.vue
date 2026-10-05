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
  // Prevent wide-page banners from pushing the project content too far down.
  max-block-size: 12.5rem;
  // Use a 3:1 loading placeholder, then follow the artwork's natural proportions.
  aspect-ratio: auto 3 / 1;
  object-fit: cover;
  object-position: center;
}
</style>
