<template>
  <span :class="{ gradientColor: addGradient }">
    {{ text }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
  addGradient: boolean;
}>();
</script>

<style lang="scss" scoped>
.gradientColor {
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
}
</style>
