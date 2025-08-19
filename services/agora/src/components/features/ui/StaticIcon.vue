<template>
  <img :src="props.src" alt="Stars" :style="{ height: props.size }" />
</template>

<script setup lang="ts">
const props = defineProps<{
  src: string;
  size: string;
}>();
</script>

<style lang="scss" scoped></style>
