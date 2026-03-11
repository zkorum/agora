<template>
  <q-badge
    v-if="numNewNotifications > 0"
    color="red-light"
    rounded
    floating
    :label="formatAmount(numNewNotifications)"
  ></q-badge>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationStore } from "src/stores/notification";
import { formatAmount } from "src/utils/common";

const { numNewNotifications } = storeToRefs(useNotificationStore());
</script>

<style lang="scss" scoped></style>
