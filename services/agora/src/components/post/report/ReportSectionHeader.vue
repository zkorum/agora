<template>
  <div class="section-header">
    <div class="section-header__content">
      <h2 class="section-title">
        <span :style="titleStyle">{{ title }}</span>
      </h2>
      <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="$slots.action" class="section-header__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    titleColor?: string;
  }>(),
  {
    subtitle: undefined,
    titleColor: undefined,
  }
);

const titleStyle = computed(() => {
  if (props.titleColor === undefined) {
    return undefined;
  }

  return { color: props.titleColor };
});
</script>

<style lang="scss" scoped>
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-header__content {
  min-width: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: $ink-dark;
  margin: 0 0 0.25rem 0;
}

.section-subtitle {
  font-size: 0.85rem;
  color: $ink-light;
  margin: 0;
  font-weight: normal;
}

.section-header__action {
  flex-shrink: 0;
}

@media (max-width: $breakpoint-xs-max) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
