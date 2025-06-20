<template>
  <div>
    <div class="container">
      <slot name="header" />
      <div class="bodyStyle">
        <slot name="body" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bodyStyle {
  display: flex;
  flex-direction: column;
}
</style>
