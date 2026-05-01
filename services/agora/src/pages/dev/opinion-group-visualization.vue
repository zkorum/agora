<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      :title="t('analysisTabTest')"
      :center-content="true"
    />
  </Teleport>

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
              v-model="aiLabelMode"
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
              <label for="number-scale" class="control-label">
                {{ tSurveyControls("numberScaleLabel") }}
              </label>
              <PrimeSelect
                id="number-scale"
                v-model="numberScale"
                :options="numberScaleOptions"
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
            <div class="control-item">
              <label for="viewer-access" class="control-label">
                {{ tSurveyControls("viewerAccessLabel") }}
              </label>
              <PrimeSelect
                id="viewer-access"
                v-model="surveyViewerAccess"
                :options="viewerAccessOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>
            <div class="control-item">
              <label for="survey-scenario" class="control-label">
                {{ tSurveyControls("reportSurveyDataLabel") }}
              </label>
              <PrimeSelect
                id="survey-scenario"
                v-model="surveyScenario"
                :options="surveyScenarioOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>
            <div class="control-item">
              <label for="survey-status" class="control-label">
                Survey status
              </label>
              <PrimeSelect
                id="survey-status"
                v-model="surveyGateScenario"
                :options="surveyStatusOptions"
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
              <ShortcutBar
                :model-value="currentTab"
                :items="polisTabItems"
                :get-label="getPolisTabLabel"
                @update:model-value="onTabChange"
              />
            </div>

            <!-- Me tab -->
            <div
              v-if="currentTab === 'Summary' || currentTab === 'Me'"
              class="tab-component"
            >
              <MeTab
                v-model="currentTab"
                :cluster-key="userClusterData.clusterKey"
                :ai-label="userClusterData.aiLabel"
                :ai-summary="userClusterData.aiSummary"
                :has-voted-on-all-available-opinions="false"
                :navigate-to-discover-tab="handleDevVoteMore"
              />
            </div>

            <!-- Opinion groups -->
            <div
              v-if="currentTab === 'Summary' || currentTab === 'Groups' || currentTab === 'Me'"
              class="tab-component"
            >
              <OpinionGroupTab
                :key="`groups-${selectedClusterCount}-${aiLabelMode}-${distributionMode}-${numberScale}-${ungroupedMode}`"
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

            <div
              v-if="hasMockSurvey && (currentTab === 'Summary' || currentTab === 'Survey')"
              class="tab-component"
            >
              <SurveyTab
                v-model="currentTab"
                :conversation-slug-id="mockConversationSlugId"
                :survey-gate="mockSurveyGate"
                :survey-query="surveyResultsQuery"
                :clusters="mockClusters"
                :total-participant-count="totalParticipantCount"
                :compact-mode="currentTab === 'Summary'"
              />
            </div>
          </div>
        </template>
      </PrimeCard>
    </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import Card from "primevue/card";
import Select from "primevue/select";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ConsensusTab from "src/components/post/analysis/consensusTab/ConsensusTab.vue";
import DivisiveTab from "src/components/post/analysis/divisivenessTab/DivisiveTab.vue";
import MeTab from "src/components/post/analysis/meTab/MeTab.vue";
import OpinionGroupTab from "src/components/post/analysis/opinionGroupTab/OpinionGroupTab.vue";
import {
  type ShortcutBarTranslations,
  shortcutBarTranslations,
} from "src/components/post/analysis/shortcutBar/ShortcutBar.i18n";
import ShortcutBar from "src/components/post/analysis/shortcutBar/ShortcutBar.vue";
import SurveyTab from "src/components/post/analysis/surveyTab/SurveyTab.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  ClusterStats,
  PolisClusters,
  PolisKey,
  SurveyGateStatus,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { formatAmount } from "src/utils/common";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { shortcutItemSchema } from "src/utils/component/analysis/shortcutBar";
import { computed, ref, watch } from "vue";

import {
  type AnalysisReportTestTranslations,
  analysisReportTestTranslations,
} from "./analysis-report-test.i18n";
import {
  type AiLabelMode,
  aiSummaries,
  buildMockSurveyResults,
  longAiLabels,
  mockStatements,
  polisKeys,
  shortAiLabels,
  type SurveyScenario,
} from "./analysisTestData";
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

const { isActive } = usePageLayout({ enableFooter: false, reducedWidth: true, addBottomPadding: true });

const { t } = useComponentI18n<OpinionGroupVisualizationTranslations>(
  opinionGroupVisualizationTranslations
);

const { t: tShortcut } = useComponentI18n<ShortcutBarTranslations>(
  shortcutBarTranslations,
);

const { t: tSurveyControls } =
  useComponentI18n<AnalysisReportTestTranslations>(
    analysisReportTestTranslations,
  );

const mockConversationSlugId = "dev-test";
const currentTab = ref<ShortcutItem>("Summary");

const polisTabItems = computed<ShortcutItem[]>(() => [
  "Summary",
  "Me",
  "Groups",
  "Agreements",
  "Disagreements",
  "Divisive",
  ...(hasMockSurvey.value ? (["Survey"] as ShortcutItem[]) : []),
]);

const polisTabLabelMap: Record<string, string> = {
  Summary: tShortcut("summary"),
  Me: tShortcut("me"),
  Groups: tShortcut("groups"),
  Agreements: tShortcut("agreements"),
  Disagreements: tShortcut("disagreements"),
  Divisive: tShortcut("divisive"),
  Survey: tShortcut("survey"),
};

function getPolisTabLabel(item: string): string {
  return polisTabLabelMap[item] ?? item;
}

function onTabChange(value: string): void {
  const parsed = shortcutItemSchema.safeParse(value);
  if (parsed.success) {
    currentTab.value = parsed.data;
  }
}

const selectedClusterCount = ref(3);
const aiLabelMode = ref<AiLabelMode>("long");
const distributionMode = ref<"balanced" | "imbalanced">("balanced");
const numberScale = ref<"normal" | "large" | "veryLarge">("normal");
const ungroupedMode = ref<"none" | "some" | "many">("none");
const emptySectionsMode = ref<
  "none" | "all" | "agreements" | "disagreements" | "divisive" | "noSurvey"
>("none");
const surveyViewerAccess = ref<"public" | "owner">("owner");
const surveyScenario = ref<SurveyScenario>("visible");
type SurveyGateScenario =
  | "completeValid"
  | "needsUpdate"
  | "inProgress"
  | "notStartedRequired"
  | "notStartedOptional"
  | "noSurvey";
const surveyGateScenario = ref<SurveyGateScenario>("completeValid");

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
  { label: "Long AI labels", value: "long" as const },
  { label: "Short AI labels", value: "short" as const },
  { label: t("withoutAiLabels"), value: "none" as const },
]);

const distributionOptions = computed(() => [
  { label: t("distributionBalanced"), value: "balanced" as const },
  { label: t("distributionImbalanced"), value: "imbalanced" as const },
]);

const numberScaleOptions = computed(() => [
  { label: tSurveyControls("numberScaleNormal"), value: "normal" as const },
  { label: tSurveyControls("numberScaleLarge"), value: "large" as const },
  {
    label: tSurveyControls("numberScaleVeryLarge"),
    value: "veryLarge" as const,
  },
]);

const emptySectionsOptions = computed(() => [
  { label: t("emptySectionsNone"), value: "none" as const },
  { label: t("emptySectionsAll"), value: "all" as const },
  { label: t("emptySectionsAgreements"), value: "agreements" as const },
  { label: t("emptySectionsDisagreements"), value: "disagreements" as const },
  { label: t("emptySectionsDivisive"), value: "divisive" as const },
  { label: "No survey", value: "noSurvey" as const },
]);

const viewerAccessOptions = computed(() => [
  {
    label: tSurveyControls("viewerAccessPublic"),
    value: "public" as const,
  },
  {
    label: tSurveyControls("viewerAccessOwner"),
    value: "owner" as const,
  },
]);

const surveyScenarioOptions = computed(() => [
  { label: "Visible by group", value: "visible" as const },
  { label: "Suppressed by group", value: "suppressed" as const },
  {
    label: "Suppressed incl. overall",
    value: "overallSuppressed" as const,
  },
  { label: "Mixed groups", value: "mixed" as const },
  { label: "No results yet", value: "empty" as const },
]);

const surveyStatusOptions = [
  { label: "Complete valid", value: "completeValid" },
  { label: "Needs update", value: "needsUpdate" },
  { label: "In progress", value: "inProgress" },
  { label: "Not started (required)", value: "notStartedRequired" },
  { label: "Not started (optional)", value: "notStartedOptional" },
  { label: "No survey", value: "noSurvey" },
] satisfies Array<{ label: string; value: SurveyGateScenario }>;

const effectiveSurveyScenario = computed<SurveyScenario>(() =>
  emptySectionsMode.value === "noSurvey" ? "absent" : surveyScenario.value
);

const participantScaleMultiplier = computed<number>(() => {
  switch (numberScale.value) {
    case "normal":
      return 1;
    case "large":
      return 600;
    case "veryLarge":
      return 600_000;
  }

  throw new Error("Unhandled number scale");
});

const ungroupedCounts = computed<Record<"none" | "some" | "many", number>>(
  () => ({
    none: 0,
    some: 15 * participantScaleMultiplier.value,
    many: 120 * participantScaleMultiplier.value,
  }),
);

function formatOptionCountLabel({
  label,
  count,
}: {
  label: string;
  count: number;
}): string {
  const formattedCount = `(${formatAmount(count)})`;

  if (/\([^)]*\)\s*$/.test(label)) {
    return label.replace(/\([^)]*\)\s*$/, formattedCount);
  }

  return `${label} ${formattedCount}`;
}

const ungroupedOptions = computed(() => [
  { label: t("ungroupedNone"), value: "none" as const },
  {
    label: formatOptionCountLabel({
      label: t("ungroupedSome"),
      count: ungroupedCounts.value.some,
    }),
    value: "some" as const,
  },
  {
    label: formatOptionCountLabel({
      label: t("ungroupedMany"),
      count: ungroupedCounts.value.many,
    }),
    value: "many" as const,
  },
]);

function generateClusterStats({
  clusterCount,
}: {
  clusterCount: number;
}): ClusterStats[] {
  const stats: ClusterStats[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const baseNumUsers = 5 + Math.floor(Math.random() * 20);
    const baseNumAgrees = Math.floor(Math.random() * baseNumUsers);
    const baseRemaining = baseNumUsers - baseNumAgrees;
    const baseNumDisagrees = Math.floor(Math.random() * baseRemaining);
    const baseNumPasses = baseRemaining - baseNumDisagrees;
    stats.push({
      key: polisKeys[i],
      isAuthorInCluster: i === 0,
      numUsers: baseNumUsers * participantScaleMultiplier.value,
      numAgrees: baseNumAgrees * participantScaleMultiplier.value,
      numDisagrees: baseNumDisagrees * participantScaleMultiplier.value,
      numPasses: baseNumPasses * participantScaleMultiplier.value,
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
  const baseNumParticipants = 30 + Math.floor(Math.random() * 30);
  const baseNumAgrees = Math.floor(
    baseNumParticipants * (0.3 + Math.random() * 0.5),
  );
  const baseRemaining = baseNumParticipants - baseNumAgrees;
  const baseNumDisagrees = Math.floor(
    baseRemaining * (0.3 + Math.random() * 0.5),
  );
  const baseNumPasses = baseRemaining - baseNumDisagrees;

  return {
    opinionSlugId: `mock-op-${index}`,
    createdAt: new Date("2025-11-20"),
    updatedAt: new Date("2025-11-20"),
    opinion: mockStatements[index % mockStatements.length],
    numParticipants: baseNumParticipants * participantScaleMultiplier.value,
    numAgrees: baseNumAgrees * participantScaleMultiplier.value,
    numDisagrees: baseNumDisagrees * participantScaleMultiplier.value,
    numPasses: baseNumPasses * participantScaleMultiplier.value,
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
  const aiLabels =
    aiLabelMode.value === "long"
      ? longAiLabels
      : aiLabelMode.value === "short"
        ? shortAiLabels
        : undefined;
  const balancedSizes = [145, 112, 87, 63, 48, 35];
  const imbalancedSizes = [145, 3, 2, 1, 1, 1];
  const baseSizes = (
    distributionMode.value === "imbalanced" ? imbalancedSizes : balancedSizes
  ).map((size) => size * participantScaleMultiplier.value);

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
      aiLabel: aiLabels?.[i],
      aiSummary: aiLabels === undefined ? undefined : aiSummaries[i],
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
  return clustered + ungroupedCounts.value[ungroupedMode.value];
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

const userClusterData = computed(() => {
  const cluster = Object.values(mockClusters.value).find(
    (item) => item?.isUserInCluster === true,
  );

  return {
    clusterKey: cluster?.key,
    aiLabel: cluster?.aiLabel,
    aiSummary: cluster?.aiSummary,
  };
});

function handleDevVoteMore(): void {
  currentTab.value = "Summary";
}

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

const mockSurveyResults = computed(() =>
  buildMockSurveyResults({
    clusterCount: selectedClusterCount.value,
    aiLabelMode: aiLabelMode.value,
    surveyViewerAccess: surveyViewerAccess.value,
    surveyScenario: effectiveSurveyScenario.value,
    responseScaleMultiplier: participantScaleMultiplier.value,
  }),
);

const hasMockSurvey = computed(
  () =>
    mockSurveyResults.value.hasSurvey && surveyGateScenario.value !== "noSurvey",
);

const surveyStatusByScenario = {
  completeValid: "complete_valid",
  needsUpdate: "needs_update",
  inProgress: "in_progress",
  notStartedRequired: "not_started",
  notStartedOptional: "not_started",
  noSurvey: "no_survey",
} satisfies Record<SurveyGateScenario, SurveyGateStatus>;

const mockSurveyStatus = computed<SurveyGateStatus>(
  () => surveyStatusByScenario[surveyGateScenario.value],
);

const mockSurveyGate = computed<SurveyGateSummary>(() => ({
  hasSurvey: hasMockSurvey.value,
  isOptional: surveyGateScenario.value === "notStartedOptional",
  canParticipate:
    surveyGateScenario.value === "completeValid" ||
    surveyGateScenario.value === "notStartedOptional",
  status: mockSurveyStatus.value,
}));

const surveyResultsQuery = useQuery({
  queryKey: computed(() => [
    "dev-analysis-tab-survey-results",
    selectedClusterCount.value,
    aiLabelMode.value,
    surveyViewerAccess.value,
    effectiveSurveyScenario.value,
    participantScaleMultiplier.value,
    surveyGateScenario.value,
  ]),
  queryFn: () => mockSurveyResults.value,
  staleTime: Infinity,
});

watch(
  hasMockSurvey,
  (hasSurvey) => {
    if (!hasSurvey && currentTab.value === "Survey") {
      currentTab.value = "Summary";
    }
  },
  { immediate: true },
);
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
