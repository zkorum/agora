<template>
  <!-- @vue-expect-error Quasar q-page-sticky doesn't type onClick event handler -->
  <q-page-sticky
    v-touch-pan.mouse="handlePan"
    class="newContentPillSticky"
    position="top"
    :offset="[0, 20]"
    @click="handleClick"
  >
    <div
      class="pillMotion"
      :class="{
        dragging: isDragging,
        dismissing: isDismissing,
        snapBack: shouldAnimateOffset,
      }"
      :style="pillMotionStyle"
      @transitionend="handleTransitionEnd"
    >
      <ZKButton
        button-type="standardButton"
        rounded
        color="primary"
        no-caps
        unelevated
      >
        <div class="contentIcon">
          <q-icon name="mdi-arrow-up" />
          <div>{{ label }}</div>
        </div>
      </ZKButton>
    </div>
  </q-page-sticky>
</template>

<script setup lang="ts">
import type { TouchPanValue } from "quasar";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { computed, ref } from "vue";

const props = defineProps<{
  label: string;
  dismissible?: boolean;
}>();

const emit = defineEmits<{
  click: [];
  dismiss: [];
}>();

const DISMISS_DRAG_DISTANCE_PX = 44;
const DISMISS_EXIT_DISTANCE_PX = 120;

const didDismissByDrag = ref(false);
const shouldSuppressNextClick = ref(false);
const isDragging = ref(false);
const isDismissing = ref(false);
const shouldAnimateOffset = ref(false);
const dragOffsetX = ref(0);

const pillMotionStyle = computed(() => {
  const scale = isDragging.value ? 0.98 : 1;
  return {
    opacity: isDismissing.value ? "0" : "1",
    transform: `translateX(${String(dragOffsetX.value)}px) scale(${String(scale)})`,
  };
});

const handlePan: TouchPanValue = ({ distance, isFinal, isFirst, offset }) => {
  if (!props.dismissible || didDismissByDrag.value) {
    return;
  }

  if (isFirst === true) {
    didDismissByDrag.value = false;
    shouldSuppressNextClick.value = false;
    isDragging.value = true;
    shouldAnimateOffset.value = false;
  }

  dragOffsetX.value = offset?.x ?? 0;

  if (isFinal !== true) {
    return;
  }

  isDragging.value = false;
  const distanceX = distance?.x ?? 0;
  const distanceY = distance?.y ?? 0;
  shouldSuppressNextClick.value = distanceX > 4;
  if (distanceX >= DISMISS_DRAG_DISTANCE_PX && distanceX > distanceY) {
    didDismissByDrag.value = true;
    dismissHorizontally();
    return;
  }

  shouldAnimateOffset.value = true;
  dragOffsetX.value = 0;
};

function dismissHorizontally(): void {
  shouldAnimateOffset.value = true;
  isDismissing.value = true;
  dragOffsetX.value = dragOffsetX.value < 0
    ? -DISMISS_EXIT_DISTANCE_PX
    : DISMISS_EXIT_DISTANCE_PX;
}

function handleTransitionEnd(event: TransitionEvent): void {
  if (event.propertyName !== "transform" || !isDismissing.value) {
    return;
  }
  emit("dismiss");
}

function handleClick(): void {
  if (didDismissByDrag.value || shouldSuppressNextClick.value) {
    didDismissByDrag.value = false;
    shouldSuppressNextClick.value = false;
    return;
  }
  emit("click");
}
</script>

<style scoped lang="scss">
.newContentPillSticky {
  z-index: 3000;
}

.contentIcon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pillMotion {
  cursor: grab;
  will-change: transform, opacity;
}

.pillMotion.dragging {
  cursor: grabbing;
}

.pillMotion.snapBack,
.pillMotion.dismissing {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
</style>
