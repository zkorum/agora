<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar
        :title="t('pageTitle')"
        :center-content="true"
        :fallback-route="`/conversation/${conversationSlugId}/analysis`"
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
    <div v-else class="report-page">
      <div class="toolbar no-print">
        <ZKButton
          button-type="compactButton"
          :disable="isGeneratingZip || !hasData"
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
          :disable="isGeneratingPdf || !hasData"
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
                v-if="
                  conversationQuery.data.value &&
                  analysisQuery.data.value &&
                  surveyResultsQuery.data.value
                "
                ref="analysisReportRef"
                v-model:survey-display-mode="surveyDisplayMode"
                v-model:all-statements-order="allStatementsOrder"
                :items-per-page="itemsPerPage"
                :conversation-slug-id="conversationSlugId"
                :conversation-title="conversationQuery.data.value.payload.title"
                :author-username="
                  conversationQuery.data.value.metadata.authorUsername
                "
                :created-at="conversationQuery.data.value.metadata.createdAt"
                :participant-count="
                  conversationQuery.data.value.metadata.participantCount
                "
                :opinion-count="
                  conversationQuery.data.value.metadata.opinionCount
                "
                :vote-count="conversationQuery.data.value.metadata.voteCount"
                :total-participant-count="
                  conversationQuery.data.value.metadata.totalParticipantCount
                "
                :total-opinion-count="
                  conversationQuery.data.value.metadata.totalOpinionCount
                "
                :total-vote-count="
                  conversationQuery.data.value.metadata.totalVoteCount
                "
                :clusters="polisClusters"
                :agreement-items="agreementItems"
                :disagreement-items="disagreementItems"
                :divisive-items="divisiveItems"
                :all-items="allItems"
                :all-statements-order-options="allStatementsOrderOptions"
                :has-survey="surveyResultsQuery.data.value.hasSurvey"
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
import type { PolisClusters } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
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
import { useRoute } from "vue-router";

import {
  type ReportPageTranslations,
  reportPageTranslations,
} from "./report.i18n";

const { isActive } = usePageLayout({ enableFooter: false });

const { t } = useComponentI18n<ReportPageTranslations>(reportPageTranslations);

const authStore = useAuthenticationStore();
const { isAuthInitialized } = storeToRefs(authStore);

const route = useRoute();
const goBackButtonHandler = useGoBackButtonHandler();

const conversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.conversationSlugId);
});

async function handleNarrowBack(): Promise<void> {
  await goBackButtonHandler.safeNavigateBack(
    `/conversation/${conversationSlugId.value}/analysis`
  );
}

const conversationQuery = useConversationQuery({
  conversationSlugId: conversationSlugId,
  enabled: computed(() => isAuthInitialized.value),
});

const analysisQuery = useAnalysisQuery({
  conversationSlugId: conversationSlugId,
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

const allStatementsOrderOptions = computed(() => [
  { label: t("allStatementsOrderNewest"), value: "newest" as const },
  { label: t("allStatementsOrderAgreement"), value: "agreement" as const },
  { label: t("allStatementsOrderDisagreement"), value: "disagreement" as const },
  { label: t("allStatementsOrderDivisive"), value: "divisive" as const },
]);

const polisClusters = computed<Partial<PolisClusters>>(
  () => analysisQuery.data.value?.polisClusters ?? {}
);

const hasGroupAnalysis = computed(
  () => Object.keys(polisClusters.value).length >= 2
);

const showSurveyToggle = computed(
  () =>
    surveyResultsQuery.data.value?.hasSurvey === true &&
    canViewFullSurveyResults({ surveyResults: surveyResultsQuery.data.value })
);

const reportSurveyRows = computed(() =>
  getDisplayedSurveyRows({
    surveyResults: surveyResultsQuery.data.value,
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
    items: analysisQuery.data.value?.consensusAgree ?? [],
    getScore: (item) => item.groupAwareConsensusAgree,
  })
);

const disagreementItems = computed(() =>
  getReportOpinions({
    items: analysisQuery.data.value?.consensusDisagree ?? [],
    getScore: (item) => item.groupAwareConsensusDisagree,
  })
);

const divisiveItems = computed(() => {
  const items = (analysisQuery.data.value?.controversial ?? []).filter(
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
      ...(analysisQuery.data.value?.consensusAgree ?? []),
      ...(analysisQuery.data.value?.consensusDisagree ?? []),
      ...(analysisQuery.data.value?.controversial ?? []),
    ],
  })
);

const hasData = computed(
  () =>
    conversationQuery.data.value !== undefined &&
    analysisQuery.data.value !== undefined &&
    surveyResultsQuery.data.value !== undefined
);

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
  const title = conversationQuery.data.value?.payload.title ?? "analysis";
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
.report-page {
  padding: 1rem;
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
