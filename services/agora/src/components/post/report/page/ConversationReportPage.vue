<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar
        :title="t('pageTitle')"
        :center-content="true"
        :fallback-route="analysisFallbackRoute"
      />
    </Teleport>

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

    <div v-else class="report-page">
      <div class="toolbar no-print">
        <ZKButton
          button-type="compactButton"
          :disable="isGeneratingReport || !hasData"
          @click="handleDownloadZip"
        >
          <div class="toolbar-button-content">
            <ZKIcon name="mdi:image-outline" size="1.2rem" color="#333238" />
            <span>{{ isGeneratingZip ? t("generating") : t("downloadImages") }}</span>
          </div>
        </ZKButton>
        <ZKButton
          button-type="compactButton"
          :disable="isGeneratingReport || !hasData"
          @click="handleDownloadPdf"
        >
          <div class="toolbar-button-content">
            <ZKIcon name="mdi:file-pdf-box" size="1.2rem" color="#333238" />
            <span>{{ isGeneratingPdf ? t("generating") : t("downloadPdf") }}</span>
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
            <AnalysisReport
              v-if="reportFrame"
              ref="analysisReportRef"
              v-model:survey-display-mode="surveyDisplayMode"
              v-model:all-statements-order="allStatementsOrder"
              :items-per-page="itemsPerPage"
              :conversation-slug-id="conversationSlugId"
              :conversation-title="getReportConversationTitle(reportFrame)"
              :author-username="reportFrame.conversation.metadata.authorUsername"
              :conversation-organization-name="
                reportFrame.conversation.metadata.organization?.name ?? ''
              "
              :created-at="reportFrame.conversation.metadata.createdAt"
              :participant-count="reportCounts.participantCount"
              :opinion-count="reportCounts.opinionCount"
              :vote-count="reportCounts.voteCount"
              :total-participant-count="reportCounts.totalParticipantCount"
              :total-opinion-count="reportCounts.totalOpinionCount"
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
              :translation-interactive="!isGeneratingReport"
            />
          </AsyncStateHandler>
        </AsyncStateHandler>
      </AsyncStateHandler>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useConversationReport } from "src/composables/report/useConversationReport";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ReportPageTranslations,
  reportPageTranslations,
} from "src/pages/conversation/[conversationSlugId]/report.i18n";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import {
  getConversationAnalysisRoute,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed } from "vue";
import { useRoute } from "vue-router";

const { isActive } = usePageLayout({ enableFooter: false });
const { t } = useComponentI18n<ReportPageTranslations>(reportPageTranslations);
const route = useRoute();
const goBackButtonHandler = useGoBackButtonHandler();
const $q = useQuasar();

const conversationSlugId = computed(() =>
  getSingleRouteParam(
    "conversationSlugId" in route.params
      ? route.params.conversationSlugId
      : undefined
  )
);

const {
  analysisRouteQuery,
  conversationQuery,
  analysisQuery,
  surveyResultsQuery,
  surveyDisplayMode,
  allStatementsOrder,
  reportFrame,
  reportCounts,
  polisClusters,
  agreementItems,
  disagreementItems,
  divisiveItems,
  allItems,
  reportSurveyRows,
  showSurveyToggle,
  hasData,
  analysisReportRef,
  itemsPerPage,
  isGeneratingZip,
  isGeneratingPdf,
  isGeneratingReport,
  handleDownloadZip,
  handleDownloadPdf,
} = useConversationReport({ conversationSlugId });

const allStatementsOrderOptions = computed(() => [
  { label: t("allStatementsOrderNewest"), value: "newest" as const },
  { label: t("allStatementsOrderAgreement"), value: "agreement" as const },
  { label: t("allStatementsOrderDisagreement"), value: "disagreement" as const },
  { label: t("allStatementsOrderDivisive"), value: "divisive" as const },
]);
const analysisFallbackRoute = computed(() =>
  getConversationAnalysisRoute({
    conversationSlugId: conversationSlugId.value,
    routeContext: normalConversationRouteContext,
    query: analysisRouteQuery.value,
  })
);

function getReportConversationTitle(reportFrame: {
  conversationDisplayContent: ConversationContentFetchResponse;
}): string {
  const { conversationDisplayContent } = reportFrame;
  return conversationDisplayContent.status === "available"
    ? conversationDisplayContent.content.title
    : "";
}
const isNarrowScreen = computed(() => $q.screen.xs);

async function handleNarrowBack(): Promise<void> {
  await goBackButtonHandler.safeNavigateBack(analysisFallbackRoute.value);
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
  .content-translation-interaction,
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
