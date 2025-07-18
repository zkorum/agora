<template>
  <div>
    <p class="empty-message">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<style lang="scss" scoped>
.empty-message {
  margin: 0;
}
</style>
