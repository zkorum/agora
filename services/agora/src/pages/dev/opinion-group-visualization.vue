<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <StandardMenuBar
        :title="t('analysisTabTest')"
        :center-content="true"
      />
    </template>

    <div class="page-container">
      <PrimeCard class="control-card">
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
            <div class="control-item">
              <label for="distribution" class="control-label">
                {{ t("distributionLabel") }}
              </label>
              <PrimeSelect
                id="distribution"
                v-model="distributionMode"
                :options="distributionOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>
            <div class="control-item">
              <label for="ungrouped" class="control-label">
                {{ t("ungroupedLabel") }}
              </label>
              <PrimeSelect
                id="ungrouped"
                v-model="ungroupedMode"
                :options="ungroupedOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>
            <div class="control-item">
              <label for="empty-sections" class="control-label">
                {{ t("emptySectionsLabel") }}
              </label>
              <PrimeSelect
                id="empty-sections"
                v-model="emptySectionsMode"
                :options="emptySectionsOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>
          </div>
        </template>
      </PrimeCard>

      <PrimeCard class="preview-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-chart-bar section-icon"></i>
            <span>{{ t("analysisPreview") }}</span>
          </div>
        </template>
        <template #content>
          <div class="analysis-container">
            <div class="analysis-header">
              <ShortcutBar v-model="currentTab" />
            </div>

            <!-- Opinion groups -->
            <div
              v-if="currentTab === 'Summary' || currentTab === 'Groups'"
              class="tab-component"
            >
              <OpinionGroupTab
                :key="`groups-${selectedClusterCount}-${useAiLabels}-${distributionMode}-${ungroupedMode}`"
                :conversation-slug-id="mockConversationSlugId"
                :clusters="mockClusters"
                :total-participant-count="totalParticipantCount"
                :compact-mode="currentTab === 'Summary'"
              />
            </div>

            <!-- Agreements -->
            <div
              v-if="currentTab === 'Summary' || currentTab === 'Agreements'"
              class="tab-component"
            >
              <ConsensusTab
                v-model="currentTab"
                direction="agree"
                :conversation-slug-id="mockConversationSlugId"
                :item-list="mockAgreementItems"
                :compact-mode="currentTab === 'Summary'"
                :clusters="mockClusters"
                :cluster-labels="clusterLabels"
              />
            </div>

            <!-- Disagreements -->
            <div
              v-if="currentTab === 'Summary' || currentTab === 'Disagreements'"
              class="tab-component"
            >
              <ConsensusTab
                v-model="currentTab"
                direction="disagree"
                :conversation-slug-id="mockConversationSlugId"
                :item-list="mockDisagreementItems"
                :compact-mode="currentTab === 'Summary'"
                :clusters="mockClusters"
                :cluster-labels="clusterLabels"
              />
            </div>

            <!-- Divisive -->
            <div
              v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
              class="tab-component"
            >
              <DivisiveTab
                v-model="currentTab"
                :conversation-slug-id="mockConversationSlugId"
                :item-list="mockDivisiveItems"
                :compact-mode="currentTab === 'Summary'"
                :clusters="mockClusters"
                :cluster-labels="clusterLabels"
              />
            </div>
          </div>
        </template>
      </PrimeCard>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import Card from "primevue/card";
import Select from "primevue/select";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ConsensusTab from "src/components/post/analysis/consensusTab/ConsensusTab.vue";
import DivisiveTab from "src/components/post/analysis/divisivenessTab/DivisiveTab.vue";
import OpinionGroupTab from "src/components/post/analysis/opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "src/components/post/analysis/shortcutBar/ShortcutBar.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type {
  AnalysisOpinionItem,
  ClusterStats,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { computed, ref } from "vue";

import {
  type OpinionGroupVisualizationTranslations,
  opinionGroupVisualizationTranslations,
} from "./opinion-group-visualization.i18n";

defineOptions({
  components: {
    PrimeCard: Card,
    PrimeSelect: Select,
  },
});

const { t } = useComponentI18n<OpinionGroupVisualizationTranslations>(
  opinionGroupVisualizationTranslations
);

const mockConversationSlugId = "dev-test";
const currentTab = ref<ShortcutItem>("Summary");
const selectedClusterCount = ref(3);
const useAiLabels = ref(true);
const distributionMode = ref<"balanced" | "imbalanced">("balanced");
const ungroupedMode = ref<"none" | "some" | "many">("none");
const emptySectionsMode = ref<"none" | "all" | "agreements" | "disagreements" | "divisive">("none");

const clusterCountOptions = computed(() => [
  { label: t("clusterCount0"), value: 0 },
  { label: t("clusterCount1"), value: 1 },
  { label: t("clusterCount2"), value: 2 },
  { label: t("clusterCount3"), value: 3 },
  { label: t("clusterCount4"), value: 4 },
  { label: t("clusterCount5"), value: 5 },
  { label: t("clusterCount6"), value: 6 },
]);

const aiLabelOptions = computed(() => [
  { label: t("withAiLabels"), value: true },
  { label: t("withoutAiLabels"), value: false },
]);

const distributionOptions = computed(() => [
  { label: t("distributionBalanced"), value: "balanced" as const },
  { label: t("distributionImbalanced"), value: "imbalanced" as const },
]);

const ungroupedOptions = computed(() => [
  { label: t("ungroupedNone"), value: "none" as const },
  { label: t("ungroupedSome"), value: "some" as const },
  { label: t("ungroupedMany"), value: "many" as const },
]);

const emptySectionsOptions = computed(() => [
  { label: t("emptySectionsNone"), value: "none" as const },
  { label: t("emptySectionsAll"), value: "all" as const },
  { label: t("emptySectionsAgreements"), value: "agreements" as const },
  { label: t("emptySectionsDisagreements"), value: "disagreements" as const },
  { label: t("emptySectionsDivisive"), value: "divisive" as const },
]);

const ungroupedCounts: Record<"none" | "some" | "many", number> = {
  none: 0,
  some: 15,
  many: 120,
};

// Mock data constants
const longAiLabels = [
  "Écologistes progressistes pour la transition énergétique",
  "Conservateurs fiscaux attachés aux traditions institutionnelles",
  "Réformistes sociaux-démocrates pour un État-providence renforcé",
  "Libertariens technophiles pour la décentralisation numérique",
  "Pragmatiques communautaires axés sur les compromis locaux",
  "Militants pour la décentralisation radicale des institutions",
];

const aiSummaries = [
  "Ce groupe soutient des politiques environnementales progressistes et une transition énergétique rapide vers les énergies renouvelables.",
  "Ce groupe favorise la prudence fiscale et le respect des traditions institutionnelles établies.",
  "Ce groupe promeut des réformes sociales-démocrates avec un État-providence renforcé et des services publics de qualité.",
  "Ce groupe valorise la liberté individuelle et les solutions technologiques décentralisées pour la gouvernance.",
  "Ce groupe privilégie le pragmatisme communautaire et les compromis locaux basés sur l'expérience du terrain.",
  "Ce groupe milite pour une décentralisation radicale des institutions existantes et un transfert massif de pouvoir vers les citoyens.",
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
  const balancedSizes = [145, 112, 87, 63, 48, 35];
  const imbalancedSizes = [145, 3, 2, 1, 1, 1];
  const baseSizes = distributionMode.value === "imbalanced" ? imbalancedSizes : balancedSizes;

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
  const clustered = Object.values(mockClusters.value).reduce(
    (sum, cluster) => sum + (cluster?.numUsers ?? 0),
    0,
  );
  return clustered + ungroupedCounts[ungroupedMode.value];
});

const clusterLabels = computed(() => {
  const labels: Partial<Record<PolisKey, string>> = {};
  for (const [key, cluster] of Object.entries(mockClusters.value)) {
    if (cluster?.aiLabel) {
      labels[key as PolisKey] = cluster.aiLabel;
    }
  }
  return labels;
});

const mockAgreementItems = computed(() => {
  if (selectedClusterCount.value === 0) return [];
  if (emptySectionsMode.value === "all" || emptySectionsMode.value === "agreements") return [];
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
  if (emptySectionsMode.value === "all" || emptySectionsMode.value === "disagreements") return [];
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
  if (emptySectionsMode.value === "all" || emptySectionsMode.value === "divisive") return [];
  const items: AnalysisOpinionItem[] = [];
  for (let i = 0; i < 8; i++) {
    items.push(
      generateMockOpinion({
        index: i + 40,
        clusterCount: selectedClusterCount.value,
      }),
    );
  }
  return items.filter((item) => item.divisiveScore > 0);
});
</script>

<style scoped lang="scss">
.page-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.control-card {
  width: 100%;
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

.preview-card {
  width: 100%;
}

.analysis-container {
  background-color: white;
  border-radius: 25px;
  border: 1px solid #e9e9f1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  color: #333238;
}

.analysis-header {
  display: flex;
  align-items: flex-start;
}

.tab-component {
  border-radius: 12px;
  padding: 0.5rem;
}
</style>
