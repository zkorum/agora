<template>
  <button
    class="start-conversation-button-compact"
    type="button"
    @click="$emit('click')"
  >
    <i class="pi pi-plus" style="font-size: 1.3rem; color: white"></i>
  </button>
</template>

<script setup lang="ts">
defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.start-conversation-button-compact {
  /* Layout */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  height: 56px;
  min-width: 56px;

  background: linear-gradient(180deg, #6b4eff 30.96%, #4f92f6 99.99%);
  border-radius: 18.6667px;
  border: none;

  /* Interaction */
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;

  &:hover {
    background: linear-gradient(180deg, #5a42d9 30.96%, #4282d6 99.99%);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(107, 78, 255, 0.3);
  }

  &:focus-visible {
    box-shadow:
      0 4px 12px rgba(107, 78, 255, 0.3),
      0 0 0 3px rgba(107, 78, 255, 0.3);
  }
}
</style>
