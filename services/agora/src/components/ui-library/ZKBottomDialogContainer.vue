<template>
  <div class="dialogContainer">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.dialogContainer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background-color: white;
  border-radius: 25px 25px 0 0;
  width: min(30rem, 100%);
  overflow-y: auto;
}
</style>
