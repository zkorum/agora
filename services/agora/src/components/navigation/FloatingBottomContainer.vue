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
  left: 50%;
  transform: translateX(-50%);
  width: min(35rem, 100%);
  z-index: 100;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}
</style>
