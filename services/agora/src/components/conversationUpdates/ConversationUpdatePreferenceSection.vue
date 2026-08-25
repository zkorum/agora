<template>
  <section class="preference-section">
    <h2>{{ title }}</h2>
    <q-list bordered separator class="preference-section__list">
      <slot />
    </q-list>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped lang="scss">
.preference-section {
  display: grid;
  gap: 0.75rem;

  h2 {
    margin: 0;
    color: $color-text-strong;
    font-size: 1.05rem;
  }

  &__list {
    overflow: hidden;
    border-radius: 1rem;
  }
}
</style>
