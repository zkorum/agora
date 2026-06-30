<template>
  <span
    class="zk-live-status-dot"
    :class="[
      `zk-live-status-dot--${tone}`,
      { 'zk-live-status-dot--active': active },
    ]"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
type LiveStatusDotTone = "analysis" | "positive";

withDefaults(
  defineProps<{
    active?: boolean;
    tone?: LiveStatusDotTone;
  }>(),
  {
    active: true,
    tone: "analysis",
  }
);
</script>

<style scoped lang="scss">
$live-analysis-color: #24966d;

.zk-live-status-dot {
  --zk-live-status-dot-before-inset: -0.42rem;
  --zk-live-status-dot-after-inset: -0.72rem;
  --zk-live-status-dot-duration: 2s;
  --zk-live-status-dot-second-wave-delay: 0.5s;

  position: relative;
  display: inline-block;
  border-radius: 999px;
}

.zk-live-status-dot--analysis {
  --zk-live-status-dot-box-shadow:
    0 0 0 4px #{rgba($live-analysis-color, 0.18)},
    0 0 0 8px #{rgba($live-analysis-color, 0.08)},
    0 0 14px #{rgba($live-analysis-color, 0.34)};
  --zk-live-status-dot-ring-background: #{rgba($live-analysis-color, 0.16)};
  --zk-live-status-dot-ring-border: 0;
  --zk-live-status-dot-ring-color: transparent;
}

.zk-live-status-dot--positive {
  --zk-live-status-dot-before-inset: -0.55rem;
  --zk-live-status-dot-after-inset: -1rem;
  --zk-live-status-dot-second-wave-delay: 90ms;
  --zk-live-status-dot-box-shadow:
    0 0 0 5px #{rgba($positive, 0.22)}, 0 0 0 9px #{rgba($positive, 0.08)},
    0 0 14px #{rgba($positive, 0.42)};
  --zk-live-status-dot-ring-background: #{rgba($positive, 0.18)};
  --zk-live-status-dot-ring-border: 0;
  --zk-live-status-dot-ring-color: transparent;

  background: $positive;
}

.zk-live-status-dot--active {
  animation: zk-live-status-dot-beat var(--zk-live-status-dot-duration)
    ease-in-out infinite;
  box-shadow: var(--zk-live-status-dot-box-shadow);

  &::before,
  &::after {
    content: "";
    position: absolute;
    background: var(--zk-live-status-dot-ring-background, transparent);
    border: var(--zk-live-status-dot-ring-border, 2px solid)
      var(--zk-live-status-dot-ring-color);
    border-radius: inherit;
    animation: zk-live-status-dot-pulse var(--zk-live-status-dot-duration)
      ease-out infinite;
  }

  &::before {
    inset: var(--zk-live-status-dot-before-inset);
  }

  &::after {
    inset: var(--zk-live-status-dot-after-inset);
    animation-delay: var(--zk-live-status-dot-second-wave-delay);
  }
}

@keyframes zk-live-status-dot-beat {
  0%,
  100% {
    transform: scale(1);
  }

  18% {
    transform: scale(1.12);
  }

  38% {
    transform: scale(1.08);
  }
}

@keyframes zk-live-status-dot-pulse {
  0% {
    opacity: 0.8;
    transform: scale(0.6);
  }

  70%,
  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .zk-live-status-dot--active {
    animation: none;

    &::before,
    &::after {
      animation: none;
      opacity: 0;
    }
  }
}
</style>
