<template>
  <div class="container">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { usePageLayout } from "src/composables/layout/usePageLayout";

usePageLayout({ enableHeader: false, enableFooter: false, reducedWidth: true });
</script>

<style scoped lang="scss">
.container {
  padding-top: 1rem;
  padding-bottom: 0.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>
