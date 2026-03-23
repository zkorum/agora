<template>
  <div class="container">
    <slot :is-active="isActive" />
  </div>
</template>

<script setup lang="ts">
import { usePageLayout } from "src/composables/layout/usePageLayout";

const { isActive } = usePageLayout({ enableHeader: true, enableFooter: false, reducedWidth: true });
</script>

<style scoped lang="scss">
.container {
  padding-bottom: 0.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>
