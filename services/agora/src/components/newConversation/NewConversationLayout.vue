<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableFooter: false,
      enableHeader: false,
      reducedWidth: true,
    }"
  >
    <div class="container">
      <slot />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DrawerLayout from "src/layouts/DrawerLayout.vue";
</script>

<style scoped lang="scss">
.container {
  padding-bottom: 0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
