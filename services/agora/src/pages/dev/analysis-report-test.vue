<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('analysisReportTest')" :center-content="true" />
  </Teleport>

  <div class="page-layout">
    <PrimeCard class="control-card no-print">
      <template #title>
        <div class="section-header">
          <i class="pi pi-cog section-icon"></i>
          <span>{{ t("controls") }}</span>
        </div>
      </template>
      <template #content>
        <div class="controls-row">
          <div class="control-item">
            <label for="cluster-count" class="control-label">
              {{ t("clusterCountLabel") }}
            </label>
            <PrimeSelect
              id="cluster-count"
              v-model="selectedClusterCount"
              :options="clusterCountOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
          <div class="control-item">
            <label for="ai-labels" class="control-label">
              {{ t("aiLabelsLabel") }}
            </label>
            <PrimeSelect
              id="ai-labels"
              v-model="aiLabelMode"
              :options="aiLabelOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
          <div class="control-item">
            <label for="empty-sections" class="control-label">
              {{ t("emptySectionsLabel") }}
            </label>
            <PrimeSelect
              id="empty-sections"
              v-model="emptySectionsMode"
              :options="emptySectionsOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
          <div class="control-item">
            <label for="number-scale" class="control-label">
              {{ t("numberScaleLabel") }}
            </label>
            <PrimeSelect
              id="number-scale"
              v-model="numberScale"
              :options="numberScaleOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
          <div class="control-item">
            <label for="viewer-access" class="control-label">
              {{ t("viewerAccessLabel") }}
            </label>
            <PrimeSelect
              id="viewer-access"
              v-model="surveyViewerAccess"
              :options="viewerAccessOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
          <div class="control-item">
            <label for="survey-scenario" class="control-label">
              Survey state
            </label>
            <PrimeSelect
              id="survey-scenario"
              v-model="surveyScenario"
              :options="surveyScenarioOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
          <div class="control-item">
            <label for="all-statements-order" class="control-label">
              All statements order
            </label>
            <PrimeSelect
              id="all-statements-order"
              v-model="allStatementsOrder"
              :options="allStatementsOrderOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
        </div>
      </template>
    </PrimeCard>

    <div class="download-bar no-print">
      <PrimeButton
        :label="isGeneratingZip ? t('generating') : t('downloadImagesZip')"
        icon="pi pi-image"
        :disabled="isGeneratingZip"
        @click="handleDownloadZip"
      />
      <PrimeButton
        :label="isGeneratingPdf ? t('generating') : t('downloadPdf')"
        icon="pi pi-file-pdf"
        :disabled="isGeneratingPdf"
        @click="handleDownloadPdf"
      />
    </div>

    <div class="report-preview">
      <AnalysisReport
        ref="analysisReportRef"
        :key="`${selectedClusterCount}-${aiLabelMode}-${emptySectionsMode}-${numberScale}-${surveyViewerAccess}-${surveyScenario}-${reportSurveyDisplayMode}-${allStatementsOrder}`"
        v-model:survey-display-mode="reportSurveyDisplayMode"
        v-model:all-statements-order="allStatementsOrder"
        :items-per-page="itemsPerPage"
        :conversation-slug-id="mockConversationSlugId"
        :conversation-title="mockConversationTitle"
        :author-username="mockAuthorUsername"
        :created-at="mockCreatedAt"
        :participant-count="totalParticipantCount"
        :opinion-count="mockOpinionCount"
        :vote-count="mockVoteCount"
        :total-participant-count="Math.ceil(totalParticipantCount * 1.1)"
        :total-opinion-count="Math.ceil(mockOpinionCount * 1.1)"
        :total-vote-count="Math.ceil(mockVoteCount * 1.1)"
        :clusters="mockClusters"
        :agreement-items="mockAgreementItems"
        :disagreement-items="mockDisagreementItems"
        :divisive-items="mockDivisiveItems"
        :all-items="mockAllItems"
        :all-statements-order-options="allStatementsOrderOptions"
        :has-survey="hasMockSurvey"
        :survey-rows="reportSurveyRows"
        :show-survey-toggle="showReportSurveyToggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import Button from "primevue/button";
import Card from "primevue/card";
import Select from "primevue/select";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useReportDownload } from "src/composables/report/useReportDownload";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  ClusterStats,
  PolisClusters,
} from "src/shared/types/zod";
import {
  getReportAllOpinions,
  REPORT_ITEMS_PER_CAPTURE_PAGE,
  REPORT_ITEMS_PER_PDF_PAGE,
  type ReportAllStatementsOrder,
} from "src/utils/component/report/reportData";
import {
  canViewFullSurveyResults,
  getDisplayedSurveyRows,
  type SurveyResultsDisplayMode,
} from "src/utils/survey/results";
import { computed, nextTick, ref, watch } from "vue";

import {
  type AnalysisReportTestTranslations,
  analysisReportTestTranslations,
} from "./analysis-report-test.i18n";
import {
  type AiLabelMode,
  aiSummaries,
  buildMockSurveyResults,
  longAiLabels,
  mockStatements,
  polisKeys,
  shortAiLabels,
  type SurveyScenario,
} from "./analysisTestData";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
    PrimeSelect: Select,
  },
});

const { isActive } = usePageLayout({
  enableFooter: false,
  addBottomPadding: true,
});

const { t } = useComponentI18n<AnalysisReportTestTranslations>(
  analysisReportTestTranslations
);

const selectedClusterCount = ref(3);
const aiLabelMode = ref<AiLabelMode>("long");
const emptySectionsMode = ref<
  "none" | "all" | "agreements" | "disagreements" | "divisive" | "noSurvey"
>("none");
const numberScale = ref<"normal" | "large" | "veryLarge">("large");
const surveyViewerAccess = ref<"public" | "owner">("owner");
const surveyScenario = ref<SurveyScenario>("visible");
const reportSurveyDisplayMode = ref<SurveyResultsDisplayMode>("suppressed");
const allStatementsOrder = ref<ReportAllStatementsOrder>("newest");

const mockConversationSlugId = "dev-test-report";
const mockConversationTitle =
  "Comment améliorer la gouvernance participative et renforcer l'engagement citoyen dans les décisions budgétaires et urbanistiques de notre commune ?";
const mockAuthorUsername = "test-user";
const mockCreatedAt = new Date("2025-11-15");

const scaleFactors = {
  normal: { opinions: 187, votes: 4280 },
  large: { opinions: 300_000, votes: 300_000 },
  veryLarge: { opinions: 300_000_000, votes: 300_000_000 },
} as const;

const mockOpinionCount = computed(
  () => scaleFactors[numberScale.value].opinions
);
const mockVoteCount = computed(() => scaleFactors[numberScale.value].votes);
const surveyResponseScaleMultiplier = computed(() => {
  switch (numberScale.value) {
    case "normal":
      return 1;
    case "large":
      return 600;
    case "veryLarge":
      return 600_000;
  }

  throw new Error("Unhandled number scale");
});

const clusterCountOptions = computed(() => [
  { label: t("clusterCount0"), value: 0 },
  { label: t("clusterCount1"), value: 1 },
  { label: t("clusterCount2"), value: 2 },
  { label: t("clusterCount3"), value: 3 },
  { label: t("clusterCount4"), value: 4 },
  { label: t("clusterCount5"), value: 5 },
  { label: t("clusterCount6"), value: 6 },
]);

const aiLabelOptions = computed(() => [
  { label: "Long AI labels", value: "long" as const },
  { label: "Short AI labels", value: "short" as const },
  { label: t("withoutAiLabels"), value: "none" as const },
]);

const numberScaleOptions = computed(() => [
  { label: t("numberScaleNormal"), value: "normal" as const },
  { label: t("numberScaleLarge"), value: "large" as const },
  { label: t("numberScaleVeryLarge"), value: "veryLarge" as const },
]);

const viewerAccessOptions = computed(() => [
  { label: t("viewerAccessPublic"), value: "public" as const },
  { label: t("viewerAccessOwner"), value: "owner" as const },
]);

const surveyScenarioOptions = computed(() => [
  { label: "Visible by group", value: "visible" as const },
  { label: "Suppressed by group", value: "suppressed" as const },
  {
    label: "Suppressed incl. overall",
    value: "overallSuppressed" as const,
  },
  { label: "Mixed groups", value: "mixed" as const },
  { label: "No results yet", value: "empty" as const },
]);

const allStatementsOrderOptions = [
  { label: "Newest first", value: "newest" as const },
  { label: "Most approved first", value: "agreement" as const },
  { label: "Most rejected first", value: "disagreement" as const },
  { label: "Most divisive first", value: "divisive" as const },
];

const emptySectionsOptions = computed(() => [
  { label: t("emptySectionsNone"), value: "none" as const },
  { label: t("emptySectionsAll"), value: "all" as const },
  { label: t("emptySectionsAgreements"), value: "agreements" as const },
  { label: t("emptySectionsDisagreements"), value: "disagreements" as const },
  { label: t("emptySectionsDivisive"), value: "divisive" as const },
  { label: "No survey", value: "noSurvey" as const },
]);

const effectiveSurveyScenario = computed<SurveyScenario>(() =>
  emptySectionsMode.value === "noSurvey" ? "absent" : surveyScenario.value
);

const mockSurveyResults = computed(() =>
  buildMockSurveyResults({
    clusterCount: selectedClusterCount.value,
    aiLabelMode: aiLabelMode.value,
    surveyViewerAccess: surveyViewerAccess.value,
    surveyScenario: effectiveSurveyScenario.value,
    responseScaleMultiplier: surveyResponseScaleMultiplier.value,
  })
);

const hasMockSurvey = computed(() => mockSurveyResults.value.hasSurvey);

function generateClusterStats({
  clusterCount,
}: {
  clusterCount: number;
}): ClusterStats[] {
  const stats: ClusterStats[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const numUsers = 5 + Math.floor(Math.random() * 20);
    const numAgrees = Math.floor(Math.random() * numUsers);
    const remaining = numUsers - numAgrees;
    const numDisagrees = Math.floor(Math.random() * remaining);
    const numPasses = remaining - numDisagrees;
    stats.push({
      key: polisKeys[i],
      isAuthorInCluster: i === 0,
      numUsers,
      numAgrees,
      numDisagrees,
      numPasses,
    });
  }
  return stats;
}

function generateMockOpinion({
  index,
  clusterCount,
}: {
  index: number;
  clusterCount: number;
}): AnalysisOpinionItem {
  const numParticipants = 30 + Math.floor(Math.random() * 30);
  const numAgrees = Math.floor(numParticipants * (0.3 + Math.random() * 0.5));
  const remaining = numParticipants - numAgrees;
  const numDisagrees = Math.floor(remaining * (0.3 + Math.random() * 0.5));
  const numPasses = remaining - numDisagrees;

  return {
    opinionSlugId: `mock-op-${index}`,
    createdAt: new Date("2025-11-20"),
    updatedAt: new Date("2025-11-20"),
    opinion: mockStatements[index % mockStatements.length],
    numParticipants,
    numAgrees,
    numDisagrees,
    numPasses,
    username: `user${index + 1}`,
    moderation: { status: "unmoderated" },
    isSeed: false,
    clustersStats: generateClusterStats({ clusterCount }),
    groupAwareConsensusAgree: 0.6 + Math.random() * 0.35,
    groupAwareConsensusDisagree: 0.6 + Math.random() * 0.35,
    divisiveScore: Math.random() * 4,
  };
}

const mockClusters = computed<Partial<PolisClusters>>(() => {
  if (selectedClusterCount.value === 0) return {};

  const clusters: Partial<PolisClusters> = {};
  const aiLabels =
    aiLabelMode.value === "long"
      ? longAiLabels
      : aiLabelMode.value === "short"
        ? shortAiLabels
        : undefined;
  const scaleMultiplier =
    numberScale.value === "veryLarge"
      ? 600_000
      : numberScale.value === "large"
        ? 600
        : 1;
  const baseSizes = [145, 112, 87, 63, 48, 35].map((s) => s * scaleMultiplier);

  for (let i = 0; i < selectedClusterCount.value; i++) {
    const key = polisKeys[i];
    const representative: AnalysisOpinionItem[] = [];
    for (let j = 0; j < 5; j++) {
      representative.push(
        generateMockOpinion({
          index: i * 5 + j,
          clusterCount: selectedClusterCount.value,
        })
      );
    }

    clusters[key] = {
      key,
      numUsers: baseSizes[i] ?? 5,
      aiLabel: aiLabels?.[i],
      aiSummary: aiLabels === undefined ? undefined : aiSummaries[i],
      isUserInCluster: i === 0,
      representative,
    };
  }

  return clusters;
});

const totalParticipantCount = computed(() => {
  return Object.values(mockClusters.value).reduce(
    (sum, cluster) => sum + (cluster?.numUsers ?? 0),
    0
  );
});

const mockAgreementItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  if (
    emptySectionsMode.value === "all" ||
    emptySectionsMode.value === "agreements"
  )
    return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 0; i < 20; i++) {
    items.push(
      generateMockOpinion({
        index: i,
        clusterCount: selectedClusterCount.value,
      })
    );
  }
  return items;
});

const mockDisagreementItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  if (
    emptySectionsMode.value === "all" ||
    emptySectionsMode.value === "disagreements"
  )
    return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 0; i < 15; i++) {
    items.push(
      generateMockOpinion({
        index: i + 20,
        clusterCount: selectedClusterCount.value,
      })
    );
  }
  return items;
});

const mockDivisiveItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  if (
    emptySectionsMode.value === "all" ||
    emptySectionsMode.value === "divisive"
  )
    return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 8; i < 10; i++) {
    items.push(
      generateMockOpinion({
        index: i,
        clusterCount: selectedClusterCount.value,
      })
    );
  }
  return items;
});

const mockAllItems = computed(() =>
  getReportAllOpinions({
    order: allStatementsOrder.value,
    items: [
      ...mockAgreementItems.value,
      ...mockDisagreementItems.value,
      ...mockDivisiveItems.value,
    ],
  })
);

const surveyResultsQuery = useQuery({
  queryKey: computed(() => [
    "dev-survey-results",
    selectedClusterCount.value,
    aiLabelMode.value,
    surveyViewerAccess.value,
    effectiveSurveyScenario.value,
    surveyResponseScaleMultiplier.value,
  ]),
  queryFn: () => mockSurveyResults.value,
  staleTime: Infinity,
});

const showReportSurveyToggle = computed(() =>
  hasMockSurvey.value &&
  canViewFullSurveyResults({ surveyResults: surveyResultsQuery.data.value })
);

const reportSurveyRows = computed(() =>
  getDisplayedSurveyRows({
    surveyResults: surveyResultsQuery.data.value,
    displayMode: reportSurveyDisplayMode.value,
  })
);

watch(
  showReportSurveyToggle,
  (canShow) => {
    if (!canShow) {
      reportSurveyDisplayMode.value = "suppressed";
    }
  },
  { immediate: true }
);

// Download functionality
interface AnalysisReportExposed {
  summaryRef: HTMLElement | null;
  groupsTableRef: HTMLElement | null;
  groupsAndRepresentativeRefs: HTMLElement[];
  agreementEmptyRef: HTMLElement | null;
  disagreementEmptyRef: HTMLElement | null;
  divisiveEmptyRef: HTMLElement | null;
  allEmptyRef: HTMLElement | null;
  agreementRefs: HTMLElement[];
  disagreementRefs: HTMLElement[];
  divisiveRefs: HTMLElement[];
  allRefs: HTMLElement[];
  surveyEmptyRef: HTMLElement | null;
  surveyRefs: HTMLElement[];
  footerRef: HTMLElement | null;
}

const analysisReportRef = ref<AnalysisReportExposed | null>(null);

const itemsPerPage = ref(REPORT_ITEMS_PER_CAPTURE_PAGE);

const { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf } =
  useReportDownload({
    fileName: computed(() => `test-report-${selectedClusterCount.value}groups`),
  });

function buildCaptures(): Array<{ element: HTMLElement; name: string }> {
  const report = analysisReportRef.value;
  if (!report) return [];

  const captures: Array<{ element: HTMLElement; name: string }> = [];

  if (report.summaryRef?.isConnected) {
    captures.push({ element: report.summaryRef, name: "summary" });
  }
  if (report.groupsTableRef?.isConnected) {
    captures.push({ element: report.groupsTableRef, name: "groups-table" });
  }
  for (let i = 0; i < report.groupsAndRepresentativeRefs.length; i++) {
    const el = report.groupsAndRepresentativeRefs[i];
    if (el?.isConnected) {
      captures.push({ element: el, name: `groups-rep-${i}` });
    }
  }
  if (report.agreementEmptyRef?.isConnected) {
    captures.push({
      element: report.agreementEmptyRef,
      name: "agreements-empty",
    });
  }
  for (let j = 0; j < report.agreementRefs.length; j++) {
    const el = report.agreementRefs[j];
    if (el?.isConnected) {
      captures.push({ element: el, name: `agreements-${j}` });
    }
  }
  if (report.disagreementEmptyRef?.isConnected) {
    captures.push({
      element: report.disagreementEmptyRef,
      name: "disagreements-empty",
    });
  }
  for (let j = 0; j < report.disagreementRefs.length; j++) {
    const el = report.disagreementRefs[j];
    if (el?.isConnected) {
      captures.push({ element: el, name: `disagreements-${j}` });
    }
  }
  if (report.divisiveEmptyRef?.isConnected) {
    captures.push({ element: report.divisiveEmptyRef, name: "divisive-empty" });
  }
  for (let j = 0; j < report.divisiveRefs.length; j++) {
    const el = report.divisiveRefs[j];
    if (el?.isConnected) {
      captures.push({ element: el, name: `divisive-${j}` });
    }
  }
  if (report.surveyEmptyRef?.isConnected) {
    captures.push({ element: report.surveyEmptyRef, name: "survey-empty" });
  }
  for (let j = 0; j < report.surveyRefs.length; j++) {
    const el = report.surveyRefs[j];
    if (el?.isConnected) {
      captures.push({ element: el, name: `survey-${j}` });
    }
  }
  if (report.allEmptyRef?.isConnected) {
    captures.push({ element: report.allEmptyRef, name: "all-empty" });
  }
  for (let j = 0; j < report.allRefs.length; j++) {
    const el = report.allRefs[j];
    if (el?.isConnected) {
      captures.push({ element: el, name: `all-${j}` });
    }
  }

  return captures;
}

async function handleDownloadZip(): Promise<void> {
  await nextTick();
  const captures = buildCaptures();
  if (captures.length > 0) {
    await downloadAsZip({ captures });
  }
}

async function handleDownloadPdf(): Promise<void> {
  itemsPerPage.value = REPORT_ITEMS_PER_PDF_PAGE;
  await nextTick();
  const captures = buildCaptures();
  if (captures.length > 0) {
    await downloadAsPdf({
      captures,
      footerElement: analysisReportRef.value?.footerRef ?? undefined,
    });
  }
  itemsPerPage.value = REPORT_ITEMS_PER_CAPTURE_PAGE;
}
</script>

<style lang="scss" scoped>
.page-layout {
  padding: 1rem;
}

.control-card {
  max-width: 600px;
  margin: 0 auto 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.controls-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: var(--font-weight-medium);
  color: $grey-9;
  font-size: 0.875rem;
}

.control-select {
  min-width: 220px;
}

.download-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.report-preview {
  border: 1px solid #e9e9f1;
  border-radius: 8px;
  overflow: hidden;
}
</style>

<style lang="scss">
@media print {
  .no-print,
  .q-drawer,
  .q-header,
  .q-footer {
    display: none !important;
  }
}
</style>
