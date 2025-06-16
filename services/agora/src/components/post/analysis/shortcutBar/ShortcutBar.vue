<template>
  <div class="container">
    <ShortcutButton :is-selected="true" />
    <ShortcutButton :is-selected="false" />
  </div>
</template>

<script setup lang="ts">
import ShortcutButton from "./ShortcutButton.vue";
</script>

<style lang="postcss" scoped>
.container {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
