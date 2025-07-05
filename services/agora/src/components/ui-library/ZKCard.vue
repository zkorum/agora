<template>
  <div class="card-decoration" :style="{ padding: padding }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  padding: string;
}>();
</script>

<style scoped lang="scss">
.card-decoration {
  border-radius: 16px;
}
</style>
