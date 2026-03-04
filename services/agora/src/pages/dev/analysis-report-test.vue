<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: false,
    }"
  >
    <template #header>
      <StandardMenuBar
        :title="t('analysisReportTest')"
        :center-content="true"
      />
    </template>

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
                v-model="useAiLabels"
                :options="aiLabelOptions"
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
          :label="isGeneratingZip ? 'Generating...' : 'Download Images (ZIP)'"
          icon="pi pi-image"
          :disabled="isGeneratingZip"
          @click="handleDownloadZip"
        />
        <PrimeButton
          :label="isGeneratingPdf ? 'Generating...' : 'Download PDF'"
          icon="pi pi-file-pdf"
          :disabled="isGeneratingPdf"
          @click="handleDownloadPdf"
        />
      </div>

      <div class="report-preview">
        <AnalysisReport
          ref="analysisReportRef"
          :key="`${selectedClusterCount}-${useAiLabels}`"
          :conversation-slug-id="mockConversationSlugId"
          :conversation-title="mockConversationTitle"
          :author-username="mockAuthorUsername"
          :created-at="mockCreatedAt"
          :participant-count="totalParticipantCount"
          :opinion-count="mockOpinionCount"
          :vote-count="mockVoteCount"
          :clusters="mockClusters"
          :agreement-items="mockAgreementItems"
          :disagreement-items="mockDisagreementItems"
          :divisive-items="mockDivisiveItems"
        />
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Select from "primevue/select";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisReport from "src/components/post/report/AnalysisReport.vue";
import { useReportDownload } from "src/composables/report/useReportDownload";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type {
  AnalysisOpinionItem,
  ClusterStats,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import { computed, ref } from "vue";

import {
  type AnalysisReportTestTranslations,
  analysisReportTestTranslations,
} from "./analysis-report-test.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
    PrimeSelect: Select,
  },
});

const { t } = useComponentI18n<AnalysisReportTestTranslations>(
  analysisReportTestTranslations,
);

const selectedClusterCount = ref(3);
const useAiLabels = ref(true);

const mockConversationSlugId = "dev-test-report";
const mockConversationTitle =
  "Comment améliorer la gouvernance participative dans notre commune ?";
const mockAuthorUsername = "test-user";
const mockCreatedAt = new Date("2025-11-15");
const mockOpinionCount = 42;
const mockVoteCount = 380;

const clusterCountOptions = [
  { label: "0 Groups", value: 0 },
  { label: "2 Groups", value: 2 },
  { label: "3 Groups", value: 3 },
  { label: "4 Groups", value: 4 },
  { label: "5 Groups", value: 5 },
  { label: "6 Groups", value: 6 },
];

const aiLabelOptions = [
  { label: "With AI Labels", value: true },
  { label: "Without AI Labels (A/B/C)", value: false },
];

const longAiLabels = [
  "Progressive Environmentalists",
  "Fiscal Conservative Traditionalists",
  "Social Democratic Reformists",
  "Libertarian Technologists",
  "Community-Oriented Pragmatists",
  "Radical Decentralization Advocates",
];

const aiSummaries = [
  "Ce groupe soutient des politiques environnementales progressistes et une transition énergétique rapide.",
  "Ce groupe favorise la prudence fiscale et le respect des traditions institutionnelles.",
  "Ce groupe promeut des réformes sociales-démocrates avec un État-providence renforcé.",
  "Ce groupe valorise la liberté individuelle et les solutions technologiques décentralisées.",
  "Ce groupe privilégie le pragmatisme communautaire et les compromis locaux.",
  "Ce groupe milite pour une décentralisation radicale des institutions existantes.",
];

const mockStatements = [
  "Établir un budget participatif annuel représentant au moins 10% du budget communal.",
  "Pour développer la participation citoyenne, il est essentiel de créer des assemblées de quartier régulières.",
  "La transparence totale des décisions du conseil municipal est une condition préalable à toute forme de gouvernance participative.",
  "Il faudrait mettre en place une plateforme numérique de consultation citoyenne accessible à tous.",
  "Les associations locales devraient avoir un rôle consultatif officiel dans les décisions d'urbanisme.",
  "Créer un observatoire citoyen indépendant pour évaluer l'impact des politiques publiques.",
  "Organiser des forums citoyens trimestriels sur les grands projets d'infrastructure.",
  "Instaurer un droit d'initiative citoyenne permettant de proposer des délibérations au conseil municipal.",
  "Développer des programmes d'éducation civique dans les écoles pour former les futurs citoyens.",
  "Mettre en place un système de pétition en ligne avec obligation de réponse du conseil municipal.",
];

const polisKeys: PolisKey[] = ["0", "1", "2", "3", "4", "5"];

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
  const baseSizes = [28, 21, 15, 12, 9, 7];

  for (let i = 0; i < selectedClusterCount.value; i++) {
    const key = polisKeys[i];
    const representative: AnalysisOpinionItem[] = [];
    for (let j = 0; j < 5; j++) {
      representative.push(
        generateMockOpinion({
          index: i * 5 + j,
          clusterCount: selectedClusterCount.value,
        }),
      );
    }

    clusters[key] = {
      key,
      numUsers: baseSizes[i] ?? 5,
      aiLabel: useAiLabels.value ? longAiLabels[i] : undefined,
      aiSummary: useAiLabels.value ? aiSummaries[i] : undefined,
      isUserInCluster: i === 0,
      representative,
    };
  }

  return clusters;
});

const totalParticipantCount = computed(() => {
  return Object.values(mockClusters.value).reduce(
    (sum, cluster) => sum + (cluster?.numUsers ?? 0),
    0,
  );
});

const mockAgreementItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 0; i < 20; i++) {
    items.push(
      generateMockOpinion({
        index: i,
        clusterCount: selectedClusterCount.value,
      }),
    );
  }
  return items;
});

const mockDisagreementItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 0; i < 15; i++) {
    items.push(
      generateMockOpinion({
        index: i + 20,
        clusterCount: selectedClusterCount.value,
      }),
    );
  }
  return items;
});

const mockDivisiveItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 8; i < 10; i++) {
    items.push(
      generateMockOpinion({
        index: i,
        clusterCount: selectedClusterCount.value,
      }),
    );
  }
  return items;
});

// Download functionality
interface AnalysisReportExposed {
  summaryRef: HTMLElement | null;
  groupsAndRepresentativeRefs: HTMLElement[];
  agreementRefs: HTMLElement[];
  disagreementRefs: HTMLElement[];
  divisiveRefs: HTMLElement[];
  footerRef: HTMLElement | null;
}

const analysisReportRef = ref<AnalysisReportExposed | null>(null);

const { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf } = useReportDownload({
  fileName: computed(() => `test-report-${selectedClusterCount.value}groups`),
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
  gap: 0.75rem;
  justify-content: center;
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
