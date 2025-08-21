<template>
  <div class="bodyContainer">
    <img :src="rarimoExampleImagePath" class="imageStyle" />
  </div>
</template>

<script setup lang="ts">
const rarimoExampleImagePath =
  process.env.VITE_PUBLIC_DIR + "/images/onboarding/rarimoExample.png";
</script>

<style scoped lang="scss">
.imageStyle {
  width: min(100%, 20rem);
  border-radius: 15px;
}

.bodyContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2rem;
}
</style>
