<template>
  <div>
    <div v-if="isNarrowScreen" class="project-report__narrow-screen-message">
      <div class="project-report__narrow-screen-content">
        <q-icon name="mdi-monitor" size="3rem" color="grey-6" />
        <h2 class="project-report__narrow-title">{{ t("narrowScreenTitle") }}</h2>
        <p class="project-report__narrow-text">{{ t("narrowScreenMessage") }}</p>
        <ZKButton button-type="compactButton" @click="handleNarrowBack">
          {{ t("goBack") }}
        </ZKButton>
      </div>
    </div>

    <div v-else class="project-report">
      <div class="project-report__toolbar no-print">
        <SpaLink :to="analysisRoute" class="project-report__return-link">
          <q-icon name="mdi-chevron-left" size="1rem" />
          <span>Return to live analysis</span>
        </SpaLink>

        <div class="project-report__download-actions">
          <ZKButton
            button-type="compactButton"
            :disable="isGeneratingReport || !hasData"
            @click="handleDownloadZip"
          >
            <div class="project-report__download-button-content">
              <ZKIcon name="mdi:image-outline" size="1.2rem" color="#333238" />
              <span>{{ isGeneratingZip ? t("generating") : t("downloadImages") }}</span>
            </div>
          </ZKButton>
          <ZKButton
            button-type="compactButton"
            :disable="isGeneratingReport || !hasData"
            @click="handleDownloadPdf"
          >
            <div class="project-report__download-button-content">
              <ZKIcon name="mdi:file-pdf-box" size="1.2rem" color="#333238" />
              <span>{{ isGeneratingPdf ? t("generating") : t("downloadPdf") }}</span>
            </div>
          </ZKButton>
        </div>
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
            <section v-if="reportFrame" class="project-report__report-card">
              <AnalysisReport
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
            </section>
          </AsyncStateHandler>
        </AsyncStateHandler>
      </AsyncStateHandler>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useConversationReport } from "src/composables/report/useConversationReport";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ReportPageTranslations,
  reportPageTranslations,
} from "src/pages/conversation/[conversationSlugId]/report.i18n";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { getConversationAnalysisRoute } from "src/utils/router/conversationRouteContext";
import { computed } from "vue";

const props = defineProps<{
  conversationData: ExtendedConversationDisplayData;
  conversationRouteContext: ConversationRouteContext;
}>();

const { t } = useComponentI18n<ReportPageTranslations>(reportPageTranslations);
const $q = useQuasar();
const goBackButtonHandler = useGoBackButtonHandler();
const isNarrowScreen = computed(() => $q.screen.xs);
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
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
const analysisRoute = computed(() =>
  getConversationAnalysisRoute({
    conversationSlugId: conversationSlugId.value,
    routeContext: props.conversationRouteContext,
    query: analysisRouteQuery.value,
  })
);

async function handleNarrowBack(): Promise<void> {
  await goBackButtonHandler.safeNavigateBack(analysisRoute.value);
}

function getReportConversationTitle(reportFrame: {
  conversationDisplayContent: ConversationContentFetchResponse;
}): string {
  const { conversationDisplayContent } = reportFrame;
  return conversationDisplayContent.status === "available"
    ? conversationDisplayContent.content.title
    : "";
}
</script>

<style scoped lang="scss">
.project-report {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-report__toolbar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-report__return-link {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: $primary;
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.project-report__download-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.project-report__download-button-content {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.project-report__report-card {
  overflow: hidden;
  border: 1px solid rgba(233, 235, 239, 0.8);
  border-radius: 26px;
  background: white;
  box-shadow:
    0 0.2rem 0.9rem rgba(10, 7, 20, 0.05),
    0 1.35rem 2.8rem -1.6rem rgba(10, 7, 20, 0.16);
}

.project-report__narrow-screen-message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.project-report__narrow-screen-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 300px;
  text-align: center;
}

.project-report__narrow-title {
  margin: 0;
  color: #333238;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
}

.project-report__narrow-text {
  margin: 0;
  color: #6d6a74;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
