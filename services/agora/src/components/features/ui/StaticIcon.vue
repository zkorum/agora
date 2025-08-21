<template>
  <img :src="starIcon" alt="Stars" :style="{ height: props.size }" />
</template>

<script setup lang="ts">
const props = defineProps<{
  src: string;
  size: string;
}>();

const starIcon = process.env.VITE_PUBLIC_DIR + props.src;
</script>

<style lang="scss" scoped></style>
