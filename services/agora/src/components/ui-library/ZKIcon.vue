<template>
  <div>
    <Icon :icon="name" :style="{ fontSize: size, color: color }" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";

defineProps<{
  name: string;
  size: string;
  color: string;
}>();
</script>

<style lang="scss" scoped></style>
