<template>
  <RouterLink :to="{ name: '/help/' }">
    <ZKButton icon="mdi-help" text-color="color-text-strong" flat />
  </RouterLink>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
</script>

<style scoped></style>
