<template>
  <span class="inline-metadata-line">
    <slot />
  </span>
</template>

<style scoped lang="scss">
.inline-metadata-line {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: $color-text-weak;
  font-size: 0.75rem;
  font-weight: var(--font-weight-normal);
  line-height: 1.2;
}
</style>
