<template>
  <button
    class="action-button"
    :class="variant"
    type="button"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "filled" | "outline";
  }>(),
  {
    variant: "filled",
  }
);

defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.action-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  gap: 1rem;

  min-height: 48px;
  border-radius: 16px;

  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;

  font-family:
    "Albert Sans",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
  font-style: normal;
  font-weight: var(--font-weight-medium);
  font-size: 18px;
  line-height: 24px;
  letter-spacing: -0.01em;

  &:active {
    transform: translateY(0);
  }
}

.filled {
  background: linear-gradient(180deg, #6b4eff 30.96%, #4f92f6 99.99%);
  color: #ffffff;
  border: none;

  &:hover {
    background: linear-gradient(180deg, #5a42d9 30.96%, #4282d6 99.99%);
  }

  &:active {
    box-shadow: 0 4px 12px rgba(107, 78, 255, 0.3);
  }

  &:focus-visible {
    box-shadow:
      0 4px 12px rgba(107, 78, 255, 0.3),
      0 0 0 3px rgba(107, 78, 255, 0.3);
  }
}

.outline {
  background: transparent;
  border: 1.5px solid var(--q-primary);
  color: var(--q-primary);

  &:hover {
    background: rgba(107, 78, 255, 0.08);
  }

  &:active {
    box-shadow: 0 4px 12px rgba(107, 78, 255, 0.15);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(107, 78, 255, 0.3);
  }
}
</style>
