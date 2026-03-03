<template>
  <div class="report-container">
    <!-- Summary section (captured as JPG) -->
    <div ref="summaryRef" class="report-section-block">
      <ReportHeader
        :conversation-title="conversationTitle"
        :author-username="authorUsername"
        :created-at="createdAt"
        :participant-count="participantCount"
        :opinion-count="opinionCount"
        :vote-count="voteCount"
      />

      <div v-if="Object.keys(clusters).length >= 2" class="cluster-viz-wrapper">
        <ClusterVisualization
          :clusters="clusters"
          :total-participant-count="participantCount"
          :current-cluster-tab="defaultClusterTab"
          :report-mode="true"
        />
      </div>

      <ReportGroupsTable
        :clusters="clusters"
        :total-participant-count="participantCount"
      />

      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
    </div>

    <!-- Full detail sections (visible on site/PDF, detail-context only in JPG images) -->
    <div v-if="agreementItems.length > 0" ref="agreementsRef" class="report-section-block detail-section">
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
      </div>
      <ReportOpinionList
        :title="t('agreementsLong')"
        :subtitle="t('agreementsSubtitle')"
        title-color="#6b4eff"
        :items="agreementItems"
        :clusters="clusters"
        :total-participants="participantCount"
      />
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
    </div>

    <div v-if="disagreementItems.length > 0" ref="disagreementsRef" class="report-section-block detail-section">
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
      </div>
      <ReportOpinionList
        :title="t('disagreementsLong')"
        :subtitle="t('disagreementsSubtitle')"
        title-color="#a05e03"
        :items="disagreementItems"
        :clusters="clusters"
        :total-participants="participantCount"
      />
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
    </div>

    <div v-if="divisiveItems.length > 0" ref="divisiveRef" class="report-section-block detail-section">
      <div class="detail-context capture-only">
        <span class="detail-branding">Agora Citizen Network</span>
        <span class="detail-separator">·</span>
        <span class="detail-title">{{ conversationTitle }}</span>
      </div>
      <ReportOpinionList
        :title="t('divisiveLong')"
        :subtitle="t('divisiveSubtitle')"
        title-color="#b58091"
        :items="divisiveItems"
        :clusters="clusters"
        :total-participants="participantCount"
      />
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
    </div>

    <!-- Footer (end of PDF/site, not captured in individual section JPGs) -->
    <div class="report-section-block">
      <div ref="footerRef">
        <ReportFooter :conversation-slug-id="conversationSlugId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ClusterVisualization from "src/components/post/analysis/opinionGroupTab/ClusterVisualization.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem, PolisClusters, PolisKey } from "src/shared/types/zod";
import { computed, ref } from "vue";

import {
  type AnalysisReportTranslations,
  analysisReportTranslations,
} from "./AnalysisReport.i18n";
import ReportFooter from "./ReportFooter.vue";
import ReportGroupsTable from "./ReportGroupsTable.vue";
import ReportHeader from "./ReportHeader.vue";
import ReportOpinionList from "./ReportOpinionList.vue";

const props = defineProps<{
  conversationSlugId: string;
  conversationTitle: string;
  authorUsername: string;
  createdAt: string | Date;
  participantCount: number;
  opinionCount: number;
  voteCount: number;
  clusters: Partial<PolisClusters>;
  agreementItems: AnalysisOpinionItem[];
  disagreementItems: AnalysisOpinionItem[];
  divisiveItems: AnalysisOpinionItem[];
}>();

const { t } = useComponentI18n<AnalysisReportTranslations>(
  analysisReportTranslations,
);

const defaultClusterTab = computed<PolisKey>(() => {
  const keys = Object.keys(props.clusters);
  return (keys[0] ?? "0") as PolisKey;
});

const summaryRef = ref<HTMLElement | null>(null);
const agreementsRef = ref<HTMLElement | null>(null);
const disagreementsRef = ref<HTMLElement | null>(null);
const divisiveRef = ref<HTMLElement | null>(null);
const footerRef = ref<HTMLElement | null>(null);

defineExpose({
  summaryRef,
  agreementsRef,
  disagreementsRef,
  divisiveRef,
  footerRef,
});
</script>

<style lang="scss" scoped>
.report-container {
  width: 210mm;
  max-width: 100%;
  margin: 0 auto;
  background: white;
  color: #333238;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
}

.report-section-block {
  padding: 10mm;
  background: white;
}

.detail-section {
  margin-top: 1rem;
  border-top: 2px solid #e9e9f1;
  padding-top: 1.5rem;
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

.cluster-viz-wrapper {
  max-width: 350px;
  margin: 0 auto;
  pointer-events: none;
}

.capture-footer,
.capture-only {
  display: none;
}
</style>
