<template>
  <img :src="svg" :alt="userIdentity" />
</template>

<script setup lang="ts">
import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { ref, watch } from "vue";

const props = defineProps<{
  userIdentity: string;
  size: number;
}>();

const svg = ref(createAvatarString());

watch(
  () => props.userIdentity,
  () => {
    svg.value = createAvatarString();
  }
);

function createAvatarString() {
  const avatar = createAvatar(thumbs, {
    size: props.size,
    seed: props.userIdentity,
    radius: 35,
  }).toDataUri();

  return avatar.toString();
}
</script>
