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
        :title="t('opinionGroupVisualization')"
        :center-content="true"
      />
    </template>

    <div class="container">
      <PrimeCard class="control-section-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-eye section-icon"></i>
            <span>{{ t("visualizationControls") }}</span>
          </div>
        </template>
        <template #content>
          <div class="control-container">
            <label for="cluster-count" class="control-label">
              {{ t("clusterCountLabel") }}
            </label>
            <PrimeSelect
              id="cluster-count"
              v-model="selectedClusterCount"
              :options="clusterCountOptions"
              option-label="label"
              option-value="value"
              class="cluster-selector"
              @change="generateMockData"
            />
          </div>
        </template>
      </PrimeCard>

      <PrimeCard class="preview-section-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-chart-bar section-icon"></i>
            <span>{{ t("componentPreview") }}</span>
          </div>
        </template>
        <template #content>
          <div class="preview-container">
            <OpinionGroupTab
              :key="selectedClusterCount"
              :conversation-slug-id="mockConversationSlugId"
              :clusters="mockClusters"
              :total-participant-count="totalParticipantCount"
            />
          </div>
        </template>
      </PrimeCard>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import OpinionGroupTab from "src/components/post/analysis/opinionGroupTab/OpinionGroupTab.vue";
import type {
  PolisClusters,
  PolisKey,
  OpinionItem,
} from "src/shared/types/zod";
import {
  opinionGroupVisualizationTranslations,
  type OpinionGroupVisualizationTranslations,
} from "./opinion-group-visualization.i18n";

const { t } = useComponentI18n<OpinionGroupVisualizationTranslations>(
  opinionGroupVisualizationTranslations
);

const selectedClusterCount = ref(3);
const mockConversationSlugId = "dev-test";
const mockClusters = ref<Partial<PolisClusters>>({});

const clusterCountOptions = [
  { label: "2 Clusters", value: 2 },
  { label: "3 Clusters", value: 3 },
  { label: "4 Clusters", value: 4 },
  { label: "5 Clusters", value: 5 },
  { label: "6 Clusters", value: 6 },
];

const totalParticipantCount = computed(() => {
  return Object.values(mockClusters.value).reduce(
    (sum, cluster) => sum + (cluster?.numUsers || 0),
    0
  );
});

// Mock data generators
const clusterLabels = [
  "Social Progressive",
  "Traditional Conservative",
  "Centrist Moderate",
  "Independent Thinker",
  "Practical Realist",
  "Visionary Idealist",
];

const clusterSummaries = [
  "This group tends to favor progressive policies and social change.",
  "This group generally supports traditional values and conservative approaches.",
  "This group takes a balanced approach, considering multiple perspectives.",
  "This group values independence and non-partisan solutions.",
  "This group focuses on practical, evidence-based solutions.",
  "This group is driven by idealistic principles and long-term vision.",
];

function generateMockOpinions(count: number = 3): OpinionItem[] {
  const mockOpinions: OpinionItem[] = [];

  for (let i = 0; i < count; i++) {
    mockOpinions.push({
      opinionSlugId: `mock-${i}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      opinion: `This is a mock opinion ${i + 1} for demonstration purposes.`,
      numParticipants: Math.floor(Math.random() * 50) + 10,
      numAgrees: Math.floor(Math.random() * 30) + 5,
      numDisagrees: Math.floor(Math.random() * 20) + 2,
      numPasses: Math.floor(Math.random() * 10) + 1,
      username: `user${i + 1}`,
      clustersStats: [],
      moderation: { status: "unmoderated" },
      isSeed: false,
    });
  }

  return mockOpinions;
}

function generateMockData(): void {
  const clusters: Partial<PolisClusters> = {};
  const baseUserCount = 50;

  for (let i = 0; i < selectedClusterCount.value; i++) {
    const key = String(i) as PolisKey;
    const userCount = Math.floor(Math.random() * baseUserCount) + 20;

    clusters[key] = {
      key,
      numUsers: userCount,
      aiLabel: clusterLabels[i],
      aiSummary: clusterSummaries[i],
      isUserInCluster: i === 0, // Put user in first cluster for demo
      representative: generateMockOpinions(2),
    };
  }

  mockClusters.value = clusters;
}

// Initialize with default data
onMounted(() => {
  generateMockData();
});
</script>

<style scoped lang="scss">
.container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.control-section-card,
.preview-section-card {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 1.5rem 0;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.control-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: var(--font-weight-medium);
  color: $grey-9;
}

.cluster-selector {
  min-width: 200px;
}
</style>
