<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar
        :title="t('pageTitle')"
        :center-content="true"
        :fallback-route="analysisFallbackRoute"
      />
    </Teleport>

    <!-- Narrow screen message -->
    <div v-if="isNarrowScreen" class="narrow-screen-message">
      <div class="narrow-screen-content">
        <q-icon name="mdi-monitor" size="3rem" color="grey-6" />
        <h2 class="narrow-title">{{ t("narrowScreenTitle") }}</h2>
        <p class="narrow-text">{{ t("narrowScreenMessage") }}</p>
        <ZKButton button-type="compactButton" @click="handleNarrowBack">
          {{ t("goBack") }}
        </ZKButton>
      </div>
    </div>

    <!-- Report content (desktop only) -->
    <div
      v-else
      class="report-page"
      :class="{ 'report-page--project-context': projectContext }"
    >
      <div class="toolbar no-print">
        <ZKButton
          button-type="compactButton"
          :disable="isGeneratingReport || !hasData"
          @click="handleDownloadZip"
        >
          <div class="toolbar-button-content">
            <ZKIcon name="mdi:image-outline" size="1.2rem" color="#333238" />
            <span>{{
              isGeneratingZip ? t("generating") : t("downloadImages")
            }}</span>
          </div>
        </ZKButton>
        <ZKButton
          button-type="compactButton"
          :disable="isGeneratingReport || !hasData"
          @click="handleDownloadPdf"
        >
          <div class="toolbar-button-content">
            <ZKIcon name="mdi:file-pdf-box" size="1.2rem" color="#333238" />
            <span>{{
              isGeneratingPdf ? t("generating") : t("downloadPdf")
            }}</span>
          </div>
        </ZKButton>
      </div>

      <AsyncStateHandler
        :query="conversationQuery"
        :config="{ error: { title: t('loadingError') } }"
      >
        <AsyncStateHandler
          :query="analysisQuery"
          :config="{ error: { title: t('loadingError') } }"
        >
          <AsyncStateHandler
            :query="surveyResultsQuery"
            :config="{ error: { title: t('loadingError') } }"
          >
            <div>
              <AnalysisReport
                v-if="reportFrame"
                ref="analysisReportRef"
                v-model:survey-display-mode="surveyDisplayMode"
                v-model:all-statements-order="allStatementsOrder"
                :items-per-page="itemsPerPage"
                :conversation-slug-id="conversationSlugId"
                :conversation-title="reportFrame.conversation.payload.title"
                :author-username="
                  reportFrame.conversation.metadata.authorUsername
                "
                :conversation-organization-name="
                  reportFrame.conversation.metadata.organization?.name ?? ''
                "
                :created-at="reportFrame.conversation.metadata.createdAt"
                :participant-count="
                  reportCounts.participantCount
                "
                :opinion-count="reportCounts.opinionCount"
                :vote-count="reportCounts.voteCount"
                :total-participant-count="
                  reportCounts.totalParticipantCount
                "
                :total-opinion-count="
                  reportCounts.totalOpinionCount
                "
                :total-vote-count="reportCounts.totalVoteCount"
                :clusters="polisClusters"
                :agreement-items="agreementItems"
                :disagreement-items="disagreementItems"
                :divisive-items="divisiveItems"
                :all-items="allItems"
                :all-statements-order-options="allStatementsOrderOptions"
                :has-survey="reportFrame.surveyResults.hasSurvey"
                :survey-rows="reportSurveyRows"
                :show-survey-toggle="showSurveyToggle"
              />
            </div>
          </AsyncStateHandler>
        </AsyncStateHandler>
      </AsyncStateHandler>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useReportDownload } from "src/composables/report/useReportDownload";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ReportPageTranslations,
  reportPageTranslations,
} from "src/pages/conversation/[conversationSlugId]/report.i18n";
import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type { ExtendedConversation, PolisClusters } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  getUpdatedAnalysisRouteQuery,
  parseAnalysisViewQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import type { AnalysisData } from "src/utils/api/comment/comment";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import { getDisplayPolisClusters } from "src/utils/component/opinion";
import {
  getReportAllOpinions,
  getReportOpinions,
  REPORT_ITEMS_PER_CAPTURE_PAGE,
  REPORT_ITEMS_PER_PDF_PAGE,
  type ReportAllStatementsOrder,
} from "src/utils/component/report/reportData";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  canViewFullSurveyResults,
  getDisplayedSurveyRows,
  type SurveyResultsDisplayMode,
} from "src/utils/survey/results";
import { computed, nextTick, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useRoute } from "vue-router";

defineProps<{
  projectContext?: boolean;
}>();

const { isActive } = usePageLayout({ enableFooter: false });

const { t } = useComponentI18n<ReportPageTranslations>(reportPageTranslations);

const authStore = useAuthenticationStore();
const { isAuthInitialized } = storeToRefs(authStore);

const route = useRoute();
const goBackButtonHandler = useGoBackButtonHandler();

const conversationSlugId = computed(() => {
  if (!("conversationSlugId" in route.params)) {
    return "";
  }

  return getSingleRouteParam(route.params.conversationSlugId);
});
const analysisView = computed(() => parseAnalysisViewQuery({ query: route.query }));
const checkpointViewSnapshotId = computed(() =>
  parseCheckpointQuery({ query: route.query })
);

const analysisFallbackRoute = computed<RouteLocationRaw>(() => ({
  path:
    projectSlug.value === undefined
      ? `/conversation/${conversationSlugId.value}/analysis`
      : `/project/${projectSlug.value}/conversation/${conversationSlugId.value}/analysis`,
  query: getUpdatedAnalysisRouteQuery({
    query: {},
    analysisView: analysisView.value,
    checkpointViewSnapshotId: checkpointViewSnapshotId.value,
  }),
}));

const projectSlug = computed(() => {
  if (!("projectSlug" in route.params)) {
    return undefined;
  }

  const value = getSingleRouteParam(route.params.projectSlug);
  return value.length === 0 ? undefined : value;
});

async function handleNarrowBack(): Promise<void> {
  await goBackButtonHandler.safeNavigateBack(analysisFallbackRoute.value);
}

const conversationQuery = useConversationQuery({
  conversationSlugId: conversationSlugId,
  enabled: computed(() => isAuthInitialized.value),
});

const analysisQuery = useAnalysisQuery({
  conversationSlugId: conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  aiLabelingEnabled: computed(
    () => conversationQuery.data.value?.metadata.aiLabelingEnabled
  ),
  voteCount: computed(() => conversationQuery.data.value?.metadata.voteCount),
  enabled: computed(
    () => isAuthInitialized.value && conversationQuery.data.value !== undefined
  ),
});

const surveyResultsQuery = useSurveyResultsAggregatedQuery({
  conversationSlugId,
  enabled: computed(
    () => isAuthInitialized.value && conversationQuery.data.value !== undefined
  ),
});

const surveyDisplayMode = ref<SurveyResultsDisplayMode>("suppressed");
const allStatementsOrder = ref<ReportAllStatementsOrder>("newest");

interface ReportFrame {
  conversation: ExtendedConversation;
  analysis: AnalysisData;
  surveyResults: SurveyResultsAggregatedResponse;
}

const liveReportFrame = computed<ReportFrame | undefined>(() => {
  const conversation = conversationQuery.data.value;
  const analysis = analysisQuery.data.value;
  const surveyResults = surveyResultsQuery.data.value;

  if (
    conversation === undefined ||
    analysis === undefined ||
    surveyResults === undefined
  ) {
    return undefined;
  }

  return { conversation, analysis, surveyResults };
});

const frozenReportFrame = ref<ReportFrame | undefined>(undefined);
const reportFrame = computed(
  () => frozenReportFrame.value ?? liveReportFrame.value
);

const allStatementsOrderOptions = computed(() => [
  { label: t("allStatementsOrderNewest"), value: "newest" as const },
  { label: t("allStatementsOrderAgreement"), value: "agreement" as const },
  { label: t("allStatementsOrderDisagreement"), value: "disagreement" as const },
  { label: t("allStatementsOrderDivisive"), value: "divisive" as const },
]);

const polisClusters = computed<Partial<PolisClusters>>(
  () =>
    getDisplayPolisClusters({
      clusters: reportFrame.value?.analysis.polisClusters ?? {},
      aiLabelingEnabled:
        reportFrame.value?.conversation.metadata.aiLabelingEnabled ?? true,
    })
);

const hasGroupAnalysis = computed(
  () => Object.keys(polisClusters.value).length >= 2
);

const reportCounts = computed(() => {
  const metadata = reportFrame.value?.conversation.metadata;
  const snapshot = reportFrame.value?.analysis.conversationViewSnapshot;

  return {
    participantCount: snapshot?.participantCount ?? metadata?.participantCount ?? 0,
    opinionCount: snapshot?.opinionCount ?? metadata?.opinionCount ?? 0,
    voteCount: snapshot?.voteCount ?? metadata?.voteCount ?? 0,
    totalParticipantCount:
      snapshot?.totalParticipantCount ?? metadata?.totalParticipantCount ?? 0,
    totalOpinionCount:
      snapshot?.totalOpinionCount ?? metadata?.totalOpinionCount ?? 0,
    totalVoteCount: snapshot?.totalVoteCount ?? metadata?.totalVoteCount ?? 0,
  };
});

const showSurveyToggle = computed(
  () => {
    const frame = reportFrame.value;
    return (
      frame?.surveyResults.hasSurvey === true &&
      canViewFullSurveyResults({ surveyResults: frame.surveyResults })
    );
  }
);

const reportSurveyRows = computed(() =>
  getDisplayedSurveyRows({
    surveyResults: reportFrame.value?.surveyResults,
    displayMode: surveyDisplayMode.value,
  }).filter((row) => hasGroupAnalysis.value || row.scope === "overall")
);

watch(
  showSurveyToggle,
  (shouldShow) => {
    if (!shouldShow) {
      surveyDisplayMode.value = "suppressed";
    }
  },
  { immediate: true }
);

// Full items (top 10)
const agreementItems = computed(() =>
  getReportOpinions({
    items: reportFrame.value?.analysis.consensusAgree ?? [],
    getScore: (item) => item.groupAwareConsensusAgree,
  })
);

const disagreementItems = computed(() =>
  getReportOpinions({
    items: reportFrame.value?.analysis.consensusDisagree ?? [],
    getScore: (item) => item.groupAwareConsensusDisagree,
  })
);

const divisiveItems = computed(() => {
  const items = (reportFrame.value?.analysis.controversial ?? []).filter(
    (item) => item.divisiveScore > 0
  );
  const maxDivisive = Math.max(...items.map((item) => item.divisiveScore), 0);
  return getReportOpinions({
    items,
    getScore: (item) =>
      maxDivisive > 0 ? item.divisiveScore / maxDivisive : 0,
  });
});

const allItems = computed(() =>
  getReportAllOpinions({
    order: allStatementsOrder.value,
    items: [
      ...(reportFrame.value?.analysis.consensusAgree ?? []),
      ...(reportFrame.value?.analysis.consensusDisagree ?? []),
      ...(reportFrame.value?.analysis.controversial ?? []),
    ],
  })
);

const hasData = computed(() => liveReportFrame.value !== undefined);

// Narrow screen detection — uses Quasar Screen plugin (reads $breakpoint-xs from SCSS)
const $q = useQuasar();
const isNarrowScreen = computed(() => $q.screen.xs);

// Report capture refs
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

const reportFileName = computed(() => {
  const title = reportFrame.value?.conversation.payload.title ?? "analysis";
  const sanitized = title
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
  return `agora-report-${sanitized}`;
});

const itemsPerPage = ref(REPORT_ITEMS_PER_CAPTURE_PAGE);

const { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf } =
  useReportDownload({
    fileName: reportFileName,
  });

const isGeneratingReport = computed(
  () => isGeneratingZip.value || isGeneratingPdf.value
);

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
  await runWithFrozenReportFrame(async () => {
    await nextTick();
    const captures = buildCaptures();
    if (captures.length > 0) {
      await downloadAsZip({ captures });
    }
  });
}

async function handleDownloadPdf(): Promise<void> {
  await runWithFrozenReportFrame(async () => {
    itemsPerPage.value = REPORT_ITEMS_PER_PDF_PAGE;
    try {
      await nextTick();
      const captures = buildCaptures();
      if (captures.length > 0) {
        await downloadAsPdf({
          captures,
          footerElement: analysisReportRef.value?.footerRef ?? undefined,
        });
      }
    } finally {
      itemsPerPage.value = REPORT_ITEMS_PER_CAPTURE_PAGE;
    }
  });
}

async function runWithFrozenReportFrame(
  download: () => Promise<void>
): Promise<void> {
  const frame = liveReportFrame.value;
  if (frame === undefined) {
    return;
  }

  frozenReportFrame.value = frame;
  try {
    await nextTick();
    await download();
  } finally {
    frozenReportFrame.value = undefined;
  }
}
</script>

<style lang="scss" scoped>
.report-page {
  padding: 1rem;
}

.report-page--project-context {
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
  border: 1px solid rgba(233, 235, 239, 0.8);
  border-radius: 26px;
  background: white;
  box-shadow:
    0 0.2rem 0.9rem rgba(10, 7, 20, 0.05),
    0 1.35rem 2.8rem -1.6rem rgba(10, 7, 20, 0.16);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
}

.toolbar-button-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333238;
}

.narrow-screen-message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.narrow-screen-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  max-width: 300px;
}

.narrow-title {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: #333238;
  margin: 0;
}

.narrow-text {
  font-size: 0.875rem;
  color: #6d6a74;
  margin: 0;
  line-height: 1.5;
}
</style>

<style lang="scss">
@media print {
  .no-print,
  .q-drawer,
  .q-header,
  .q-footer,
  .toolbar {
    display: none !important;
  }

  .report-page {
    padding: 0 !important;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }
}
</style>
