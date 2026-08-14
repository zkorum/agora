<template>
  <div class="admin-section-header">
    <component
      :is="subsection ? 'h3' : 'h2'"
      class="admin-section-header__title"
    >
      {{ title }}
    </component>
    <p v-if="description !== undefined">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    subsection?: boolean;
    title: string;
    description: string | undefined;
  }>(),
  {
    subsection: false,
  }
);
</script>

<style scoped lang="scss">
.admin-section-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.admin-section-header__title,
.admin-section-header p {
  margin: 0;
}

.admin-section-header__title {
  color: #1f2328;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.25;
}

.admin-section-header p {
  color: #5f6368;
  line-height: 1.4;
}
</style>
