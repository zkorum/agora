<template>
  <div class="settings-section-header">
    <h2 v-if="title !== undefined">{{ title }}</h2>
    <p v-for="description in descriptions" :key="description">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string | undefined;
  descriptions: readonly string[];
}>();
</script>

<style scoped lang="scss">
.settings-section-header {
  margin-block: 1.5rem 1rem;

  &:first-child {
    margin-block-start: 0;
  }

  h2 {
    margin: 0 0 1rem;
    color: #1f2937;
    font-size: 1rem;
    font-weight: var(--font-weight-semibold);
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.4;

    + p {
      margin-block-start: 0.5rem;
    }
  }
}
</style>
