<template>
  <div class="admin-section-header">
    <h2>{{ title }}</h2>
    <p v-if="description !== undefined">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string | undefined;
}>();
</script>

<style scoped lang="scss">
.admin-section-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.admin-section-header h2,
.admin-section-header p {
  margin: 0;
}

.admin-section-header h2 {
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
