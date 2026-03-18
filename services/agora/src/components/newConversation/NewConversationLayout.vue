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
  padding-bottom: 0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
