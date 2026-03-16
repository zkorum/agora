<template>
  <ZKBadge :count="numNewNotifications" />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKBadge from "src/components/ui-library/ZKBadge.vue";
import { useNotificationStore } from "src/stores/notification";

const { numNewNotifications } = storeToRefs(useNotificationStore());
</script>
