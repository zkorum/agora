<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <!-- Narrow screen message -->
    <div v-if="isNarrowScreen" class="narrow-screen-message">
      <div class="narrow-screen-content">
        <q-icon name="mdi-monitor" size="3rem" color="grey-6" />
        <h2 class="narrow-title">{{ t("narrowScreenTitle") }}</h2>
        <p class="narrow-text">{{ t("narrowScreenMessage") }}</p>
        <ZKButton button-type="compactButton" @click="router.back()">
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
            <span>{{ isGeneratingZip ? t("generating") : t("downloadImages") }}</span>
          </div>
        </ZKButton>
        <ZKButton
          button-type="compactButton"
          :disable="isGeneratingPdf || !hasData"
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
          <div>
            <AnalysisReport
              v-if="conversationQuery.data.value && analysisQuery.data.value"
              ref="analysisReportRef"
              :conversation-slug-id="conversationSlugId"
              :conversation-title="conversationQuery.data.value.payload.title"
              :author-username="conversationQuery.data.value.metadata.authorUsername"
              :created-at="conversationQuery.data.value.metadata.createdAt"
              :participant-count="conversationQuery.data.value.metadata.participantCount"
              :opinion-count="conversationQuery.data.value.metadata.opinionCount"
              :vote-count="conversationQuery.data.value.metadata.voteCount"
              :clusters="analysisQuery.data.value?.polisClusters ?? {}"
              :agreement-items="agreementItems"
              :disagreement-items="disagreementItems"
              :divisive-items="divisiveItems"
            />
          </div>
        </AsyncStateHandler>
      </AsyncStateHandler>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useReportDownload } from "src/composables/report/useReportDownload";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { getReportOpinions } from "src/utils/component/report/reportData";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ReportPageTranslations,
  reportPageTranslations,
} from "./report.i18n";

const { t } = useComponentI18n<ReportPageTranslations>(reportPageTranslations);

const authStore = useAuthenticationStore();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(authStore);

const route = useRoute("/conversation/[conversationSlugId]/report");
const router = useRouter();

const conversationSlugId = computed(() => {
  const value = route.params.conversationSlugId;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});

const conversationQuery = useConversationQuery({
  conversationSlugId: conversationSlugId,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

const analysisQuery = useAnalysisQuery({
  conversationSlugId: conversationSlugId,
  voteCount: computed(() => conversationQuery.data.value?.metadata.voteCount),
  enabled: computed(
    () =>
      isAuthInitialized.value &&
      isGuestOrLoggedIn.value &&
      conversationQuery.data.value !== undefined,
  ),
});

// Full items (top 10)
const agreementItems = computed(() =>
  getReportOpinions({
    items: analysisQuery.data.value?.consensusAgree ?? [],
    getScore: (item) => item.groupAwareConsensusAgree,
  }),
);

const disagreementItems = computed(() =>
  getReportOpinions({
    items: analysisQuery.data.value?.consensusDisagree ?? [],
    getScore: (item) => item.groupAwareConsensusDisagree,
  }),
);

const divisiveItems = computed(() => {
  const items = (analysisQuery.data.value?.controversial ?? []).filter(
    (item) => item.divisiveScore > 0,
  );
  const maxDivisive = Math.max(
    ...items.map((item) => item.divisiveScore),
    0,
  );
  return getReportOpinions({
    items,
    getScore: (item) =>
      maxDivisive > 0 ? item.divisiveScore / maxDivisive : 0,
  });
});

const hasData = computed(
  () =>
    conversationQuery.data.value !== undefined &&
    analysisQuery.data.value !== undefined,
);

// Narrow screen detection
const NARROW_BREAKPOINT = 768;
const isNarrowScreen = ref(false);

function checkScreenWidth(): void {
  isNarrowScreen.value = window.innerWidth < NARROW_BREAKPOINT;
}

onMounted(() => {
  checkScreenWidth();
  window.addEventListener("resize", checkScreenWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenWidth);
});

// Report capture refs
interface AnalysisReportExposed {
  summaryRef: HTMLElement | null;
  groupsAndRepresentativeRefs: HTMLElement[];
  agreementRefs: HTMLElement[];
  disagreementRefs: HTMLElement[];
  divisiveRefs: HTMLElement[];
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

const { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf } = useReportDownload({
  fileName: reportFileName,
});

function buildCaptures(): Array<{ element: HTMLElement; name: string }> {
  const report = analysisReportRef.value;
  if (!report) return [];

  const captures: Array<{ element: HTMLElement; name: string }> = [];

  if (report.summaryRef) {
    captures.push({ element: report.summaryRef, name: "summary" });
  }
  for (let i = 0; i < report.groupsAndRepresentativeRefs.length; i++) {
    const el = report.groupsAndRepresentativeRefs[i];
    if (el) {
      captures.push({ element: el, name: `groups-rep-${i}` });
    }
  }
  for (let j = 0; j < report.agreementRefs.length; j++) {
    const el = report.agreementRefs[j];
    if (el) {
      captures.push({ element: el, name: `agreements-${j}` });
    }
  }
  for (let j = 0; j < report.disagreementRefs.length; j++) {
    const el = report.disagreementRefs[j];
    if (el) {
      captures.push({ element: el, name: `disagreements-${j}` });
    }
  }
  for (let j = 0; j < report.divisiveRefs.length; j++) {
    const el = report.divisiveRefs[j];
    if (el) {
      captures.push({ element: el, name: `divisive-${j}` });
    }
  }

  return captures;
}

async function handleDownloadZip(): Promise<void> {
  const captures = buildCaptures();
  if (captures.length > 0) {
    await downloadAsZip({ captures });
  }
}

async function handleDownloadPdf(): Promise<void> {
  const captures = buildCaptures();
  if (captures.length > 0) {
    await downloadAsPdf({
      captures,
      footerElement: analysisReportRef.value?.footerRef ?? undefined,
    });
  }
}
</script>

<style lang="scss" scoped>
.report-page {
  padding: 1rem;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f8fb;
  border-radius: 12px;
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
