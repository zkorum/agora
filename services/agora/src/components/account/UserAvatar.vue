<template>
  <img :src="svg" :alt="userName" />
</template>

<script setup lang="ts">
import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";

const props = defineProps<{
  userName: string;
  size: number;
}>();

const avatar = createAvatar(thumbs, {
  size: props.size,
  seed: props.userName,
}).toDataUri();

const svg = avatar.toString();
</script>
