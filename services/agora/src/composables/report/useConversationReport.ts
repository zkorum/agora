import { storeToRefs } from "pinia";
import type {
  ConversationContentFetchResponse,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  ExtendedConversationDisplayData,
  PolisClusters,
} from "src/shared/types/zod";
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
import {
  canViewFullSurveyResults,
  getDisplayedSurveyRows,
  type SurveyResultsDisplayMode,
} from "src/utils/survey/results";
import { computed, nextTick, type Ref, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useReportDownload } from "./useReportDownload";

export interface AnalysisReportExposed {
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

interface ReportFrame {
  conversation: ExtendedConversationDisplayData;
  conversationDisplayContent: ConversationContentFetchResponse;
  analysis: AnalysisData;
  surveyResults: SurveyResultsAggregatedResponse;
}

export function useConversationReport({
  conversationSlugId,
}: {
  conversationSlugId: Ref<string>;
}) {
  const route = useRoute();
  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);

  const analysisView = computed(() => parseAnalysisViewQuery({ query: route.query }));
  const checkpointViewSnapshotId = computed(() =>
    parseCheckpointQuery({ query: route.query })
  );
  const analysisRouteQuery = computed(() =>
    getUpdatedAnalysisRouteQuery({
      query: {},
      analysisView: analysisView.value,
      checkpointViewSnapshotId: checkpointViewSnapshotId.value,
    })
  );

  const conversationQuery = useConversationQuery({
    conversationSlugId,
    enabled: computed(() => isAuthInitialized.value),
  });

  const analysisQuery = useAnalysisQuery({
    conversationSlugId,
    analysisView,
    checkpointViewSnapshotId,
    aiLabelingEnabled: computed(
      () => conversationQuery.data.value?.conversationData.metadata.aiLabelingEnabled
    ),
    voteCount: computed(
      () => conversationQuery.data.value?.conversationData.metadata.voteCount
    ),
    enabled: computed(
      () => isAuthInitialized.value && conversationQuery.data.value !== undefined
    ),
  });

  const surveyResultsQuery = useSurveyResultsAggregatedQuery({
    conversationSlugId,
    analysisView,
    checkpointViewSnapshotId,
    enabled: computed(
      () => isAuthInitialized.value && conversationQuery.data.value !== undefined
    ),
  });

  const surveyDisplayMode = ref<SurveyResultsDisplayMode>("suppressed");
  const allStatementsOrder = ref<ReportAllStatementsOrder>("newest");

  const liveReportFrame = computed<ReportFrame | undefined>(() => {
    const conversation = conversationQuery.data.value?.conversationData;
    const conversationDisplayContent = conversationQuery.data.value?.displayContent;
    const analysis = analysisQuery.data.value;
    const surveyResults = surveyResultsQuery.data.value;

    if (
      conversation === undefined ||
      conversationDisplayContent === undefined ||
      analysis === undefined ||
      surveyResults === undefined
    ) {
      return undefined;
    }

    return { conversation, conversationDisplayContent, analysis, surveyResults };
  });

  const frozenReportFrame = ref<ReportFrame | undefined>(undefined);
  const reportFrame = computed(
    () => frozenReportFrame.value ?? liveReportFrame.value
  );

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

  const showSurveyToggle = computed(() => {
    const frame = reportFrame.value;
    return (
      frame?.surveyResults.hasSurvey === true &&
      canViewFullSurveyResults({ surveyResults: frame.surveyResults })
    );
  });

  watch(
    showSurveyToggle,
    (shouldShow) => {
      if (!shouldShow) {
        surveyDisplayMode.value = "suppressed";
      }
    },
    { immediate: true }
  );

  const reportSurveyRows = computed(() =>
    getDisplayedSurveyRows({
      surveyResults: reportFrame.value?.surveyResults,
      displayMode: surveyDisplayMode.value,
    }).filter((row) => hasGroupAnalysis.value || row.scope === "overall")
  );

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
  const analysisReportRef = ref<AnalysisReportExposed | null>(null);
  const reportFileName = computed(() => {
    const displayContent = reportFrame.value?.conversationDisplayContent;
    const title =
      displayContent?.status === "available"
        ? displayContent.content.title
        : "analysis";
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
  const isPreparingReportExport = ref(false);
  const isGeneratingReport = computed(
    () =>
      isPreparingReportExport.value ||
      isGeneratingZip.value ||
      isGeneratingPdf.value
  );

  function buildCaptures(): Array<{ element: HTMLElement; name: string }> {
    const report = analysisReportRef.value;
    if (report === null) return [];

    const captures: Array<{ element: HTMLElement; name: string }> = [];
    if (report.summaryRef?.isConnected) {
      captures.push({ element: report.summaryRef, name: "summary" });
    }
    if (report.groupsTableRef?.isConnected) {
      captures.push({ element: report.groupsTableRef, name: "groups-table" });
    }
    for (let i = 0; i < report.groupsAndRepresentativeRefs.length; i++) {
      const element = report.groupsAndRepresentativeRefs[i];
      if (element?.isConnected) {
        captures.push({ element, name: `groups-rep-${i.toString()}` });
      }
    }
    if (report.agreementEmptyRef?.isConnected) {
      captures.push({ element: report.agreementEmptyRef, name: "agreements-empty" });
    }
    for (let i = 0; i < report.agreementRefs.length; i++) {
      const element = report.agreementRefs[i];
      if (element?.isConnected) {
        captures.push({ element, name: `agreements-${i.toString()}` });
      }
    }
    if (report.disagreementEmptyRef?.isConnected) {
      captures.push({
        element: report.disagreementEmptyRef,
        name: "disagreements-empty",
      });
    }
    for (let i = 0; i < report.disagreementRefs.length; i++) {
      const element = report.disagreementRefs[i];
      if (element?.isConnected) {
        captures.push({ element, name: `disagreements-${i.toString()}` });
      }
    }
    if (report.divisiveEmptyRef?.isConnected) {
      captures.push({ element: report.divisiveEmptyRef, name: "divisive-empty" });
    }
    for (let i = 0; i < report.divisiveRefs.length; i++) {
      const element = report.divisiveRefs[i];
      if (element?.isConnected) {
        captures.push({ element, name: `divisive-${i.toString()}` });
      }
    }
    if (report.surveyEmptyRef?.isConnected) {
      captures.push({ element: report.surveyEmptyRef, name: "survey-empty" });
    }
    for (let i = 0; i < report.surveyRefs.length; i++) {
      const element = report.surveyRefs[i];
      if (element?.isConnected) {
        captures.push({ element, name: `survey-${i.toString()}` });
      }
    }
    if (report.allEmptyRef?.isConnected) {
      captures.push({ element: report.allEmptyRef, name: "all-empty" });
    }
    for (let i = 0; i < report.allRefs.length; i++) {
      const element = report.allRefs[i];
      if (element?.isConnected) {
        captures.push({ element, name: `all-${i.toString()}` });
      }
    }

    return captures;
  }

  async function runWithFrozenReportFrame(
    download: () => Promise<void>
  ): Promise<void> {
    const frame = liveReportFrame.value;
    if (frame === undefined) {
      return;
    }

    isPreparingReportExport.value = true;
    frozenReportFrame.value = frame;
    try {
      await nextTick();
      await download();
    } finally {
      frozenReportFrame.value = undefined;
      isPreparingReportExport.value = false;
    }
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

  return {
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
  };
}
