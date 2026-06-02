<template>
  <div class="checkpoint-timeline">
    <div class="checkpoint-timeline__body">
      <div class="checkpoint-timeline__step-button-rail">
        <button
          type="button"
          class="checkpoint-timeline__step-button"
          :disabled="!canStepBackward"
          :aria-label="props.previousLabel"
          @click="selectTimelineStepByOffset(-1)"
        >
          <q-icon :name="previousIcon" size="1.15rem" />
        </button>
      </div>

      <div
        ref="timelineRef"
        class="checkpoint-timeline__scroller"
        :class="{
          'checkpoint-timeline__scroller--with-detail':
            hasSelectedCheckpointDetail,
          'checkpoint-timeline__scroller--dragging': isTimelineDragging,
        }"
        :aria-label="props.title"
        @wheel="handleTimelineWheel"
        @scroll="saveTimelineScrollPosition"
        @pointerdown="handleTimelinePointerDown"
        @click.capture="handleTimelineClickCapture"
      >
        <div class="checkpoint-timeline__track">
          <button
            v-if="showDisabledStartMarker"
            type="button"
            class="checkpoint-timeline__marker checkpoint-timeline__marker--disabled-start"
            disabled
          >
            <span class="checkpoint-timeline__dot" />
            <span class="checkpoint-timeline__label">
              {{ props.startLabel }}
            </span>
          </button>

          <button
            v-for="(checkpoint, index) in displayedCheckpoints"
            :key="checkpoint.conversationViewSnapshotId"
            :ref="
              (el) =>
                setMarkerRef({
                  el,
                  markerKey: checkpoint.conversationViewSnapshotId,
                })
            "
            type="button"
            class="checkpoint-timeline__marker"
            :class="{
              'checkpoint-timeline__marker--selected':
                isCheckpointSelected(checkpoint),
            }"
            @click="
              emit('selectCheckpoint', checkpoint.conversationViewSnapshotId)
            "
          >
            <span class="checkpoint-timeline__dot" />
            <span
              v-if="getMarkerLabel({ index }) !== undefined"
              class="checkpoint-timeline__label"
            >
              {{ getMarkerLabel({ index }) }}
            </span>
            <span
              v-if="isCheckpointSelected(checkpoint) && index !== 0"
              class="checkpoint-timeline__marker-detail"
            >
              <span
                v-if="getSelectedTimeLabel({ checkpoint, index }) !== undefined"
                class="checkpoint-timeline__marker-time"
              >
                {{ getSelectedTimeLabel({ checkpoint, index }) }}
              </span>
              <span
                v-if="getCheckpointReasonLabels(checkpoint).length > 0"
                class="checkpoint-timeline__marker-reasons"
              >
                {{ getCheckpointReasonLabels(checkpoint).join(" · ") }}
              </span>
            </span>
          </button>

          <button
            :ref="
              (el) =>
                setMarkerRef({
                  el,
                  markerKey: 'live',
                })
            "
            type="button"
            class="checkpoint-timeline__marker"
            :class="{
              'checkpoint-timeline__marker--live': !props.isLiveClosed,
              'checkpoint-timeline__marker--selected': isLiveTimelineSelected,
              'checkpoint-timeline__marker--live-active': isLivePulseActive,
            }"
            @click="emit('selectLive')"
          >
            <span class="checkpoint-timeline__dot" />
            <span class="checkpoint-timeline__label">
              {{ props.nowLabel }}
            </span>
          </button>
        </div>
      </div>

      <div class="checkpoint-timeline__step-button-rail">
        <button
          type="button"
          class="checkpoint-timeline__step-button"
          :disabled="!canStepForward"
          :aria-label="props.nextLabel"
          @click="selectTimelineStepByOffset(1)"
        >
          <q-icon :name="nextIcon" size="1.15rem" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { getHorizontalScrollMax } from "src/composables/ui/horizontalDragScrollLogic";
import { useHorizontalDragScroll } from "src/composables/ui/useHorizontalDragScroll";
import type { AnalysisCheckpoint } from "src/shared/types/dto";
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";

import type {
  CheckpointTimelineReasonFormatter,
  CheckpointTimelineReasonsFormatter,
} from "./CheckpointTimeline.types";

type CheckpointMarkerKey = number | "live";

const props = withDefaults(
  defineProps<{
    checkpoints: AnalysisCheckpoint[];
    selectedCheckpointId: number | undefined;
    isLiveSelected: boolean;
    isLivePaused: boolean;
    isLatestCheckpointLive: boolean;
    isLiveClosed: boolean;
    title: string;
    startLabel: string;
    nowLabel: string;
    previousLabel: string;
    nextLabel: string;
    formatReason: CheckpointTimelineReasonFormatter;
    formatReasons?: CheckpointTimelineReasonsFormatter;
    maxReasonCount?: number;
  }>(),
  {
    formatReasons: undefined,
    maxReasonCount: 3,
  }
);

const emit = defineEmits<{
  selectCheckpoint: [checkpointViewSnapshotId: number];
  selectLive: [];
}>();

const $q = useQuasar();
const timelineRef = ref<HTMLElement | null>(null);
const savedTimelineScrollLeft = ref<number | undefined>();
const markerElements = new Map<CheckpointMarkerKey, HTMLElement>();

const {
  isDragging: isTimelineDragging,
  handlePointerDown: handleTimelinePointerDown,
  handleClickCapture: handleTimelineClickCapture,
} = useHorizontalDragScroll({ scrollContainer: timelineRef });

const hasRequestedUnavailableCheckpoint = computed(() => {
  if (props.selectedCheckpointId === undefined || props.isLiveSelected) {
    return false;
  }

  return !props.checkpoints.some(
    (checkpoint) =>
      checkpoint.conversationViewSnapshotId === props.selectedCheckpointId
  );
});

const effectiveCheckpoints = computed(() => {
  if (hasRequestedUnavailableCheckpoint.value) {
    return [];
  }

  return props.checkpoints;
});

const latestCheckpoint = computed(() => {
  if (effectiveCheckpoints.value.length === 0) {
    return undefined;
  }

  return effectiveCheckpoints.value[effectiveCheckpoints.value.length - 1];
});

const displayedCheckpoints = computed(() => {
  if (!props.isLatestCheckpointLive) {
    return effectiveCheckpoints.value;
  }

  return effectiveCheckpoints.value.slice(0, -1);
});

const showDisabledStartMarker = computed(
  () => displayedCheckpoints.value.length === 0
);

const isLiveTimelineSelected = computed(
  () =>
    props.isLiveSelected ||
    hasRequestedUnavailableCheckpoint.value ||
    (props.isLatestCheckpointLive &&
      props.selectedCheckpointId ===
        latestCheckpoint.value?.conversationViewSnapshotId)
);

const isLivePulseActive = computed(
  () =>
    isLiveTimelineSelected.value &&
    props.isLiveSelected &&
    !props.isLivePaused &&
    !props.isLiveClosed
);

const timelineStepKeys = computed<CheckpointMarkerKey[]>(() => [
  ...displayedCheckpoints.value.map(
    (checkpoint) => checkpoint.conversationViewSnapshotId
  ),
  "live",
]);

const selectedTimelineStepIndex = computed(() =>
  getSelectedTimelineStepIndex()
);

const canStepBackward = computed(() => selectedTimelineStepIndex.value > 0);

const canStepForward = computed(
  () => selectedTimelineStepIndex.value < timelineStepKeys.value.length - 1
);

const hasSelectedCheckpointDetail = computed(() => {
  if (
    props.selectedCheckpointId === undefined ||
    isLiveTimelineSelected.value
  ) {
    return false;
  }

  return displayedCheckpoints.value.some(
    (checkpoint, index) =>
      index > 0 &&
      checkpoint.conversationViewSnapshotId === props.selectedCheckpointId
  );
});

const previousIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-right" : "mdi-chevron-left"
);

const nextIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);

function isCheckpointSelected(checkpoint: AnalysisCheckpoint): boolean {
  return props.selectedCheckpointId === checkpoint.conversationViewSnapshotId;
}

function getCheckpointReasonLabels(checkpoint: AnalysisCheckpoint): string[] {
  if (props.formatReasons !== undefined) {
    return props
      .formatReasons(checkpoint.reasons)
      .slice(0, props.maxReasonCount);
  }

  const labels = new Set<string>();
  for (const reason of checkpoint.reasons) {
    const formattedReason = props.formatReason(reason);
    if (formattedReason !== undefined) {
      labels.add(formattedReason);
    }
  }

  return Array.from(labels).slice(0, props.maxReasonCount);
}

function formatElapsedDuration(diffMs: number): string {
  const minuteCount = Math.max(0, Math.round(diffMs / 60000));
  if (minuteCount < 60) {
    return `${String(minuteCount)}m`;
  }

  const hourCount = Math.round(minuteCount / 60);
  if (hourCount < 48) {
    return `${String(hourCount)}h`;
  }

  const dayCount = Math.round(hourCount / 24);
  if (dayCount < 14) {
    return `${String(dayCount)}d`;
  }

  const weekCount = Math.round(dayCount / 7);
  return `${String(weekCount)}w`;
}

function getCheckpointElapsedLabel(checkpoint: AnalysisCheckpoint): string {
  const firstCheckpoint = props.checkpoints[0];
  if (
    firstCheckpoint === undefined ||
    firstCheckpoint.conversationViewSnapshotId ===
      checkpoint.conversationViewSnapshotId
  ) {
    return props.startLabel;
  }

  const diffMs = Math.max(
    new Date(checkpoint.activatedAt).getTime() -
      new Date(firstCheckpoint.activatedAt).getTime(),
    0
  );
  return `+${formatElapsedDuration(diffMs)}`;
}

function getMarkerLabel({ index }: { index: number }): string | undefined {
  if (index === 0) {
    return props.startLabel;
  }
  return undefined;
}

function getSelectedTimeLabel({
  checkpoint,
  index,
}: {
  checkpoint: AnalysisCheckpoint;
  index: number;
}): string | undefined {
  if (!isCheckpointSelected(checkpoint) || index === 0) {
    return undefined;
  }

  return getCheckpointElapsedLabel(checkpoint);
}

function getSelectedTimelineStepIndex(): number {
  const lastIndex = timelineStepKeys.value.length - 1;
  if (
    isLiveTimelineSelected.value ||
    props.selectedCheckpointId === undefined
  ) {
    return lastIndex;
  }

  const selectedIndex = timelineStepKeys.value.indexOf(
    props.selectedCheckpointId
  );
  return selectedIndex >= 0 ? selectedIndex : lastIndex;
}

function selectTimelineStepByOffset(offset: number): void {
  const nextIndex = Math.min(
    Math.max(getSelectedTimelineStepIndex() + offset, 0),
    timelineStepKeys.value.length - 1
  );
  const nextKey = timelineStepKeys.value[nextIndex];
  if (nextKey === undefined) {
    return;
  }

  if (nextKey === "live") {
    emit("selectLive");
    return;
  }

  emit("selectCheckpoint", nextKey);
}

function setMarkerRef({
  el,
  markerKey,
}: {
  el: Element | ComponentPublicInstance | null;
  markerKey: CheckpointMarkerKey;
}): void {
  if (el instanceof HTMLElement) {
    markerElements.set(markerKey, el);
    return;
  }

  markerElements.delete(markerKey);
}

function scrollTimelineMarkerIntoView({
  timeline,
  marker,
}: {
  timeline: HTMLElement;
  marker: HTMLElement;
}): void {
  const timelineRect = timeline.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const markerCenter =
    markerRect.left -
    timelineRect.left +
    timeline.scrollLeft +
    markerRect.width / 2;
  const nextLeft = markerCenter - timeline.clientWidth / 2;

  timeline.scrollTo({
    left: Math.max(0, nextLeft),
    behavior: "auto",
  });
}

function scrollSelectedCheckpointIntoView(): void {
  const timeline = timelineRef.value;
  if (timeline === null) {
    return;
  }

  if (
    isLiveTimelineSelected.value ||
    props.selectedCheckpointId === undefined
  ) {
    const liveMarker = markerElements.get("live");
    if (liveMarker === undefined) {
      timeline.scrollTo({ left: timeline.scrollWidth, behavior: "auto" });
      return;
    }

    scrollTimelineMarkerIntoView({ timeline, marker: liveMarker });
    return;
  }

  const selectedMarker = markerElements.get(props.selectedCheckpointId);
  if (selectedMarker === undefined) {
    return;
  }

  scrollTimelineMarkerIntoView({ timeline, marker: selectedMarker });
}

function saveTimelineScrollPosition(): void {
  const timeline = timelineRef.value;
  if (timeline === null) {
    return;
  }

  savedTimelineScrollLeft.value = timeline.scrollLeft;
}

function restoreTimelineScrollPosition(): void {
  const timeline = timelineRef.value;
  const savedScrollLeft = savedTimelineScrollLeft.value;
  if (timeline === null || savedScrollLeft === undefined) {
    return;
  }

  timeline.scrollTo({
    left: Math.min(savedScrollLeft, getTimelineMaxScrollLeft(timeline)),
    behavior: "auto",
  });
}

function getTimelineMaxScrollLeft(timeline: HTMLElement): number {
  return getHorizontalScrollMax({
    scrollWidth: timeline.scrollWidth,
    clientWidth: timeline.clientWidth,
  });
}

function getWheelDeltaPixels({
  event,
  timeline,
}: {
  event: WheelEvent;
  timeline: HTMLElement;
}): number {
  const rawDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return rawDelta * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return rawDelta * timeline.clientWidth;
  }

  return rawDelta;
}

function canScrollTimelineBy({
  timeline,
  delta,
}: {
  timeline: HTMLElement;
  delta: number;
}): boolean {
  const maxScrollLeft = getTimelineMaxScrollLeft(timeline);
  if (maxScrollLeft === 0 || delta === 0) {
    return false;
  }

  if (delta < 0) {
    return timeline.scrollLeft > 0;
  }

  return timeline.scrollLeft < maxScrollLeft;
}

function handleTimelineWheel(event: WheelEvent): void {
  if (event.ctrlKey) {
    return;
  }

  const timeline = timelineRef.value;
  if (timeline === null) {
    return;
  }

  const delta = getWheelDeltaPixels({ event, timeline });
  if (!canScrollTimelineBy({ timeline, delta })) {
    return;
  }

  event.preventDefault();
  timeline.scrollLeft += delta;
}

watch(
  () => ({
    checkpoint: props.selectedCheckpointId,
    checkpointCount: props.checkpoints.length,
    isLiveSelected: props.isLiveSelected,
    isLatestCheckpointLive: props.isLatestCheckpointLive,
    showDisabledStartMarker: showDisabledStartMarker.value,
  }),
  async () => {
    await nextTick();
    scrollSelectedCheckpointIntoView();
  },
  { immediate: true }
);

onMounted(async () => {
  await nextTick();
  scrollSelectedCheckpointIntoView();
});

onActivated(async () => {
  await nextTick();
  restoreTimelineScrollPosition();
});

onDeactivated(saveTimelineScrollPosition);
</script>

<style lang="scss" scoped>
.checkpoint-timeline {
  --checkpoint-live-pulse-headroom: 1rem;
  --checkpoint-scroller-top-padding: calc(
    0.25rem + var(--checkpoint-live-pulse-headroom)
  );
  --checkpoint-dot-size: 0.9rem;
  --checkpoint-dot-center-offset: 0.45rem;
  --checkpoint-track-line-size: 2px;
  --checkpoint-track-line-half-size: 1px;

  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.checkpoint-timeline__body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.4rem;
}

.checkpoint-timeline__step-button-rail {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--checkpoint-dot-size);
  margin-top: var(--checkpoint-scroller-top-padding);
}

.checkpoint-timeline__step-button {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid #d8d6de;
  border-radius: 999px;
  background: white;
  color: #6d6a74;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: #6b4eff;
    color: #6b4eff;
  }

  &:disabled {
    cursor: default;
    opacity: 0.32;
  }
}

.checkpoint-timeline__scroller {
  overflow-x: auto;
  overflow-y: hidden;
  direction: ltr;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  cursor: grab;
  padding: var(--checkpoint-scroller-top-padding) 0 0.35rem;

  &::-webkit-scrollbar {
    display: none;
  }
}

.checkpoint-timeline__scroller--dragging {
  scroll-snap-type: none;
  cursor: grabbing;
  user-select: none;

  .checkpoint-timeline__marker {
    cursor: grabbing;
  }
}

.checkpoint-timeline__scroller--with-detail {
  padding-bottom: 1.6rem;
}

.checkpoint-timeline__track {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-width: max-content;
  gap: 0.35rem;
  padding: 0 0.8rem;

  &::before {
    content: "";
    position: absolute;
    top: calc(
      var(--checkpoint-dot-center-offset) - var(
          --checkpoint-track-line-half-size
        )
    );
    inset-inline: 1.1rem;
    height: var(--checkpoint-track-line-size);
    background: #d8d6de;
  }
}

.checkpoint-timeline__marker {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 2.25rem;
  gap: 0.3rem;
  border: 0;
  background: transparent;
  color: #6d6a74;
  cursor: pointer;
  padding: 0;
  font: inherit;
  scroll-snap-align: center;

  &:not(:disabled):hover,
  &:not(:disabled):focus-visible {
    color: #6b4eff;
  }

  &:disabled {
    cursor: default;
    color: #9b98a3;
  }
}

.checkpoint-timeline__dot {
  position: relative;
  width: var(--checkpoint-dot-size);
  height: var(--checkpoint-dot-size);
  border: 2px solid #d8d6de;
  border-radius: 999px;
  background: white;
}

.checkpoint-timeline__marker--disabled-start {
  .checkpoint-timeline__dot {
    background: #f5f5f7;
  }
}

.checkpoint-timeline__label {
  max-width: 4.5rem;
  font-size: 0.75rem;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
}

.checkpoint-timeline__marker-detail {
  position: absolute;
  top: 1.65rem;
  inset-inline-start: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08rem;
  width: 9rem;
  transform: translateX(-50%);
  pointer-events: none;
}

.checkpoint-timeline__marker-time {
  color: #6b4eff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.05;
  text-align: center;
  white-space: nowrap;
}

.checkpoint-timeline__marker-reasons {
  color: #6b4eff;
  font-size: 0.6rem;
  font-weight: 600;
  line-height: 1.15;
  max-width: 9rem;
  text-align: center;
}

.checkpoint-timeline__marker--selected {
  color: #6b4eff;
  font-weight: 600;

  .checkpoint-timeline__dot {
    border-color: #6b4eff;
    background: #6b4eff;
    box-shadow: 0 0 0 4px rgb(107 78 255 / 14%);
  }
}

.checkpoint-timeline__marker--live {
  min-width: 3rem;

  .checkpoint-timeline__dot {
    border-color: #24966d;
  }

  &.checkpoint-timeline__marker--selected {
    color: #137a55;

    .checkpoint-timeline__dot {
      border-color: #24966d;
      background: #24966d;
      box-shadow: 0 0 0 4px rgb(36 150 109 / 14%);
    }
  }
}

.checkpoint-timeline__marker--live-active {
  .checkpoint-timeline__dot {
    animation: checkpoint-live-dot-beat 2s ease-in-out infinite;
    box-shadow:
      0 0 0 4px rgb(36 150 109 / 15%),
      0 0 12px rgb(36 150 109 / 24%);
  }

  .checkpoint-timeline__dot::before,
  .checkpoint-timeline__dot::after {
    content: "";
    position: absolute;
    border: 2px solid rgb(36 150 109 / 34%);
    border-radius: inherit;
    animation: checkpoint-live-pulse 2s ease-out infinite;
  }

  .checkpoint-timeline__dot::before {
    inset: -0.42rem;
  }

  .checkpoint-timeline__dot::after {
    inset: -0.72rem;
    animation-delay: 0.5s;
  }

  .checkpoint-timeline__label {
    color: #0f6c4b;
    font-weight: 700;
    text-shadow: 0 0 9px rgb(36 150 109 / 18%);
  }
}

@keyframes checkpoint-live-dot-beat {
  0%,
  100% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.08);
  }
}

@keyframes checkpoint-live-pulse {
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
  .checkpoint-timeline__marker--live-active {
    .checkpoint-timeline__dot {
      animation: none;
    }

    .checkpoint-timeline__label {
      text-shadow: none;
    }

    .checkpoint-timeline__dot::before,
    .checkpoint-timeline__dot::after {
      animation: none;
      opacity: 0;
    }
  }
}
</style>
