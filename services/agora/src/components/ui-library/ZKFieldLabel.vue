<template>
  <span class="zk-field-label">
    {{ label }}
    <span v-if="required" aria-hidden="true" class="zk-field-label__required"
      >*</span
    >
    <span v-if="required && requiredText !== undefined" class="visually-hidden">
      {{ requiredText }}
    </span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  required: boolean;
  requiredText: string | undefined;
}>();
</script>

<style scoped lang="scss">
.zk-field-label__required {
  margin-inline-start: 0.15rem;
  color: $negative;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
