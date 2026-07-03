<template>
  <ProjectConversationView
    v-model:selected-language="selectedLanguage"
    :project="project"
    :conversation-data="conversationData"
    :language-options="languageOptions"
    report-layout
  >
    <template #conversation-actions>
      <div ref="actionBarRef">
        <PostActionBar
          v-model="currentTab"
          :compact-mode="false"
          :opinion-count="conversation.stats.opinionCount"
          :participant-count="conversation.stats.participantCount"
          :vote-count="conversation.stats.voteCount"
          :total-participant-count="conversation.stats.participantCount"
          :total-vote-count="conversation.stats.voteCount"
          :conversation-slug-id="conversation.slugId"
          :conversation-title="conversation.title"
          author-username="project-team"
          :conversation-type="conversation.conversationType"
          :enable-route-navigation="false"
          :on-same-tab-click="scrollToActionBar"
        />
      </div>
    </template>

    <template #conversation-toolbar>
      <div class="project-report-dev__toolbar">
        <SpaLink
          :to="{ path: '/dev/project-conversation-layout', query: { tab: 'analysis' } }"
          class="project-report-dev__return-link"
        >
          <q-icon name="mdi-chevron-left" size="1rem" />
          <span>Return to live analysis</span>
        </SpaLink>

        <div class="project-report-dev__download-actions no-print">
          <ZKButton
            button-type="compactButton"
            :disable="isGeneratingReport"
            @click="handleDownloadZip"
          >
            <div class="project-report-dev__download-button-content">
              <ZKIcon name="mdi:image-outline" size="1.2rem" color="#333238" />
              <span>{{ isGeneratingZip ? "Generating..." : "Download images" }}</span>
            </div>
          </ZKButton>
          <ZKButton
            button-type="compactButton"
            :disable="isGeneratingReport"
            @click="handleDownloadPdf"
          >
            <div class="project-report-dev__download-button-content">
              <ZKIcon name="mdi:file-pdf-box" size="1.2rem" color="#333238" />
              <span>{{ isGeneratingPdf ? "Generating..." : "Download PDF" }}</span>
            </div>
          </ZKButton>
        </div>
      </div>
    </template>

    <template #conversation-feed>
      <section class="project-report-dev__report-card">
        <AnalysisReport
          ref="analysisReportRef"
          v-model:survey-display-mode="surveyDisplayMode"
          v-model:all-statements-order="allStatementsOrder"
          :items-per-page="itemsPerPage"
          :conversation-slug-id="conversation.slugId"
          :conversation-title="conversation.title"
          author-username="project-team"
          conversation-organization-name=""
          :created-at="createdAt"
          :participant-count="reportCounts.participantCount"
          :opinion-count="reportCounts.opinionCount"
          :vote-count="reportCounts.voteCount"
          :total-participant-count="reportCounts.totalParticipantCount"
          :total-opinion-count="reportCounts.totalOpinionCount"
          :total-vote-count="reportCounts.totalVoteCount"
          :clusters="analysisData.polisClusters"
          :agreement-items="agreementItems"
          :disagreement-items="disagreementItems"
          :divisive-items="divisiveItems"
          :all-items="allItems"
          :all-statements-order-options="allStatementsOrderOptions"
          :has-survey="surveyResults.hasSurvey"
          :survey-rows="surveyRows"
          :show-survey-toggle="true"
        />
      </section>
    </template>
  </ProjectConversationView>
</template>

<script setup lang="ts">
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import ProjectConversationView from "src/components/project/ProjectConversationView.vue";
import type {
  ProjectLanguageOption,
  ProjectPageData,
} from "src/components/project/projectPageTypes";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useReportDownload } from "src/composables/report/useReportDownload";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ExtendedConversation } from "src/shared/types/zod";
import {
  getReportAllOpinions,
  getReportOpinions,
  REPORT_ITEMS_PER_CAPTURE_PAGE,
  REPORT_ITEMS_PER_PDF_PAGE,
  type ReportAllStatementsOrder,
} from "src/utils/component/report/reportData";
import { getDisplayedSurveyRows, type SurveyResultsDisplayMode } from "src/utils/survey/results";
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  buildMockAnalysisData,
  buildMockSurveyResults,
} from "./analysisTestData";

type DevLanguage = "en" | "ky" | "ru";

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

usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  enableHeader: false,
});

const selectedLanguage = ref<SupportedDisplayLanguageCodes>("en");
const currentTab = ref<"comment" | "analysis">("analysis");
const actionBarRef = ref<HTMLElement | null>(null);
const analysisReportRef = ref<AnalysisReportExposed | null>(null);
const surveyDisplayMode = ref<SurveyResultsDisplayMode>("suppressed");
const allStatementsOrder = ref<ReportAllStatementsOrder>("newest");
const itemsPerPage = ref(REPORT_ITEMS_PER_CAPTURE_PAGE);
const createdAt = new Date("2026-07-01T12:00:00.000Z");
const router = useRouter();

const localProjectAssetBaseUrl = "/local-project-assets/project-page";
const civicUnionImageUrlsByLanguage = {
  en: new URL("../../assets/project-page/civic-union-logo-en.svg", import.meta.url)
    .href,
  ky: new URL("../../assets/project-page/civic-union-logo-ky.svg", import.meta.url)
    .href,
  ru: new URL("../../assets/project-page/civic-union-logo-ru.svg", import.meta.url)
    .href,
} satisfies Readonly<Record<DevLanguage, string>>;

const languageOptions = computed<readonly ProjectLanguageOption[]>(() => [
  {
    label: "English",
    shortLabel: "EN",
    value: "en",
    caption: "Supported by this project",
    projectSupported: true,
    searchText: "EN English",
  },
]);

const project = computed<ProjectPageData>(() => ({
  slug: "voices-for-change",
  title: "Voices for Change",
  subtitle: "Civic dialogue in Kyrgyzstan",
  bodyHtml:
    "A national consultation gathering ideas from community members, public institutions, and civil-society groups.",
  originalContent: {
    title: "Voices for Change",
    subtitle: "Civic dialogue in Kyrgyzstan",
    bodyHtml:
      "A national consultation gathering ideas from community members, public institutions, and civil-society groups.",
  },
  machineTranslation: undefined,
  bannerVariant: "blue",
  bannerImageUrl: `${localProjectAssetBaseUrl}/project-banner-en.png`,
  participantCount: 214,
  voteCount: 2100,
  activityCount: 4,
  attributions: [
    {
      role: "sponsor",
      displayName: "European Union",
      description: "Funding partner for public dialogue programs.",
      websiteUrl: "https://european-union.europa.eu/",
      initials: "EU",
      accentColor: "#003399",
      imageUrl: undefined,
    },
    {
      role: "project_owner",
      displayName: "Kurak Foundation",
      description: "Project coordination and outreach.",
      websiteUrl: "https://example.org/kurak",
      initials: "KF",
      accentColor: "#1A5FB4",
      imageUrl: civicUnionImageUrlsByLanguage.en,
    },
    {
      role: "partner",
      displayName: "Search for Common Ground",
      description: "Peacebuilding and facilitation partner.",
      websiteUrl: "https://www.searchforcommonground.org/",
      initials: "SFCG",
      accentColor: "#0E7490",
      imageUrl: undefined,
    },
    {
      role: "partner",
      displayName: "Naryn Community Lab",
      description: "Regional workshop host.",
      websiteUrl: undefined,
      initials: "NL",
      accentColor: "#D8639A",
      imageUrl: undefined,
    },
  ],
  contact: undefined,
}));

interface ProjectConversationPreview {
  slugId: string;
  title: string;
  bodyHtml: string;
  isClosed: boolean;
  stats: { opinionCount: number; participantCount: number; voteCount: number };
  conversationType: ExtendedConversation["metadata"]["conversationType"];
  externalSourceConfig: null;
}

const conversation = computed<ProjectConversationPreview>(() => ({
  slugId: "share01",
  title: "Share your ideas",
  bodyHtml:
    "The opening conversation asks participants to add a statement or react to others.",
  isClosed: false,
  stats: {
    opinionCount: reportCounts.value.opinionCount,
    participantCount: reportCounts.value.participantCount,
    voteCount: reportCounts.value.voteCount,
  },
  conversationType: "polis",
  externalSourceConfig: null,
}));

const conversationData = computed<ExtendedConversation>(() => ({
  metadata: {
    conversationSlugId: conversation.value.slugId,
    createdAt,
    updatedAt: createdAt,
    lastReactedAt: createdAt,
    opinionCount: reportCounts.value.opinionCount,
    voteCount: reportCounts.value.voteCount,
    participantCount: reportCounts.value.participantCount,
    totalOpinionCount: reportCounts.value.totalOpinionCount,
    totalVoteCount: reportCounts.value.totalVoteCount,
    totalParticipantCount: reportCounts.value.totalParticipantCount,
    moderatedOpinionCount: 0,
    hiddenOpinionCount: 0,
    authorUsername: "project-team",
    participationMode: "guest",
    conversationType: "polis",
    isIndexed: false,
    aiLabelingEnabled: true,
    preferredOpinionGroupCount: null,
    contentLanguageMetadata: {
      detectedDisplayLanguageCode: "en",
      detectedSourceLanguageCode: "en",
      detectedRawLanguageCode: "en",
      detectionConfidence: 1,
      autoDetectionStatus: "detected",
    },
    languageSetting: {
      mode: "manual",
      languageCode: "en",
      detectedLanguageCode: "en",
      detectedSourceLanguageCode: "en",
      detectedRawLanguageCode: "en",
      detectionConfidence: 1,
      autoDetectionStatus: "detected",
    },
    multilingualSetting: {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
    isClosed: false,
    isEdited: false,
    organization: undefined,
    moderation: { status: "unmoderated" },
    externalSourceConfig: null,
  },
  payload: {
    title: conversation.value.title,
    body: conversation.value.bodyHtml ?? "",
  },
  interaction: {
    hasVoted: false,
    votedIndex: 0,
    surveyGate: undefined,
  },
}));

const analysisData = buildMockAnalysisData({ view: "auto" });
const surveyResults = buildMockSurveyResults({
  clusterCount: 4,
  aiLabelMode: "short",
  surveyViewerAccess: "owner",
  surveyScenario: "visible",
});

const reportCounts = computed(() => ({
  participantCount: analysisData.conversationViewSnapshot?.participantCount ?? 0,
  opinionCount: analysisData.conversationViewSnapshot?.opinionCount ?? 0,
  voteCount: analysisData.conversationViewSnapshot?.voteCount ?? 0,
  totalParticipantCount:
    analysisData.conversationViewSnapshot?.totalParticipantCount ?? 0,
  totalOpinionCount: analysisData.conversationViewSnapshot?.totalOpinionCount ?? 0,
  totalVoteCount: analysisData.conversationViewSnapshot?.totalVoteCount ?? 0,
}));
const agreementItems = computed(() =>
  getReportOpinions({
    items: analysisData.consensusAgree,
    getScore: (item) => item.groupAwareConsensusAgree,
  })
);
const disagreementItems = computed(() =>
  getReportOpinions({
    items: analysisData.consensusDisagree,
    getScore: (item) => item.groupAwareConsensusDisagree,
  })
);
const divisiveItems = computed(() =>
  getReportOpinions({
    items: analysisData.controversial,
    getScore: (item) => item.divisiveScore,
  })
);
const allItems = computed(() =>
  getReportAllOpinions({
    order: allStatementsOrder.value,
    items: [
      ...analysisData.consensusAgree,
      ...analysisData.consensusDisagree,
      ...analysisData.controversial,
    ],
  })
);
const surveyRows = computed(() =>
  getDisplayedSurveyRows({
    surveyResults,
    displayMode: surveyDisplayMode.value,
  })
);
const allStatementsOrderOptions = [
  { label: "Newest first", value: "newest" as const },
  { label: "Most approved first", value: "agreement" as const },
  { label: "Most rejected first", value: "disagreement" as const },
  { label: "Most divisive first", value: "divisive" as const },
];
const reportFileName = computed(() => "agora-report-share-your-ideas");

const { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf } =
  useReportDownload({
    fileName: reportFileName,
  });
const isGeneratingReport = computed(
  () => isGeneratingZip.value || isGeneratingPdf.value
);

watch(currentTab, (tab) => {
  if (tab !== "comment") {
    return;
  }

  void router.push({
    path: "/dev/project-conversation-layout",
    query: { tab: "comment" },
  });
});

function scrollToActionBar(): void {
  const element = actionBarRef.value;
  if (element === null) {
    return;
  }

  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY,
    behavior: "smooth",
  });
}

function buildCaptures(): Array<{ element: HTMLElement; name: string }> {
  const report = analysisReportRef.value;
  if (report === null) {
    return [];
  }

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

async function handleDownloadZip(): Promise<void> {
  await nextTick();
  const captures = buildCaptures();
  if (captures.length > 0) {
    await downloadAsZip({ captures });
  }
}

async function handleDownloadPdf(): Promise<void> {
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
}
</script>

<style scoped lang="scss">
.project-report-dev__return-link {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: $primary;
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.project-report-dev__toolbar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-report-dev__download-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.project-report-dev__download-button-content {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.project-report-dev__report-card {
  overflow: hidden;
  border: 1px solid rgba(233, 235, 239, 0.8);
  border-radius: 26px;
  background: white;
  box-shadow:
    0 0.2rem 0.9rem rgba(10, 7, 20, 0.05),
    0 1.35rem 2.8rem -1.6rem rgba(10, 7, 20, 0.16);
}
</style>
