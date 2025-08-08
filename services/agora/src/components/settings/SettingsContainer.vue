<template>
  <div class="settings-container">
    <div class="settings-background">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// No props needed - just a pure container
</script>

<style scoped lang="scss">
.settings-container {
  margin-bottom: 2rem;
}

.settings-background {
  background-color: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
}
</style>
