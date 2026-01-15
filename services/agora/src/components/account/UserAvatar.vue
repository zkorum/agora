<template>
  <img :src="svg" :alt="userIdentity" />
</template>

<script setup lang="ts">
import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { computed } from "vue";

const props = defineProps<{
  userIdentity: string;
  size: number;
}>();

const svg = computed(() => {
  try {
    return createAvatar(thumbs, {
      size: props.size,
      seed: props.userIdentity,
      radius: 35,
    }).toDataUri().toString();
  } catch (error) {
    console.warn("Failed to generate avatar:", error);
    return "";
  }
});
</script>
