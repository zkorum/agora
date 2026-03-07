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
          :current-cluster-tab="defaultClusterTab"
          :report-mode="true"
        />
      </div>

      <ReportGroupsTable
        v-if="clusterCount <= 2"
        :clusters="clusters"
        :total-participant-count="participantCount"
      />

      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
            <VoteLegend :items="reportLegendItems" style="margin-bottom: 0.75rem" />
          </template>
        </ReportRepresentativeOpinions>
        <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
        <span class="detail-section-name" :style="{ color: 'var(--sentiment-positive)' }">{{ t('agreements') }}</span>
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
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
          <span class="detail-section-name" :style="{ color: 'var(--sentiment-positive)' }">{{ t('agreements') }} ({{ chunkIdx + 1 }}/{{ agreementChunks.length }})</span>
        </template>
        <template v-else>
          <span class="detail-separator">·</span>
          <span class="detail-section-name" :style="{ color: 'var(--sentiment-positive)' }">{{ t('agreements') }}</span>
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
          <VoteLegend :items="reportLegendItems" style="margin-bottom: 0.75rem" />
        </template>
      </ReportOpinionList>
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
        <span class="detail-section-name" :style="{ color: 'var(--sentiment-negative-text)' }">{{ t('disagreements') }}</span>
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
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
          <span class="detail-section-name" :style="{ color: 'var(--sentiment-negative-text)' }">{{ t('disagreements') }} ({{ chunkIdx + 1 }}/{{ disagreementChunks.length }})</span>
        </template>
        <template v-else>
          <span class="detail-separator">·</span>
          <span class="detail-section-name" :style="{ color: 'var(--sentiment-negative-text)' }">{{ t('disagreements') }}</span>
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
          <VoteLegend :items="reportLegendItems" style="margin-bottom: 0.75rem" />
        </template>
      </ReportOpinionList>
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
        <span class="detail-section-name" :style="{ color: 'var(--sentiment-mixed)' }">{{ t('divisive') }}</span>
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
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
          <span class="detail-section-name" :style="{ color: 'var(--sentiment-mixed)' }">{{ t('divisive') }} ({{ chunkIdx + 1 }}/{{ divisiveChunks.length }})</span>
        </template>
        <template v-else>
          <span class="detail-separator">·</span>
          <span class="detail-section-name" :style="{ color: 'var(--sentiment-mixed)' }">{{ t('divisive') }}</span>
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
          <VoteLegend :items="reportLegendItems" style="margin-bottom: 0.75rem" />
        </template>
      </ReportOpinionList>
      <ReportFooter :conversation-slug-id="conversationSlugId" class="capture-footer" />
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
import {
  type VoteLegendTranslations,
  voteLegendTranslations,
} from "src/components/ui/VoteLegend.i18n";
import VoteLegend from "src/components/ui/VoteLegend.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem, PolisClusters, PolisKey } from "src/shared/types/zod";
import { REPORT_ITEMS_PER_CAPTURE_PAGE } from "src/utils/component/report/reportData";
import { computed, type Ref, ref } from "vue";

import {
  type AnalysisReportTranslations,
  analysisReportTranslations,
} from "./AnalysisReport.i18n";
import ReportFooter from "./ReportFooter.vue";
import ReportGroupsTable from "./ReportGroupsTable.vue";
import ReportHeader from "./ReportHeader.vue";
import ReportOpinionList from "./ReportOpinionList.vue";
import ReportRepresentativeOpinions from "./ReportRepresentativeOpinions.vue";

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
  itemsPerPage?: number;
}>();

const effectiveItemsPerPage = computed(() =>
  props.itemsPerPage ?? REPORT_ITEMS_PER_CAPTURE_PAGE,
);

const { t } = useComponentI18n<AnalysisReportTranslations>(
  analysisReportTranslations,
);

const { t: tLegend } = useComponentI18n<VoteLegendTranslations>(
  voteLegendTranslations,
);

const reportLegendItems = computed(() => [
  { label: tLegend("agree"), type: "agree" as const },
  { label: tLegend("unsure"), type: "unsure" as const },
  { label: tLegend("disagree"), type: "disagree" as const },
  { label: tLegend("noVote"), type: "noVote" as const },
]);

const defaultClusterTab = computed<PolisKey>(() => {
  const keys = Object.keys(props.clusters);
  return (keys[0] ?? "0") as PolisKey;
});

const clusterCount = computed(() => Object.keys(props.clusters).length);

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
  chunkArray(props.agreementItems, effectiveItemsPerPage.value),
);
const disagreementChunks = computed(() =>
  chunkArray(props.disagreementItems, effectiveItemsPerPage.value),
);
const divisiveChunks = computed(() =>
  chunkArray(props.divisiveItems, effectiveItemsPerPage.value),
);

const summaryRef = ref<HTMLElement | null>(null);
const groupsTableRef = ref<HTMLElement | null>(null);
const footerRef = ref<HTMLElement | null>(null);

// Empty state refs
const agreementEmptyRef = ref<HTMLElement | null>(null);
const disagreementEmptyRef = ref<HTMLElement | null>(null);
const divisiveEmptyRef = ref<HTMLElement | null>(null);

// Dynamic arrays of refs
const groupsAndRepresentativeRefs = ref<HTMLElement[]>([]);
const agreementRefs = ref<HTMLElement[]>([]);
const disagreementRefs = ref<HTMLElement[]>([]);
const divisiveRefs = ref<HTMLElement[]>([]);

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

defineExpose({
  summaryRef,
  groupsTableRef,
  groupsAndRepresentativeRefs,
  agreementEmptyRef,
  disagreementEmptyRef,
  divisiveEmptyRef,
  agreementRefs,
  disagreementRefs,
  divisiveRefs,
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
  padding: 6mm;
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
