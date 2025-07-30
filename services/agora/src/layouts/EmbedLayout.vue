<template>
  <div class="embed-container">
    <slot />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.embed-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background-color: $app-background-color;
  padding: 0;
  margin: 0;
}

// Remove any default margins/padding
:global(body) {
  margin: 0;
  padding: 0;
}
</style>
