<template>
  <a
    v-if="safeHref !== undefined"
    class="project-action-button"
    :class="buttonClass"
    :href="safeHref"
    :target="target"
    :rel="rel"
    :aria-label="accessibleLabel"
  >
    <q-icon :name="iconName" size="1rem" />
    <span>{{ label }}</span>
  </a>

  <span
    v-else
    class="project-action-button"
    :class="buttonClass"
    :aria-label="accessibleLabel"
  >
    <q-icon :name="iconName" size="1rem" />
    <span>{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { ProjectActionButtonVariant } from "./projectPageTypes";
import { getSafeProjectHref } from "./projectUrlSafety";

interface ProjectActionButtonBaseProps {
  label: string;
  iconName: string;
  variant: ProjectActionButtonVariant;
  block: boolean;
  accessibleLabel: string | undefined;
}

type ProjectActionButtonProps = ProjectActionButtonBaseProps &
  (
    | {
        href: string;
        external: boolean;
        interactive: true;
      }
    | {
        href: undefined;
        external: false;
        interactive: false;
      }
  );

const props = defineProps<ProjectActionButtonProps>();

const safeHref = computed(() =>
  props.href === undefined ? undefined : getSafeProjectHref(props.href)
);
const isInteractive = computed(
  () => props.interactive && safeHref.value !== undefined
);
const buttonClass = computed(() => ({
  [`project-action-button--${props.variant}`]: true,
  "project-action-button--block": props.block,
  "project-action-button--interactive": isInteractive.value,
}));

const target = computed(() =>
  props.external && safeHref.value !== undefined ? "_blank" : undefined
);
const rel = computed(() =>
  props.external && safeHref.value !== undefined ? "noopener noreferrer" : undefined
);
</script>

<style scoped lang="scss">
.project-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0.7rem 1rem;
  border: 1px solid rgba($primary, 0.24);
  border-radius: 0.9rem;
  color: white;
  font-size: 0.9rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  text-align: center;
  text-decoration: none;
  box-shadow: 0 0.55rem 1.2rem rgba($primary, 0.24);
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease,
    color 150ms ease;
}

.project-action-button--interactive {
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid rgba($primary, 0.24);
    outline-offset: 3px;
  }
}

.project-action-button:not(.project-action-button--interactive) {
  cursor: inherit;
  pointer-events: none;
}

.project-action-button--block {
  width: 100%;
}

.project-action-button--primary {
  background: linear-gradient(90deg, #6b4eff 0%, #4f92f6 50%, #6b4eff 100%);
  background-size: 200% 100%;
  animation: project-action-button-gradient 4.8s ease-in-out infinite alternate;
}

.project-action-button--outline {
  border-color: rgba($primary, 0.28);
  background: rgba(white, 0.86);
  color: $primary;
  box-shadow: 0 0.35rem 0.9rem rgba(10, 7, 20, 0.04);
}

.project-action-button--muted {
  border-color: rgba($ink-light, 0.12);
  background: $app-background-color;
  color: $ink-light;
  box-shadow: none;
}

@media (hover: hover) and (pointer: fine) {
  .project-action-button--interactive.project-action-button--primary:hover {
    transform: translateY(-1px);
    border-color: rgba(white, 0.38);
    box-shadow:
      0 0.65rem 1.45rem rgba($primary, 0.3),
      0 0 0 1px rgba(white, 0.4) inset;
  }

  .project-action-button--interactive.project-action-button--outline:hover {
    transform: translateY(-1px);
    border-color: rgba($primary, 0.42);
    background: white;
    color: $primary-dark;
    box-shadow:
      0 0.55rem 1.35rem rgba($primary, 0.16),
      0 0 0 1px rgba(white, 0.72) inset;
  }

  .project-action-button--interactive.project-action-button--muted:hover {
    border-color: rgba($ink-light, 0.22);
    background: white;
    color: $ink-darker;
    box-shadow: 0 0.35rem 0.9rem rgba(10, 7, 20, 0.06);
  }
}

.project-action-button--interactive:active {
  transform: translateY(3px) scale(0.985);
  box-shadow:
    0 0.12rem 0.35rem rgba($primary, 0.18),
    0 0 0 1px rgba(10, 7, 20, 0.04) inset;
  transition-duration: 70ms;
}

@media (prefers-reduced-motion: reduce) {
  .project-action-button {
    animation: none;
    transition: none;
  }
}

@keyframes project-action-button-gradient {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 100% 50%;
  }
}
</style>
