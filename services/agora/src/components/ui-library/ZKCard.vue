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
  border-style: solid;
  border-width: 1px;
  border-color: #a391ff;
}
</style>
