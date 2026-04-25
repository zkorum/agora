<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('surveyTitle')"
        >
          <template #action-button>
            <AnalysisActionButton
              v-if="compactMode"
              type="viewMore"
              @action-click="switchTab"
            />
            <div v-else class="header-actions">
              <SurveyVisibilityToggle
                v-if="canViewFullResults"
                v-model="displayMode"
                :track-width="38"
                :track-height="22"
                :thumb-size="18"
              />
              <AnalysisActionButton
                type="learnMore"
                @action-click="showSurveyInfo = true"
              />
            </div>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <AsyncStateHandler
          :query="props.surveyQuery"
          :config="asyncStateConfig"
        >
          <p v-if="!compactMode" class="survey-subtitle">
            {{ t("surveySubtitle") }}
          </p>

          <template v-if="showGroupComponents">
            <ClusterVisualization
              :clusters="props.clusters"
              :total-participant-count="props.totalParticipantCount"
              :current-cluster-tab="selectedClusterKey"
              repeat-selection-behavior="all"
              @update:current-cluster-tab="selectedClusterKey = $event"
              @select-all="selectedClusterKey = undefined"
            />

            <OpinionGroupSelector
              :cluster-metadata-list="props.clusters"
              :selected-cluster-key="selectedClusterKey"
              :show-all-tab="true"
              :all-label="t('allGroups')"
              :allow-clear-to-all="true"
              @changed-cluster-key="selectedClusterKey = $event"
              @select-all="selectedClusterKey = undefined"
            />
          </template>

          <EmptyStateMessage
            v-if="displayedQuestions.length === 0"
            :message="emptyMessage"
          />

          <CompactFadeContainer
            v-else
            :show-fade="compactMode && hasMoreQuestions"
            :max-height="compactMode ? compactSummaryMaxHeight : undefined"
          >
            <div class="question-list">
              <ZKCard
                v-for="question in displayedQuestions"
                :key="question.id"
                padding="1rem"
                class="question-card"
              >
                <div class="question-text">{{ question.question }}</div>

                <SurveySuppressedQuestionNotice
                  v-if="question.isSuppressed"
                  :suppression-reason="question.suppressionReason"
                  class="question-card__suppressed"
                />

                <div v-else class="option-list">
                  <div
                    v-for="option in question.options"
                    :key="option.id"
                    class="option-row"
                  >
                    <div class="option-row__header">
                      <span class="option-row__label">{{ option.label }}</span>
                      <span class="option-row__value">
                        <template v-if="option.isSuppressed">
                          {{ t("suppressed") }}
                        </template>
                        <template v-else>
                          {{ formatAmount(option.count ?? 0) }} /
                          {{ formatPercentage(option.percentage ?? 0) }}
                        </template>
                      </span>
                    </div>

                    <div class="option-row__bar">
                      <div
                        class="option-row__fill"
                        :class="{
                          'option-row__fill--suppressed': option.isSuppressed,
                        }"
                        :style="{
                          width: `${option.isSuppressed ? 0 : (option.percentage ?? 0)}%`,
                        }"
                      />
                    </div>
                  </div>
                </div>
              </ZKCard>
            </div>
          </CompactFadeContainer>
        </AsyncStateHandler>
      </template>
    </AnalysisSectionWrapper>

    <SurveyInformationDialog v-model="showSurveyInfo" />
  </div>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import SurveySuppressedQuestionNotice from "src/components/survey/SurveySuppressedQuestionNotice.vue";
import SurveyVisibilityToggle from "src/components/survey/SurveyVisibilityToggle.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { formatAmount, formatPercentage } from "src/utils/common";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import {
  canViewFullSurveyResults,
  getDisplayedSurveyRows,
  groupSurveyRowsByQuestion,
  type SurveyResultsDisplayMode,
} from "src/utils/survey/results";
import { computed, ref, watch } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import CompactFadeContainer from "../common/CompactFadeContainer.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import ClusterVisualization from "../opinionGroupTab/ClusterVisualization.vue";
import OpinionGroupSelector from "../opinionGroupTab/OpinionGroupSelector.vue";
import SurveyInformationDialog from "./SurveyInformationDialog.vue";
import {
  type SurveyTabTranslations,
  surveyTabTranslations,
} from "./SurveyTab.i18n";

const props = withDefaults(
  defineProps<{
    surveyQuery: UseQueryReturnType<SurveyResultsAggregatedResponse, Error>;
    clusters: Partial<PolisClusters>;
    totalParticipantCount: number;
    compactMode?: boolean;
  }>(),
  {
    compactMode: false,
  }
);

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<SurveyTabTranslations>(surveyTabTranslations);

const selectedClusterKey = ref<PolisKey>();
const showSurveyInfo = ref(false);
const displayMode = ref<SurveyResultsDisplayMode>("suppressed");

const canViewFullResults = computed(() =>
  canViewFullSurveyResults({ surveyResults: props.surveyQuery.data.value })
);

const surveyRows = computed(() =>
  getDisplayedSurveyRows({
    surveyResults: props.surveyQuery.data.value,
    displayMode: displayMode.value,
  })
);

const hasClusterRows = computed(() =>
  surveyRows.value.some((row) => row.scope === "cluster")
);

const showGroupComponents = computed(
  () =>
    !props.compactMode &&
    hasClusterRows.value &&
    Object.keys(props.clusters).length > 1
);

const selectedRows = computed(() => {
  if (
    props.compactMode ||
    selectedClusterKey.value === undefined ||
    !showGroupComponents.value
  ) {
    return surveyRows.value.filter((row) => row.scope === "overall");
  }

  return surveyRows.value.filter(
    (row) =>
      row.scope === "cluster" && row.clusterId === selectedClusterKey.value
  );
});

const questionGroups = computed(() => {
  return groupSurveyRowsByQuestion({ rows: selectedRows.value });
});

const displayedQuestions = computed(() =>
  props.compactMode ? questionGroups.value.slice(0, 3) : questionGroups.value
);

const compactSummaryMaxHeight = "22rem";

const hasMoreQuestions = computed(
  () => questionGroups.value.length > displayedQuestions.value.length
);

const emptyMessage = computed(() =>
  showGroupComponents.value && selectedClusterKey.value !== undefined
    ? t("noGroupResultsMessage")
    : t("noSurveyResultsMessage")
);

const asyncStateConfig = {
  loading: {
    text: t("loadingSurvey"),
  },
  retrying: {
    text: t("retryingSurvey"),
  },
  error: {
    title: t("surveyErrorTitle"),
    message: t("surveyErrorMessage"),
    retryButtonText: t("retrySurvey"),
  },
};

watch(
  () => props.compactMode,
  (compactMode) => {
    if (compactMode) {
      selectedClusterKey.value = undefined;
    }
  },
  { immediate: true }
);

watch(
  canViewFullResults,
  (canView) => {
    if (!canView) {
      displayMode.value = "suppressed";
    }
  },
  { immediate: true }
);

function switchTab(): void {
  currentTab.value = "Survey";
}
</script>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  align-items: center;
  column-gap: 0.8rem;
  row-gap: 0.4rem;
}

.survey-subtitle {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #6d6a74;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-text {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: #333238;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card__suppressed {
  margin-top: 0.25rem;
}

.option-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.option-row__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.option-row__label {
  color: #434149;
}

.option-row__value {
  font-size: 0.875rem;
  color: #6d6a74;
  white-space: nowrap;
}

.option-row__bar {
  height: 0.5rem;
  border-radius: 999px;
  background: #efedf8;
  overflow: hidden;
}

.option-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6b4eff 0%, #9b8cff 100%);
}

.option-row__fill--suppressed {
  background: #d8d6de;
}

@media (max-width: $breakpoint-xs-max) {
  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .option-row__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
  }
}
</style>
