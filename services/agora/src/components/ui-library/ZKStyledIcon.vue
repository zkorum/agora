<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-html="svgString"></div>
</template>

<script setup lang="ts">
defineProps<{
  svgString: string;
}>();
</script>

<style lang="scss" scoped></style>
