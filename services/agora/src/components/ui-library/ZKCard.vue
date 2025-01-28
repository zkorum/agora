<template>
  <div>
    <div class="card-decoration" :style="{ padding: padding }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  padding: string;
}>();
</script>

<style scoped lang="scss">
.card-decoration {
  border-radius: 15px;
  border-style: solid;
  border-width: 1px;
  border-color: #e7e5e4;
  background-color: $app-background-color;
}
</style>
