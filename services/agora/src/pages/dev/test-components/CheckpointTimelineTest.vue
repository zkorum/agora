<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-sliders-h section-icon"></i>
        <span>{{ t("title") }}</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        {{ t("description") }}
      </p>

      <div class="control-panel">
        <div class="control-buttons">
          <PrimeButton :label="t('smallSet')" size="small" @click="setCheckpointCount(4)" />
          <PrimeButton :label="t('manySet')" size="small" @click="setCheckpointCount(40)" />
          <PrimeButton :label="t('addCheckpoint')" size="small" @click="addCheckpoint" />
          <PrimeButton
            :label="t('removeCheckpoint')"
            size="small"
            severity="secondary"
            @click="removeCheckpoint"
          />
          <PrimeButton :label="t('live')" size="small" @click="selectLive" />
          <PrimeButton
            :label="t('freezeLatest')"
            size="small"
            severity="info"
            @click="freezeLatest"
          />
        </div>

        <label class="checkbox-row">
          <input v-model="latestIsCurrent" type="checkbox" />
          <span>{{ t("latestIsCurrent") }}</span>
        </label>

        <div class="reason-controls">
          <div class="control-label">{{ t("reasonOptions") }}</div>
          <label
            v-for="reasonOption in reasonOptions"
            :key="reasonOption.reason"
            class="checkbox-row"
          >
            <input
              :checked="selectedReasons.includes(reasonOption.reason)"
              type="checkbox"
              @change="toggleReason(reasonOption.reason)"
            />
            <span>{{ reasonOption.label }}</span>
          </label>
        </div>
      </div>

      <div class="timeline-preview">
        <CheckpointTimeline
          :checkpoints="checkpoints"
          :selected-checkpoint-id="selectedCheckpointId"
          :is-live-selected="selectedCheckpointId === undefined"
          :is-live-paused="false"
          :is-latest-checkpoint-live="latestIsCurrent"
          :title="t('checkpointTimeline')"
          :start-label="t('start')"
          :now-label="t('now')"
          :previous-label="t('previous')"
          :next-label="t('next')"
          :format-reason="formatReason"
          @select-checkpoint="selectCheckpoint"
          @select-live="selectLive"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import type {
  CheckpointTimelineReason,
  CheckpointTimelineReasonPayload,
} from "src/components/post/analysis/CheckpointTimeline.types";
import CheckpointTimeline from "src/components/post/analysis/CheckpointTimeline.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisCheckpoint } from "src/shared/types/dto";
import { computed, ref, watch } from "vue";

import {
  type CheckpointTimelineTestTranslations,
  checkpointTimelineTestTranslations,
} from "./CheckpointTimelineTest.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

const { t } = useComponentI18n<CheckpointTimelineTestTranslations>(
  checkpointTimelineTestTranslations
);

const checkpointCount = ref(4);
const selectedCheckpointId = ref<number | undefined>(1001);
const latestIsCurrent = ref(true);
const selectedReasons = ref<CheckpointTimelineReason[]>([
  "first_displayable_analysis",
  "first_group_count_available",
  "major_participation_milestone",
]);

const reasonOptions = computed<
  { reason: CheckpointTimelineReason; label: string }[]
>(() => [
  { reason: "first_displayable_analysis", label: t("firstAnalysis") },
  { reason: "first_group_count_available", label: t("groupCountAvailable") },
  { reason: "default_group_count_changed", label: t("defaultChanged") },
  { reason: "major_participation_milestone", label: t("participantMilestone") },
  { reason: "major_vote_milestone", label: t("voteMilestone") },
  { reason: "conversation_closed", label: t("conversationClosed") },
  { reason: "conversation_reopened", label: t("conversationReopened") },
]);

const baseTime = new Date("2026-05-23T00:00:00Z");

const checkpoints = computed<AnalysisCheckpoint[]>(() =>
  Array.from({ length: checkpointCount.value }, (_value, index) => {
    const id = 1000 + index;
    const activatedAt = new Date(baseTime.getTime() + index * 17 * 60 * 1000);
    const reasons = selectedReasons.value
      .filter((_reason, reasonIndex) => index === 0 || (index + reasonIndex) % 2 === 0)
      .map((reason) => ({
        reason,
        groupCount:
          reason === "default_group_count_changed" ||
          reason === "first_group_count_available"
            ? 2 + (index % 5)
            : null,
        previousGroupCount:
          reason === "default_group_count_changed" ? 2 + ((index + 4) % 5) : null,
        participantCount:
          reason === "major_participation_milestone" ? 20 + index * 3 : null,
        participantMilestone:
          reason === "major_participation_milestone" ? 20 + index * 3 : null,
        voteCount: reason === "major_vote_milestone" ? 100 + index * 50 : null,
        voteMilestone: reason === "major_vote_milestone" ? 100 + index * 50 : null,
      }));

    return {
      conversationViewSnapshotId: id,
      createdAt: activatedAt,
      activatedAt,
      opinionCount: 10 + index,
      voteCount: 100 + index * 50,
      participantCount: 20 + index * 3,
      reasons,
    };
  })
);

watch(checkpoints, (currentCheckpoints) => {
  if (
    selectedCheckpointId.value !== undefined &&
    !currentCheckpoints.some(
      (checkpoint) => checkpoint.conversationViewSnapshotId === selectedCheckpointId.value
    )
  ) {
    selectedCheckpointId.value = currentCheckpoints.at(-1)?.conversationViewSnapshotId;
  }
});

function setCheckpointCount(count: number): void {
  checkpointCount.value = count;
}

function addCheckpoint(): void {
  checkpointCount.value += 1;
}

function removeCheckpoint(): void {
  checkpointCount.value = Math.max(1, checkpointCount.value - 1);
}

function selectCheckpoint(checkpointViewSnapshotId: number): void {
  selectedCheckpointId.value = checkpointViewSnapshotId;
}

function selectLive(): void {
  selectedCheckpointId.value = undefined;
}

function freezeLatest(): void {
  selectedCheckpointId.value = checkpoints.value.at(-1)?.conversationViewSnapshotId;
}

function formatReason(
  reason: CheckpointTimelineReasonPayload
): string | undefined {
  switch (reason.reason) {
    case "first_displayable_analysis":
      return t("firstAnalysis");
    case "first_group_count_available":
      return undefined;
    case "default_group_count_changed":
      return reason.groupCount === null ? undefined : `${String(reason.groupCount)} groups`;
    case "major_participation_milestone":
      return reason.participantCount === null
        ? undefined
        : `${String(reason.participantCount)} participants`;
    case "major_vote_milestone":
      return reason.voteCount === null ? undefined : `${String(reason.voteCount)} votes`;
    case "conversation_closed":
      return t("conversationClosed");
    case "conversation_reopened":
      return t("conversationReopened");
  }
}

function toggleReason(reason: CheckpointTimelineReason): void {
  selectedReasons.value = selectedReasons.value.includes(reason)
    ? selectedReasons.value.filter((selectedReason) => selectedReason !== reason)
    : [...selectedReasons.value, reason];
}
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 1.5rem;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.control-buttons,
.reason-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.control-label {
  flex-basis: 100%;
  color: $grey-8;
  font-weight: var(--font-weight-semibold);
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: $grey-8;
}

.timeline-preview {
  border: 1px solid #e9e9f1;
  border-radius: 18px;
  padding: 1rem;
}
</style>
