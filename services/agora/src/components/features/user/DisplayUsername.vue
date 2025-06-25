<template>
  <div>
    {{ username }}
    <q-badge v-if="showIsGuest" align="middle">Guest</q-badge>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showIsGuest: boolean;
  username: string;
}>();
</script>

<style lang="scss" scoped></style>
