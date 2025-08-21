<template>
  <div class="bodyContainer">
    <img :src="brandImagePath" class="imageStyle" />
  </div>
</template>

<script setup lang="ts">
const brandImagePath =
  process.env.VITE_PUBLIC_DIR + "/images/onboarding/brandButterflies.png";
</script>

<style scoped lang="scss">
.imageStyle {
  width: min(100%, 20rem);
}

.bodyContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2rem;
}
</style>
