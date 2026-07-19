<template>
  <div
    class="dialogContainer"
    :class="{ 'dialogContainer--dragging': dragState !== undefined }"
    :style="dragStyle"
  >
    <button
      ref="dragCloseButton"
      v-close-popup
      type="button"
      class="drag-close-button"
      tabindex="-1"
      aria-hidden="true"
    />
    <div
      class="dialog-drag-handle"
      aria-hidden="true"
      @pointerdown="onPointerDown"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
    >
      <span class="dialog-drag-handle__bar" />
    </div>
    <div v-if="title || showCloseButton" class="dialog-header">
      <div class="dialog-title-row">
        <slot name="leadingAction" />
        <div v-if="title" class="dialog-title">{{ title }}</div>
        <q-btn
          v-close-popup
          flat
          round
          dense
          icon="mdi-close"
          size="sm"
          class="close-btn"
          :aria-label="$q.lang.label.close"
        />
      </div>
      <div v-if="subtitle || $slots.subtitleAction" class="dialog-subtitle-row">
        <div v-if="subtitle" class="dialog-subtitle">{{ subtitle }}</div>
        <slot name="subtitleAction" />
      </div>
    </div>
    <div class="dialog-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClosePopup, useQuasar } from "quasar";
import type { CSSProperties } from "vue";
import { computed, onBeforeUnmount, ref } from "vue";

withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    showCloseButton?: boolean;
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    showCloseButton: false,
  }
);

const vClosePopup = ClosePopup;
const $q = useQuasar();

const DRAG_DISMISS_THRESHOLD_PX = 72;

interface DragState {
  startY: number;
}

const dragCloseButton = ref<HTMLButtonElement>();
const dragState = ref<DragState>();
const dragOffsetY = ref(0);

const dragStyle = computed<CSSProperties>(() => ({
  transform:
    dragOffsetY.value > 0
      ? `translateY(${String(dragOffsetY.value)}px)`
      : undefined,
}));

function getTouchClientY(event: TouchEvent): number | undefined {
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch?.clientY;
}

function startDrag(clientY: number): void {
  dragState.value = { startY: clientY };
  dragOffsetY.value = 0;
}

function updateDrag(clientY: number): void {
  const state = dragState.value;
  if (state === undefined) {
    return;
  }

  dragOffsetY.value = Math.max(0, clientY - state.startY);
}

function finishDrag(): void {
  if (dragState.value === undefined) {
    return;
  }

  const shouldDismiss = dragOffsetY.value >= DRAG_DISMISS_THRESHOLD_PX;
  dragState.value = undefined;
  dragOffsetY.value = 0;

  if (shouldDismiss) {
    dragCloseButton.value?.click();
  }
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return;
  }

  startDrag(event.clientY);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerEnd, { once: true });
  window.addEventListener("pointercancel", onPointerEnd, { once: true });
}

function onPointerMove(event: PointerEvent): void {
  updateDrag(event.clientY);
}

function onPointerEnd(): void {
  window.removeEventListener("pointermove", onPointerMove);
  finishDrag();
}

function onMouseDown(event: MouseEvent): void {
  if (window.PointerEvent !== undefined || event.button !== 0) {
    return;
  }

  startDrag(event.clientY);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseEnd, { once: true });
}

function onMouseMove(event: MouseEvent): void {
  updateDrag(event.clientY);
}

function onMouseEnd(): void {
  window.removeEventListener("mousemove", onMouseMove);
  finishDrag();
}

function onTouchStart(event: TouchEvent): void {
  if (window.PointerEvent !== undefined) {
    return;
  }

  const clientY = getTouchClientY(event);
  if (clientY === undefined) {
    return;
  }

  startDrag(clientY);
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { once: true });
  window.addEventListener("touchcancel", onTouchEnd, { once: true });
}

function onTouchMove(event: TouchEvent): void {
  const clientY = getTouchClientY(event);
  if (clientY === undefined) {
    return;
  }

  event.preventDefault();
  updateDrag(clientY);
}

function onTouchEnd(): void {
  window.removeEventListener("touchmove", onTouchMove);
  finishDrag();
}

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("touchmove", onTouchMove);
});
</script>

<style lang="scss" scoped>
.dialogContainer {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  background-color: white;
  border-radius: 25px 25px 0 0;
  width: min(30rem, 100%);
  max-height: 62vh;
  max-height: 62dvh;
  overflow: hidden;
  transition: transform 160ms ease-out;
  will-change: transform;

  @media (min-width: $breakpoint-sm-min) {
    gap: 1rem;
    padding: 2rem;
    max-height: 85dvh;
  }
}

.dialog-body {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (min-width: $breakpoint-sm-min) {
    gap: 1rem;
  }
}

.dialogContainer--dragging {
  transition: none;
}

.drag-close-button {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip: rect(0 0 0 0);
}

.dialog-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1rem;
  margin: -0.7rem 0 -0.15rem;
  touch-action: none;
  cursor: grab;
  flex-shrink: 0;
}

.dialog-drag-handle__bar {
  display: block;
  width: 2.75rem;
  height: 0.25rem;
  border-radius: 999px;
  background: #d8d6de;
}

.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex-shrink: 0;
}

.dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.dialog-title {
  flex: 1;
  min-width: 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.dialog-subtitle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dialog-subtitle {
  color: $color-text-weak;
  font-size: 0.85rem;
  line-height: 1.3;
  min-width: 0;
}

.close-btn {
  margin-inline-start: auto;
  color: $color-text-weak;
  flex-shrink: 0;
}
</style>
