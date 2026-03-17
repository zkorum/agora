<template>
  <div class="errorContainer" :class="{ compact }">
    <q-icon name="mdi-alert-circle-outline" :size="compact ? '3rem' : '4rem'" />
    <div class="errorTitle" :class="{ compactTitle: compact }">{{ title }}</div>
    <ActionButton variant="outline" @click="$emit('retry')">
      {{ retryLabel }}
    </ActionButton>
  </div>
</template>

<script setup lang="ts">
import ActionButton from "src/components/ui-library/ActionButton.vue";

defineProps<{
  title: string;
  retryLabel: string;
  compact?: boolean;
}>();

defineEmits<{
  retry: [];
}>();
</script>

<style scoped lang="scss">
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 8rem;
  padding-bottom: 8rem;

  &.compact {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
}

.errorTitle {
  font-size: 1.3rem;

  &.compactTitle {
    font-size: 1.1rem;
  }
}
</style>
