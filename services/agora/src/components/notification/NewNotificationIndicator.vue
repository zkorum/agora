<template>
  <q-badge
    v-if="numNewNotifications > 0"
    color="red"
    rounded
    floating
    transparent
  ></q-badge>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationStore } from "src/stores/notification";

const { numNewNotifications } = storeToRefs(useNotificationStore());
</script>

<style lang="scss" scoped></style>
