<template>
  <h2 :id="headingId" class="project-section-heading">
    {{ title }}
  </h2>
</template>

<script setup lang="ts">
defineProps<{
  headingId: string | undefined;
  title: string;
}>();
</script>

<style scoped lang="scss">
.project-section-heading {
  margin: 0;
  color: $ink-light;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}
</style>
