<template>
  <Avatar
    variant="beam"
    :name="userName"
    :colors="boringAvatarColors"
    :size="size"
  />
</template>

<script setup lang="ts">
import Avatar from "vue-boring-avatars";

defineProps<{
  userName: string;
  size: number;
}>();

const boringAvatarColors = [
  "#0a0310",
  "#49007e",
  "#ff005b",
  "#ff7d10",
  "#ffb238",
];
</script>
