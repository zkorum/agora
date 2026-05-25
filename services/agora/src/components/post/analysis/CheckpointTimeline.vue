<template>
  <div v-if="props.checkpoints.length > 0" class="checkpoint-timeline">
    <div class="checkpoint-timeline__body">
      <button
        type="button"
        class="checkpoint-timeline__step-button"
        :disabled="!canStepBackward"
        :aria-label="props.previousLabel"
        @click="selectTimelineStepByOffset(-1)"
      >
        <q-icon :name="previousIcon" size="1.15rem" />
      </button>

      <div
        ref="timelineRef"
        class="checkpoint-timeline__scroller"
        :class="{
          'checkpoint-timeline__scroller--with-detail':
            hasSelectedCheckpointDetail,
        }"
        :aria-label="props.title"
      >
        <div class="checkpoint-timeline__track">
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
            class="checkpoint-timeline__marker checkpoint-timeline__marker--live"
            :class="{
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
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import type { AnalysisCheckpoint } from "src/shared/types/dto";
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
} from "vue";

import type { CheckpointTimelineReasonFormatter } from "./CheckpointTimeline.types";

type CheckpointMarkerKey = number | "live";

const props = withDefaults(
  defineProps<{
    checkpoints: AnalysisCheckpoint[];
    selectedCheckpointId: number | undefined;
    isLiveSelected: boolean;
    isLivePaused: boolean;
    isLatestCheckpointLive: boolean;
    title: string;
    startLabel: string;
    nowLabel: string;
    previousLabel: string;
    nextLabel: string;
    formatReason: CheckpointTimelineReasonFormatter;
    maxReasonCount?: number;
  }>(),
  {
    maxReasonCount: 3,
  }
);

const emit = defineEmits<{
  selectCheckpoint: [checkpointViewSnapshotId: number];
  selectLive: [];
}>();

const $q = useQuasar();
const timelineRef = ref<HTMLElement | null>(null);
const markerElements = new Map<CheckpointMarkerKey, HTMLElement>();

const latestCheckpoint = computed(() => {
  if (props.checkpoints.length === 0) {
    return undefined;
  }

  return props.checkpoints[props.checkpoints.length - 1];
});

const displayedCheckpoints = computed(() => {
  if (!props.isLatestCheckpointLive) {
    return props.checkpoints;
  }

  return props.checkpoints.slice(0, -1);
});

const isLiveTimelineSelected = computed(
  () =>
    props.isLiveSelected ||
    (props.isLatestCheckpointLive &&
      props.selectedCheckpointId ===
        latestCheckpoint.value?.conversationViewSnapshotId)
);

const isLivePulseActive = computed(
  () =>
    isLiveTimelineSelected.value && props.isLiveSelected && !props.isLivePaused
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

watch(
  () => ({
    checkpoint: props.selectedCheckpointId,
    checkpointCount: props.checkpoints.length,
    isLiveSelected: props.isLiveSelected,
    isLatestCheckpointLive: props.isLatestCheckpointLive,
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
</script>

<style lang="scss" scoped>
.checkpoint-timeline {
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

.checkpoint-timeline__step-button {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  margin-top: 0.35rem;
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
  padding: 0.25rem 0 0.35rem;

  &::-webkit-scrollbar {
    display: none;
  }
}

.checkpoint-timeline__scroller--with-detail {
  padding-bottom: 3.2rem;
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
    top: 0.45rem;
    inset-inline: 1.1rem;
    height: 2px;
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

  &:hover,
  &:focus-visible {
    color: #6b4eff;
  }
}

.checkpoint-timeline__dot {
  position: relative;
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid #d8d6de;
  border-radius: 999px;
  background: white;
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
  top: 1.95rem;
  inset-inline-start: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.12rem;
  width: 9rem;
  transform: translateX(-50%);
  pointer-events: none;
}

.checkpoint-timeline__marker-time {
  color: #6b4eff;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.05;
  text-align: center;
  white-space: nowrap;
}

.checkpoint-timeline__marker-reasons {
  color: #6b4eff;
  font-size: 0.64rem;
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
