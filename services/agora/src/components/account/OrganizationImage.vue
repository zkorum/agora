<template>
  <img
    :src="organizationImageUrl"
    :alt="organizationName"
    :style="{ height: height }"
  />
</template>

<script setup lang="ts">
defineProps<{
  organizationName: string;
  organizationImageUrl: string;
  height: string;
}>();
</script>
