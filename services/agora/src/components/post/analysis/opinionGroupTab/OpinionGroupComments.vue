<template>
  <div class="opinion-group-comments">
    <div ref="headerElement" class="header-flex-style">
      <h2 class="title">
        <span class="title-short">{{ t("opinionsTitle") }}</span>
        <span class="title-long">{{ t("opinionsTitleLong") }}</span>
        <span class="count">{{ itemList.length }}</span>
      </h2>

      <OpinionGroupScopeSelector
        v-if="props.showScopeSelector"
        :display-mode="props.displayMode"
        variant="regular"
        @previous="emit('previousDisplayMode')"
        @next="emit('nextDisplayMode')"
      />
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
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem, PolisKey } from "src/shared/types/zod";
import { ref } from "vue";

import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import {
  type OpinionGroupCommentsTranslations,
  opinionGroupCommentsTranslations,
} from "./OpinionGroupComments.i18n";
import type { OpinionGroupDisplayMode } from "./opinionGroupDisplayMode";
import OpinionGroupScopeSelector from "./OpinionGroupScopeSelector.vue";

const props = defineProps<{
  conversationSlugId: string;
  itemList: AnalysisOpinionItem[];
  currentClusterTab: PolisKey;
  clusterLabels: Partial<Record<PolisKey, string>>;
  displayMode: OpinionGroupDisplayMode;
  showScopeSelector: boolean;
}>();

const emit = defineEmits<{
  previousDisplayMode: [];
  nextDisplayMode: [];
}>();

const { t } = useComponentI18n<OpinionGroupCommentsTranslations>(
  opinionGroupCommentsTranslations
);

const headerElement = ref<HTMLElement | null>(null);

function getActiveVotes(comment: AnalysisOpinionItem) {
  const currentClusterStats = comment.clustersStats.find(
    (cv) => cv.key === props.currentClusterTab
  );
  const allOthersClustersStats = comment.clustersStats.filter(
    (clusterStats) => clusterStats.key !== props.currentClusterTab
  );
  switch (props.displayMode) {
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

function getHeaderElement(): HTMLElement | null {
  return headerElement.value;
}

defineExpose({ getHeaderElement });

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
