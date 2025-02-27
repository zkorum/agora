<template>
  <div>
    <div class="bottomBar">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.bottomBar {
  position: fixed;
  bottom: 0rem;
  width: min(35rem, 100%);
  z-index: 100;
}
</style>
