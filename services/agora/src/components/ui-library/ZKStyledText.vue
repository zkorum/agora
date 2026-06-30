<template>
  <span
    :class="{
      gradientColor: addGradient,
    }"
  >
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
  display: inline-block;
  color: $primary;
  background-image: linear-gradient(180deg, $primary, #4f92f6);
  -webkit-background-clip: text;
  background-clip: text;
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .gradientColor {
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
}
</style>
