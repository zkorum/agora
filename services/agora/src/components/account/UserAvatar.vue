<template>
  <img :src="svg" :alt="userName" />
</template>

<script setup lang="ts">
import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";
import { ref, watch } from "vue";

const props = defineProps<{
  userName: string;
  size: number;
}>();

const svg = ref(createAvatarString());

watch(
  () => props.userName,
  () => {
    svg.value = createAvatarString();
  }
);

function createAvatarString() {
  const avatar = createAvatar(thumbs, {
    size: props.size,
    seed: props.userName,
    radius: 35,
  }).toDataUri();

  return avatar.toString();
}
</script>
