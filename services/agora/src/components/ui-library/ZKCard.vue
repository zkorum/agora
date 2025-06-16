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
  border-radius: 25px;
  border-style: solid;
  border-width: 1px;
  border-color: #e7e5e4;
}
</style>
