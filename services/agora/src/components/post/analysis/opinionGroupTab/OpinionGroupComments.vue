<template>
  <div class="opinion-group-comments">
    <div class="header-flex-style">
      <h2 class="title">
        <span class="title-short">{{ t("opinionsTitle") }}</span>
        <span class="title-long">{{ t("opinionsTitleLong") }}</span>
        <span class="count">{{ itemList.length }}</span>
      </h2>

      <div class="group-selector">
        <q-btn
          class="group-selector-button"
          flat
          round
          dense
          size="sm"
          :icon="chevronBack"
          @click="togglePreviousMode"
        />
        <span class="group-name">{{ currentModeName }}</span>
        <q-btn
          class="group-selector-button"
          flat
          round
          dense
          size="sm"
          :icon="chevronForward"
          @click="toggleNextMode"
        />
      </div>
    </div>

    <slot name="after-header" />

    <div v-if="itemList.length === 0" class="no-comments">
      {{ t("noOpinionsMessage") }}
    </div>

    <div v-else>
      <ConsensusItem
        v-for="comment in itemList"
        :key="comment.opinionSlugId"
        :conversation-slug-id="props.conversationSlugId"
        :opinion-item="comment"
        :opinion-item-for-visualizer="getModifiedOpinionItem(comment)"
        :cluster-labels="props.clusterLabels"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem, PolisKey } from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  conversationSlugId: string;
  itemList: AnalysisOpinionItem[];
  currentClusterTab: PolisKey;
  hasUngroupedParticipants: boolean;
  clusterLabels: Partial<Record<PolisKey, string>>;
}>();
const $q = useQuasar();
const chevronForward = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);
const chevronBack = computed(() =>
  $q.lang.rtl ? "mdi-chevron-right" : "mdi-chevron-left"
);

import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import {
  type OpinionGroupCommentsTranslations,
  opinionGroupCommentsTranslations,
} from "./OpinionGroupComments.i18n";

const { t } = useComponentI18n<OpinionGroupCommentsTranslations>(
  opinionGroupCommentsTranslations
);

const displayMode = ref<"current" | "all_other_groups" | "all_others">(
  "current"
);

watch(
  () => props.currentClusterTab,
  () => {
    displayMode.value = "current";
  }
);

function getActiveVotes(comment: AnalysisOpinionItem) {
  const currentClusterStats = comment.clustersStats.find(
    (cv) => cv.key === props.currentClusterTab
  );
  const allOthersClustersStats = comment.clustersStats.filter(
    (clusterStats) => clusterStats.key !== props.currentClusterTab
  );
  switch (displayMode.value) {
    case "current":
      return (
        currentClusterStats || {
          numAgrees: 0,
          numDisagrees: 0,
          numPasses: 0,
          numUsers: 0,
        }
      );
    case "all_other_groups":
      return {
        numAgrees: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numAgrees,
          0
        ),
        numDisagrees: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numDisagrees,
          0
        ),
        numPasses: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numPasses,
          0
        ),
        numUsers: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numUsers,
          0
        ),
      };
    case "all_others":
      return {
        numAgrees:
          comment.numAgrees -
          (currentClusterStats !== undefined
            ? currentClusterStats.numAgrees
            : 0),
        numDisagrees:
          comment.numDisagrees -
          (currentClusterStats !== undefined
            ? currentClusterStats.numDisagrees
            : 0),
        numPasses:
          comment.numPasses -
          (currentClusterStats !== undefined
            ? currentClusterStats.numPasses
            : 0),
        numUsers:
          comment.numParticipants -
          (currentClusterStats !== undefined
            ? currentClusterStats.numUsers
            : 0),
      };
  }
}

function getModifiedOpinionItem(
  comment: AnalysisOpinionItem
): AnalysisOpinionItem {
  const activeVotes = getActiveVotes(comment);
  return {
    ...comment,
    numAgrees: activeVotes.numAgrees,
    numDisagrees: activeVotes.numDisagrees,
    numPasses: activeVotes.numPasses,
    numParticipants: activeVotes.numUsers,
  };
}

const currentModeName = computed(() => {
  return displayMode.value === "current"
    ? t("thisGroup")
    : displayMode.value === "all_others"
      ? t("allOthers")
      : t("allOtherGroups");
});

const toggleNextMode = () => {
  if (props.hasUngroupedParticipants) {
    displayMode.value =
      displayMode.value === "current"
        ? "all_other_groups"
        : displayMode.value === "all_other_groups"
          ? "all_others"
          : "current";
  } else {
    // all_other_groups will never be displayed
    displayMode.value =
      displayMode.value === "current"
        ? "all_others"
        : displayMode.value === "all_other_groups"
          ? "all_others"
          : "current";
  }
};

const togglePreviousMode = () => {
  if (props.hasUngroupedParticipants) {
    displayMode.value =
      displayMode.value === "current"
        ? "all_others"
        : displayMode.value === "all_other_groups"
          ? "current"
          : "all_other_groups";
  } else {
    // all_other_groups will never be displayed
    displayMode.value =
      displayMode.value === "current"
        ? "all_others"
        : displayMode.value === "all_other_groups"
          ? "all_others"
          : "current";
  }
};

</script>

<style lang="scss" scoped>
.opinion-group-comments {
  padding: 0 0 1rem 0;
  container-type: inline-size;
}

.title {
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  margin: 0;
  color: #434149;
}

.title-long {
  display: none;
}

@container (min-width: 30rem) {
  .title-short {
    display: none;
  }
  .title-long {
    display: inline;
  }
}

.count {
  font-size: 0.9rem;
  color: #9a97a4;
  margin-left: 0.5rem;
}

.group-selector {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.125rem;
}

.group-selector-button {
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.group-name {
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.no-comments {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.header-flex-style {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.35rem;
  row-gap: 0.5rem;
  justify-content: space-between;
}
</style>
