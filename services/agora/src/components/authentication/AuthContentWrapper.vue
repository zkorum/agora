<template>
  <div>
    <div class="container">
      <div class="title">
        <slot name="title"></slot>
      </div>

      <slot name="body"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
}

.title {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
}
</style>
