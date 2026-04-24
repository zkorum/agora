<template>
  <div class="report-container">
    <!-- Summary section: header + cluster viz (+ groups table if ≤3 clusters) -->
    <div ref="summaryRef" class="report-section-block">
      <ReportHeader
        :conversation-title="conversationTitle"
        :author-username="authorUsername"
        :created-at="createdAt"
        :participant-count="participantCount"
        :opinion-count="opinionCount"
        :vote-count="voteCount"
        :total-participant-count="totalParticipantCount"
        :total-opinion-count="totalOpinionCount"
        :total-vote-count="totalVoteCount"
      />

      <div v-if="clusterCount >= 2" class="cluster-viz-wrapper">
        <ClusterVisualization
          :clusters="clusters"
          :total-participant-count="participantCount"
          :report-mode="true"
        />
      </div>

      <ReportGroupsTable
        v-if="clusterCount <= 2"
        :clusters="clusters"
        :total-participant-count="participantCount"
      />

      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>

    <!-- Groups table as own section for 3+ clusters (avoids page overflow) -->
    <div
      v-if="clusterCount >= 3"
      ref="groupsTableRef"
      class="report-section-block"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
      </div>
      <ReportGroupsTable
        :clusters="clusters"
        :total-participant-count="participantCount"
      />
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>

    <!-- Representative opinions: always one capture per group -->
    <template v-if="clusterCount >= 2">
      <div
        v-for="(key, idx) in clusterKeys"
        :key="key"
        :ref="(el) => setGroupRepRef({ el, index: idx })"
        class="report-section-block"
      >
        <div class="detail-context capture-only">
          <span class="detail-branding">Agora Citizen Network</span>
          <span class="detail-separator">·</span>
          <span class="detail-title">{{ conversationTitle }}</span>
        </div>
        <ReportRepresentativeOpinions
          :clusters="clusters"
          :total-participant-count="participantCount"
          :single-cluster-key="key"
        >
          <template #after-subtitle>
            <VoteLegend
              :items="reportLegendItems"
              style="margin-bottom: 0.75rem"
            />
          </template>
        </ReportRepresentativeOpinions>
        <ReportFooter
          :conversation-slug-id="conversationSlugId"
          class="capture-footer"
        />
      </div>
    </template>

    <!-- Consensus sections (chunked for page-sized captures) -->
    <div
      v-if="agreementChunks.length === 0"
      ref="agreementEmptyRef"
      class="report-section-block detail-section"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <span class="detail-separator">·</span>
        <span
          class="detail-section-name"
          :style="{ color: 'var(--sentiment-positive)' }"
          >{{ t("agreements") }}</span
        >
      </div>
      <ReportOpinionList
        :title="t('agreementsLong')"
        :subtitle="t('agreementsSubtitle')"
        title-color="var(--sentiment-positive)"
        :items="[]"
        :clusters="clusters"
        :total-participants="participantCount"
        :empty-message="t('noAgreementsMessage')"
      />
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>
    <div
      v-for="(chunk, chunkIdx) in agreementChunks"
      :key="`agreement-${chunkIdx}`"
      :ref="(el) => setAgreementRef({ el, index: chunkIdx })"
      class="report-section-block detail-section"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <template v-if="agreementChunks.length > 1">
          <span class="detail-separator">·</span>
          <span
            class="detail-section-name"
            :style="{ color: 'var(--sentiment-positive)' }"
            >{{ t("agreements") }} ({{ chunkIdx + 1 }}/{{
              agreementChunks.length
            }})</span
          >
        </template>
        <template v-else>
          <span class="detail-separator">·</span>
          <span
            class="detail-section-name"
            :style="{ color: 'var(--sentiment-positive)' }"
            >{{ t("agreements") }}</span
          >
        </template>
      </div>
      <ReportOpinionList
        :title="t('agreementsLong')"
        :subtitle="t('agreementsSubtitle')"
        title-color="var(--sentiment-positive)"
        :items="chunk"
        :clusters="clusters"
        :total-participants="participantCount"
        :start-rank="chunkIdx * effectiveItemsPerPage"
        :hide-title="chunkIdx > 0"
      >
        <template v-if="clusterCount >= 2" #after-subtitle>
          <VoteLegend
            :items="reportLegendItems"
            style="margin-bottom: 0.75rem"
          />
        </template>
      </ReportOpinionList>
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>

    <div
      v-if="disagreementChunks.length === 0"
      ref="disagreementEmptyRef"
      class="report-section-block detail-section"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <span class="detail-separator">·</span>
        <span
          class="detail-section-name"
          :style="{ color: 'var(--sentiment-negative-text)' }"
          >{{ t("disagreements") }}</span
        >
      </div>
      <ReportOpinionList
        :title="t('disagreementsLong')"
        :subtitle="t('disagreementsSubtitle')"
        title-color="var(--sentiment-negative-text)"
        :items="[]"
        :clusters="clusters"
        :total-participants="participantCount"
        :empty-message="t('noDisagreementsMessage')"
      />
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>
    <div
      v-for="(chunk, chunkIdx) in disagreementChunks"
      :key="`disagreement-${chunkIdx}`"
      :ref="(el) => setDisagreementRef({ el, index: chunkIdx })"
      class="report-section-block detail-section"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <template v-if="disagreementChunks.length > 1">
          <span class="detail-separator">·</span>
          <span
            class="detail-section-name"
            :style="{ color: 'var(--sentiment-negative-text)' }"
            >{{ t("disagreements") }} ({{ chunkIdx + 1 }}/{{
              disagreementChunks.length
            }})</span
          >
        </template>
        <template v-else>
          <span class="detail-separator">·</span>
          <span
            class="detail-section-name"
            :style="{ color: 'var(--sentiment-negative-text)' }"
            >{{ t("disagreements") }}</span
          >
        </template>
      </div>
      <ReportOpinionList
        :title="t('disagreementsLong')"
        :subtitle="t('disagreementsSubtitle')"
        title-color="var(--sentiment-negative-text)"
        :items="chunk"
        :clusters="clusters"
        :total-participants="participantCount"
        :start-rank="chunkIdx * effectiveItemsPerPage"
        :hide-title="chunkIdx > 0"
      >
        <template v-if="clusterCount >= 2" #after-subtitle>
          <VoteLegend
            :items="reportLegendItems"
            style="margin-bottom: 0.75rem"
          />
        </template>
      </ReportOpinionList>
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>

    <div
      v-if="divisiveChunks.length === 0"
      ref="divisiveEmptyRef"
      class="report-section-block detail-section"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <span class="detail-separator">·</span>
        <span
          class="detail-section-name"
          :style="{ color: 'var(--sentiment-mixed)' }"
          >{{ t("divisive") }}</span
        >
      </div>
      <ReportOpinionList
        :title="t('divisiveLong')"
        :subtitle="t('divisiveSubtitle')"
        title-color="var(--sentiment-mixed)"
        :items="[]"
        :clusters="clusters"
        :total-participants="participantCount"
        :empty-message="t('noDivisiveMessage')"
      />
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>
    <div
      v-for="(chunk, chunkIdx) in divisiveChunks"
      :key="`divisive-${chunkIdx}`"
      :ref="(el) => setDivisiveRef({ el, index: chunkIdx })"
      class="report-section-block detail-section"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <template v-if="divisiveChunks.length > 1">
          <span class="detail-separator">·</span>
          <span
            class="detail-section-name"
            :style="{ color: 'var(--sentiment-mixed)' }"
            >{{ t("divisive") }} ({{ chunkIdx + 1 }}/{{
              divisiveChunks.length
            }})</span
          >
        </template>
        <template v-else>
          <span class="detail-separator">·</span>
          <span
            class="detail-section-name"
            :style="{ color: 'var(--sentiment-mixed)' }"
            >{{ t("divisive") }}</span
          >
        </template>
      </div>
      <ReportOpinionList
        :title="t('divisiveLong')"
        :subtitle="t('divisiveSubtitle')"
        title-color="var(--sentiment-mixed)"
        :items="chunk"
        :clusters="clusters"
        :total-participants="participantCount"
        :start-rank="chunkIdx * effectiveItemsPerPage"
        :hide-title="chunkIdx > 0"
      >
        <template v-if="clusterCount >= 2" #after-subtitle>
          <VoteLegend
            :items="reportLegendItems"
            style="margin-bottom: 0.75rem"
          />
        </template>
      </ReportOpinionList>
      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>

    <div
      v-if="hasSurvey && showSurveyToggle"
      class="report-section-block detail-section survey-screen-header no-print"
    >
      <ReportSectionHeader
        :title="t('surveyTitle')"
        :subtitle="t('surveySubtitle')"
      >
        <template #action>
          <SurveyVisibilityToggle
            v-model="surveyDisplayMode"
            :track-width="38"
            :track-height="22"
            :thumb-size="18"
          />
        </template>
      </ReportSectionHeader>
    </div>

    <div
      v-if="hasSurvey && surveyPages.length === 0"
      ref="surveyEmptyRef"
      :class="[
        'report-section-block detail-section',
        { 'detail-section--continuation': showSurveyToggle },
      ]"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <span class="detail-separator">·</span>
        <span class="detail-section-name">{{ surveyOverallTitle }}</span>
      </div>

      <div class="survey-section">
        <ReportSectionHeader
          v-if="!showSurveyToggle"
          :title="surveyOverallTitle"
          :subtitle="t('surveySubtitle')"
        />
        <ReportSectionHeader
          v-else
          class="capture-only"
          :title="surveyOverallTitle"
          :subtitle="t('surveySubtitle')"
        />
        <div class="survey-empty">{{ t("noSurveyResultsMessage") }}</div>
      </div>

      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>
    <div
      v-for="(page, pageIdx) in surveyPages"
      :key="page.key"
      :ref="(el) => setSurveyRef({ el, index: pageIdx })"
      :class="[
        'report-section-block detail-section',
        {
          'detail-section--continuation': showSurveyToggle && pageIdx === 0,
        },
      ]"
    >
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
        <span class="detail-separator">·</span>
        <span class="detail-section-name">{{
          getPagedSectionLabel({
            baseLabel: page.sectionName,
            pageIndex: page.pageIndex,
            pageCount: page.pageCount,
          })
        }}</span>
      </div>

      <div class="survey-section">
        <ReportSectionHeader
          v-if="!(showSurveyToggle && pageIdx === 0)"
          :title="page.title"
          :subtitle="page.subtitle"
        />
        <ReportSectionHeader
          v-else
          class="capture-only"
          :title="page.title"
          :subtitle="page.subtitle"
        />

        <div v-if="clusterCount >= 2" class="survey-cluster-viz-wrapper">
          <ReportClusterMap
            :clusters="clusters"
            :total-participant-count="participantCount"
            :selected-cluster-key="page.clusterKey"
          />
        </div>

        <div class="survey-question-list">
          <div
            v-for="question in page.questionGroups"
            :key="question.id"
            class="survey-question-card"
          >
            <div class="survey-question-text">{{ question.question }}</div>

            <SurveySuppressedQuestionNotice
              v-if="question.isSuppressed"
              :suppression-reason="question.suppressionReason"
              class="survey-question-card__suppressed"
            />

            <div v-else class="survey-option-list">
              <div
                v-for="option in question.options"
                :key="option.id"
                class="survey-option-row"
              >
                <div class="survey-option-row__header">
                  <span class="survey-option-row__label">{{
                    option.label
                  }}</span>
                  <span class="survey-option-row__value">
                    <template v-if="option.isSuppressed">
                      {{ t("suppressed") }}
                    </template>
                    <template v-else>
                      {{ formatAmount(option.count ?? 0) }} /
                      {{ formatPercentage(option.percentage ?? 0) }}
                    </template>
                  </span>
                </div>

                <div class="survey-option-row__bar">
                  <div
                    class="survey-option-row__fill"
                    :class="{
                      'survey-option-row__fill--suppressed':
                        option.isSuppressed,
                    }"
                    :style="{
                      width: `${option.isSuppressed ? 0 : (option.percentage ?? 0)}%`,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportFooter
        :conversation-slug-id="conversationSlugId"
        class="capture-footer"
      />
    </div>

    <!-- Footer -->
    <div class="report-section-block">
      <div ref="footerRef">
        <ReportFooter :conversation-slug-id="conversationSlugId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ClusterVisualization from "src/components/post/analysis/opinionGroupTab/ClusterVisualization.vue";
import SurveySuppressedQuestionNotice from "src/components/survey/SurveySuppressedQuestionNotice.vue";
import SurveyVisibilityToggle from "src/components/survey/SurveyVisibilityToggle.vue";
import {
  type VoteLegendTranslations,
  voteLegendTranslations,
} from "src/components/ui/VoteLegend.i18n";
import VoteLegend from "src/components/ui/VoteLegend.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  PolisClusters,
  PolisKey,
  SurveyAggregateRow,
} from "src/shared/types/zod";
import { formatAmount, formatPercentage } from "src/utils/common";
import { formatClusterLabel } from "src/utils/component/opinion";
import { REPORT_ITEMS_PER_CAPTURE_PAGE } from "src/utils/component/report/reportData";
import {
  groupSurveyRowsByQuestion,
  type SurveyResultsDisplayMode,
} from "src/utils/survey/results";
import { computed, type Ref, ref } from "vue";

import {
  type AnalysisReportTranslations,
  analysisReportTranslations,
} from "./AnalysisReport.i18n";
import ReportClusterMap from "./ReportClusterMap.vue";
import ReportFooter from "./ReportFooter.vue";
import ReportGroupsTable from "./ReportGroupsTable.vue";
import ReportHeader from "./ReportHeader.vue";
import ReportOpinionList from "./ReportOpinionList.vue";
import ReportRepresentativeOpinions from "./ReportRepresentativeOpinions.vue";
import ReportSectionHeader from "./ReportSectionHeader.vue";

const props = defineProps<{
  conversationSlugId: string;
  conversationTitle: string;
  authorUsername: string;
  createdAt: string | Date;
  participantCount: number;
  opinionCount: number;
  voteCount: number;
  totalParticipantCount: number;
  totalOpinionCount: number;
  totalVoteCount: number;
  clusters: Partial<PolisClusters>;
  agreementItems: AnalysisOpinionItem[];
  disagreementItems: AnalysisOpinionItem[];
  divisiveItems: AnalysisOpinionItem[];
  hasSurvey: boolean;
  surveyRows: SurveyAggregateRow[];
  showSurveyToggle?: boolean;
  itemsPerPage?: number;
}>();

const surveyDisplayMode = defineModel<SurveyResultsDisplayMode>(
  "surveyDisplayMode",
  {
    default: "suppressed",
  }
);

const effectiveItemsPerPage = computed(
  () => props.itemsPerPage ?? REPORT_ITEMS_PER_CAPTURE_PAGE
);

const { t } = useComponentI18n<AnalysisReportTranslations>(
  analysisReportTranslations
);

const { t: tLegend } = useComponentI18n<VoteLegendTranslations>(
  voteLegendTranslations
);

const reportLegendItems = computed(() => [
  { label: tLegend("agree"), type: "agree" as const },
  { label: tLegend("unsure"), type: "unsure" as const },
  { label: tLegend("disagree"), type: "disagree" as const },
  { label: tLegend("noVote"), type: "noVote" as const },
]);

const clusterCount = computed(() => Object.keys(props.clusters).length);
const useLetterCodes = computed(() => clusterCount.value >= 4);

const clusterKeys = computed<PolisKey[]>(() => {
  return Object.keys(props.clusters) as PolisKey[];
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const agreementChunks = computed(() =>
  chunkArray(props.agreementItems, effectiveItemsPerPage.value)
);
const disagreementChunks = computed(() =>
  chunkArray(props.disagreementItems, effectiveItemsPerPage.value)
);
const divisiveChunks = computed(() =>
  chunkArray(props.divisiveItems, effectiveItemsPerPage.value)
);

const surveyOverallChunks = computed(() => {
  const overallRows = props.surveyRows.filter((row) => row.scope === "overall");
  return chunkArray(
    groupSurveyRowsByQuestion({ rows: overallRows }),
    effectiveItemsPerPage.value
  );
});

const showSurveyGroupPages = computed(() => {
  return props.surveyRows.some((row) => row.scope === "cluster");
});

const surveyOverallTitle = computed(
  () => `${t("surveyTitle")} - ${t("surveyOverallLabel")}`
);

function getSurveyGroupPageLabel(clusterKey: PolisKey): string {
  const cluster = props.clusters[clusterKey];
  if (useLetterCodes.value) {
    return formatClusterLabel(clusterKey, true);
  }

  return cluster?.aiLabel || formatClusterLabel(clusterKey, true);
}

const surveyClusterPages = computed(() => {
  if (!showSurveyGroupPages.value) {
    return [];
  }

  const clusterIds = new Set<string>();
  for (const row of props.surveyRows) {
    if (row.scope === "cluster") {
      clusterIds.add(row.clusterId);
    }
  }

  return Array.from(clusterIds.values()).flatMap((clusterId) => {
    const clusterKey = clusterId as PolisKey;
    const clusterRows = props.surveyRows.filter(
      (row) => row.scope === "cluster" && row.clusterId === clusterId
    );
    const questionChunks = chunkArray(
      groupSurveyRowsByQuestion({ rows: clusterRows }),
      effectiveItemsPerPage.value
    );
    const pageLabel = getSurveyGroupPageLabel(clusterKey);
    const pageTitle = `${t("surveyTitle")} - ${pageLabel}`;

    return questionChunks.map((questionGroups, pageIndex) => ({
      key: `${clusterId}-${pageIndex}`,
      clusterKey,
      title: pageTitle,
      sectionName: pageTitle,
      subtitle: t("surveyGroupSubtitle"),
      pageIndex,
      pageCount: questionChunks.length,
      questionGroups,
    }));
  });
});

const surveyPages = computed(() => {
  const overallPages = surveyOverallChunks.value.map(
    (questionGroups, pageIndex) => ({
      key: `overall-${pageIndex}`,
      clusterKey: undefined,
      title: surveyOverallTitle.value,
      sectionName: surveyOverallTitle.value,
      subtitle: t("surveySubtitle"),
      pageIndex,
      pageCount: surveyOverallChunks.value.length,
      questionGroups,
    })
  );

  return [...overallPages, ...surveyClusterPages.value];
});

const summaryRef = ref<HTMLElement | null>(null);
const groupsTableRef = ref<HTMLElement | null>(null);
const footerRef = ref<HTMLElement | null>(null);

// Empty state refs
const agreementEmptyRef = ref<HTMLElement | null>(null);
const disagreementEmptyRef = ref<HTMLElement | null>(null);
const divisiveEmptyRef = ref<HTMLElement | null>(null);
const surveyEmptyRef = ref<HTMLElement | null>(null);

// Dynamic arrays of refs
const groupsAndRepresentativeRefs = ref<HTMLElement[]>([]);
const agreementRefs = ref<HTMLElement[]>([]);
const disagreementRefs = ref<HTMLElement[]>([]);
const divisiveRefs = ref<HTMLElement[]>([]);
const surveyRefs = ref<HTMLElement[]>([]);

function createRefSetter(target: Ref<HTMLElement[]>) {
  return ({ el, index }: { el: unknown; index: number }): void => {
    if (el instanceof HTMLElement) {
      target.value[index] = el;
    } else {
      // Element was unmounted — truncate stale entries from this index onward
      target.value.splice(index);
    }
  };
}

const setGroupRepRef = createRefSetter(groupsAndRepresentativeRefs);
const setAgreementRef = createRefSetter(agreementRefs);
const setDisagreementRef = createRefSetter(disagreementRefs);
const setDivisiveRef = createRefSetter(divisiveRefs);
const setSurveyRef = createRefSetter(surveyRefs);

function getPagedSectionLabel({
  baseLabel,
  pageIndex,
  pageCount,
}: {
  baseLabel: string;
  pageIndex: number;
  pageCount: number;
}): string {
  if (pageCount <= 1) {
    return baseLabel;
  }

  return `${baseLabel} (${String(pageIndex + 1)}/${String(pageCount)})`;
}

defineExpose({
  summaryRef,
  groupsTableRef,
  groupsAndRepresentativeRefs,
  agreementEmptyRef,
  disagreementEmptyRef,
  divisiveEmptyRef,
  surveyEmptyRef,
  agreementRefs,
  disagreementRefs,
  divisiveRefs,
  surveyRefs,
  footerRef,
});
</script>

<style lang="scss" scoped>
.report-container {
  width: 260mm;
  max-width: 100%;
  margin: 0 auto;
  background: white;
  color: #333238;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.report-section-block {
  padding: 6mm 4mm;
  background: white;
}

.detail-section {
  margin-top: 1rem;
  border-top: 2px solid #e9e9f1;
  padding-top: 1.5rem;
}

.detail-section--continuation {
  margin-top: 0;
  border-top: none;
  padding-top: 1rem;
}

.survey-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-cluster-viz-wrapper {
  max-width: 500px;
  margin: 0 auto;
  pointer-events: none;
}

.survey-screen-header {
  padding-bottom: 0;
}

.survey-empty {
  margin: 0;
  font-size: 0.85rem;
  color: $ink-light;
}

.survey-question-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.survey-question-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 16px;
  background: #faf9fd;
  border: 1px solid #ece9f6;
}

.survey-question-card__suppressed {
  margin-top: 0.25rem;
}

.survey-question-text {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: #333238;
}

.survey-option-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.survey-option-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.survey-option-row__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}

.survey-option-row__label {
  color: #434149;
}

.survey-option-row__value {
  font-size: 0.875rem;
  color: #6d6a74;
  white-space: nowrap;
}

.survey-option-row__bar {
  height: 0.5rem;
  border-radius: 999px;
  background: #efedf8;
  overflow: hidden;
}

.survey-option-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6b4eff 0%, #9b8cff 100%);
}

.survey-option-row__fill--suppressed {
  background: #d8d6de;
}

.detail-context {
  font-size: 0.75rem;
  color: #9e9ba5;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0f0f5;
}

.detail-branding {
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-separator {
  margin: 0 0.375rem;
}

.detail-title {
  color: #6d6a74;
}

.detail-section-name {
  font-weight: var(--font-weight-semibold);
  color: #6d6a74;
}

.cluster-viz-wrapper {
  max-width: 500px;
  margin: 0 auto;
  pointer-events: none;
}

.capture-footer,
.capture-only {
  display: none;
}
</style>
