<!-- eslint-disable vue/no-v-html -->
<template>
  <div fill="red" v-html="svgString"></div>
</template>

<script setup lang="ts">
defineProps<{
  svgString: string;
}>();
</script>

<style lang="scss" scoped></style>
