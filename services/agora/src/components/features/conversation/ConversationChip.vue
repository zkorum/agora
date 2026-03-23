<template>
  <div
    class="conversation-chip"
    :style="{ backgroundColor: backgroundColor }"
  >
    <q-icon v-if="icon !== undefined" :name="icon" size="0.75rem" />
    {{ label }}
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  backgroundColor: string;
  icon?: string;
}>(), {
  icon: undefined,
});
</script>

<style scoped lang="scss">
.conversation-chip {
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: var(--font-weight-semibold);
  display: inline-flex;
  align-items: center;
  letter-spacing: 0.02em;
  gap: 0.15rem;
}
</style>
