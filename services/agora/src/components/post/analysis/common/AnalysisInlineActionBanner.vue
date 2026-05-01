<template>
  <div class="analysis-inline-action-banner">
    <div class="analysis-inline-action-banner__content">
      <div class="analysis-inline-action-banner__message">
        {{ message }}
      </div>

      <button
        class="analysis-inline-action-banner__action"
        type="button"
        :disabled="loading"
        @click="$emit('actionClick')"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message: string;
    actionLabel: string;
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

defineEmits<{
  actionClick: [];
}>();
</script>

<style lang="scss" scoped>
.analysis-inline-action-banner {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

.analysis-inline-action-banner__content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.analysis-inline-action-banner__message {
  flex: 1;
  color: #495057;
  font-size: 0.875rem;
  font-weight: 400;
}

.analysis-inline-action-banner__action {
  background: none;
  border: 0;
  color: $primary;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 400;
  padding: 0;
  text-decoration: none;
  white-space: nowrap;
}

.analysis-inline-action-banner__action:hover:not(:disabled) {
  text-decoration: underline;
}

.analysis-inline-action-banner__action:disabled {
  cursor: default;
  opacity: 0.6;
}
</style>
