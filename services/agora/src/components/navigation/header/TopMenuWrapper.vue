<template>
  <WidthWrapper :enable="true">
    <div class="topMenu">
      <slot />
    </div>
  </WidthWrapper>
</template>

<script setup lang="ts">
import WidthWrapper from "../WidthWrapper.vue";
</script>

<style scoped lang="scss">
.topMenu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding-top: 0.5rem;
}
</style>
