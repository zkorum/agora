<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('groupsTitle')"
        />
      </template>

      <template #body>
        <EmptyStateMessage
          v-if="Object.keys(props.clusters).length <= 1"
          :message="t('notEnoughGroupsMessage')"
        />
        <div v-else class="container">
          <div class="infoIcon">
            <ZKButton button-type="icon" @click="showClusterInformation = true">
              <ZKIcon
                color="#6d6a74"
                name="mdi-information-outline"
                size="1.2rem"
              />
            </ZKButton>
          </div>

          <ClusterInformationDialog v-model="showClusterInformation" />

          <div
            v-for="(imgItem, imageIndex) in activeCluster.imgList"
            :key="imageIndex"
            class="imageStyle"
            :style="{
              width: imgItem.clusterWidthPercent + '%',
              top: imgItem.top + '%',
              left: imgItem.left + '%',
            }"
            role="button"
            tabindex="0"
            :aria-label="getClusterAriaLabel(String(imageIndex) as PolisKey)"
            :aria-pressed="imgItem.isSelected"
            @click="toggleClusterSelection(String(imageIndex) as PolisKey)"
            @keydown.enter="
              toggleClusterSelection(String(imageIndex) as PolisKey)
            "
          >
            <!-- TODO: Integration the show me label -->
            <div
              v-if="
                props.clusters[String(imageIndex) as PolisKey]?.isUserInCluster
              "
              class="clusterMeLabel borderStyle clusterMeFlex dynamicFont"
            >
              <q-icon name="mdi-account-outline" />
              {{ t("meLabel") }}
            </div>

            <div :style="{ position: 'relative' }">
              <img
                :src="
                  composeImagePath(
                    imgItem.isSelected,
                    imageIndex,
                    activeCluster.numNodes
                  )
                "
                :style="{ width: '100%' }"
              />
              <div class="clusterNameOverlay borderStyle dynamicFont">
                <div class="clusterLabelFlex">
                  <div class="clusterOverlayFontBold">
                    {{
                      formatClusterLabel(
                        String(imageIndex) as PolisKey,
                        false,
                        props.clusters[String(imageIndex) as PolisKey]?.aiLabel
                      )
                    }}
                  </div>
                  <div class="clusterGroupSize">
                    <q-icon name="mdi-account-supervisor-outline" />
                    {{
                      props.clusters[String(imageIndex) as PolisKey]?.numUsers
                    }}
                    ({{
                      formatPercentage(
                        calculatePercentage(
                          props.clusters[String(imageIndex) as PolisKey]! // I know it's not undefined here by construction
                            .numUsers,
                          totalParticipantCount
                        )
                      )
                    }})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template v-if="Object.keys(props.clusters).length > 1">
          <OpinionGroupSelector
            :cluster-metadata-list="props.clusters"
            :selected-cluster-key="currentClusterTab"
            @changed-cluster-key="currentClusterTab = $event"
          />

          <GroupConsensusSummary
            v-if="currentAiSummary"
            :summary="currentAiSummary"
            :selected-cluster-key="currentClusterTab"
          />

          <OpinionGroupComments
            :conversation-slug-id="props.conversationSlugId"
            :item-list="
              props.clusters[currentClusterTab]?.representative ??
              ([] as OpinionItem[])
            "
            :current-cluster-tab="currentClusterTab"
            :has-ungrouped-participants="hasUngroupedParticipants"
            @update:current-cluster-tab="currentClusterTab = $event"
          />
        </template>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import type {
  OpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";
import { calculatePercentage } from "src/shared/common/util";
import { formatPercentage } from "src/utils/common";
import { computed, ref, watch } from "vue";
import { z } from "zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import ClusterInformationDialog from "./ClusterInformationDialog.vue";
import OpinionGroupSelector from "./OpinionGroupSelector.vue";
import GroupConsensusSummary from "./GroupConsensusSummary.vue";
import OpinionGroupComments from "./OpinionGroupComments.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  opinionGroupTabTranslations,
  type OpinionGroupTabTranslations,
} from "./OpinionGroupTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  clusters: Partial<PolisClusters>;
  totalParticipantCount: number;
}>();

const { t } = useComponentI18n<OpinionGroupTabTranslations>(
  opinionGroupTabTranslations
);

const hasUngroupedParticipants = computed(() => {
  if (Object.keys(props.clusters).length === 0) {
    return false;
  }
  const totalGroupParticipants = Object.values(props.clusters).reduce(
    (sum, cluster) => sum + cluster.numUsers,
    0
  );
  return props.totalParticipantCount > totalGroupParticipants;
});

const currentClusterTab = ref<PolisKey>("0");

const showClusterInformation = ref(false);

const zodClusterImg = z.object({
  clusterWidthPercent: z.number(),
  top: z.number(),
  left: z.number(),
  isSelected: z.boolean(),
});

const zodClusterConfig = z.object({
  numNodes: z.number(),
  imgList: z.array(zodClusterImg).max(6).min(2),
});

type ClusterConfig = z.infer<typeof zodClusterConfig>;

const clusterConfig: ClusterConfig[] = [
  // 2 clusters - side by side layout
  {
    numNodes: 2,
    imgList: [
      {
        clusterWidthPercent: 35,
        top: 20,
        left: 12,
        isSelected: false,
      },
      {
        clusterWidthPercent: 33,
        top: 23,
        left: 53,
        isSelected: false,
      },
    ],
  },
  // 3 clusters - triangle formation
  {
    numNodes: 3,
    imgList: [
      {
        clusterWidthPercent: 32,
        top: 12,
        left: 34,
        isSelected: false,
      },
      {
        clusterWidthPercent: 32,
        top: 55,
        left: 17,
        isSelected: false,
      },
      {
        clusterWidthPercent: 32,
        top: 55,
        left: 51,
        isSelected: false,
      },
    ],
  },
  // 4 clusters - square formation
  {
    numNodes: 4,
    imgList: [
      {
        clusterWidthPercent: 30,
        top: 8,
        left: 15,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 8,
        left: 55,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 62,
        left: 15,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 62,
        left: 55,
        isSelected: false,
      },
    ],
  },
  // 5 clusters - pentagon formation
  {
    numNodes: 5,
    imgList: [
      {
        clusterWidthPercent: 28,
        top: 5,
        left: 36,
        isSelected: false,
      },
      {
        clusterWidthPercent: 28,
        top: 25,
        left: 10,
        isSelected: false,
      },
      {
        clusterWidthPercent: 28,
        top: 25,
        left: 62,
        isSelected: false,
      },
      {
        clusterWidthPercent: 28,
        top: 65,
        left: 20,
        isSelected: false,
      },
      {
        clusterWidthPercent: 28,
        top: 65,
        left: 52,
        isSelected: false,
      },
    ],
  },
  // 6 clusters - hexagon formation
  {
    numNodes: 6,
    imgList: [
      {
        clusterWidthPercent: 26,
        top: 8,
        left: 20,
        isSelected: false,
      },
      {
        clusterWidthPercent: 26,
        top: 8,
        left: 54,
        isSelected: false,
      },
      {
        clusterWidthPercent: 26,
        top: 35,
        left: 8,
        isSelected: false,
      },
      {
        clusterWidthPercent: 26,
        top: 35,
        left: 66,
        isSelected: false,
      },
      {
        clusterWidthPercent: 26,
        top: 62,
        left: 20,
        isSelected: false,
      },
      {
        clusterWidthPercent: 26,
        top: 62,
        left: 54,
        isSelected: false,
      },
    ],
  },
];
const result = z.array(zodClusterConfig).safeParse(clusterConfig);
if (!result.success) {
  console.log(
    "Too many clusters, the backend is not ready to support them",
    result.error
  );
} // TODO: do this properly...

let targetClusterIndex = 0;
if (
  Object.keys(props.clusters).length >= 2 &&
  Object.keys(props.clusters).length <= 6
) {
  targetClusterIndex = Object.keys(props.clusters).length - 2;
}
const activeCluster = ref<ClusterConfig>(clusterConfig[targetClusterIndex]);

updateClusterTab();

watch(currentClusterTab, () => {
  updateClusterTab();
});

const currentAiSummary = computed(() => {
  if (currentClusterTab.value in props.clusters) {
    return props.clusters[currentClusterTab.value]?.aiSummary;
  }
  return undefined;
});

function toggleClusterSelection(clusterKey: PolisKey) {
  currentClusterTab.value = clusterKey;
}

function updateClusterTab() {
  clearAllSelection();
  const currentTabKey = Number(currentClusterTab.value);
  activeCluster.value.imgList[currentTabKey].isSelected = true;
}

function clearAllSelection() {
  activeCluster.value.imgList.forEach((imgItem) => {
    imgItem.isSelected = false;
  });
}

function getClusterAriaLabel(clusterKey: PolisKey): string {
  const cluster = props.clusters[clusterKey];
  if (!cluster) {
    return `${t("groupsTitle")} ${Number(clusterKey) + 1}`;
  }

  const clusterLabel = formatClusterLabel(clusterKey, false, cluster.aiLabel);
  const userCount = cluster.numUsers;
  const percentage = formatPercentage(
    calculatePercentage(userCount, props.totalParticipantCount)
  );
  const isSelected = currentClusterTab.value === clusterKey;
  const isUserInCluster = cluster.isUserInCluster;

  let ariaLabel = `${clusterLabel}, ${userCount} participants (${percentage})`;

  if (isUserInCluster) {
    ariaLabel += `, ${t("meLabel")}`;
  }

  if (isSelected) {
    ariaLabel += ", selected";
  } else {
    ariaLabel += ", press Enter to select";
  }

  return ariaLabel;
}

function composeImagePath(
  isSelected: boolean,
  index: number,
  clusterNumber: number
): string {
  const imgSuffix = isSelected ? "-on" : "-off";
  const version = "-v2";

  return (
    process.env.VITE_PUBLIC_DIR +
    "/images/cluster/cluster" +
    clusterNumber +
    "-" +
    (index + 1) +
    imgSuffix +
    version +
    ".svg"
  );
}
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-width: min(500px, 90vw);
  margin: 0 auto;
  background: transparent;

  // Responsive sizing
  @media (max-width: 768px) {
    max-width: 95vw;
    aspect-ratio: 1.1;
  }

  @media (max-width: 480px) {
    max-width: 100vw;
    aspect-ratio: 1.2;
  }
}

.imageStyle {
  position: absolute;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  &:hover {
    filter: brightness(1.05);
  }

  &:focus-visible {
    outline: 3px solid #007bff;
    outline-offset: 4px;
    border-radius: 8px;
  }
}

.clusterMeFlex {
  display: flex;
  gap: clamp(0.25rem, 1vw, 0.5rem);
  align-items: center;
  justify-content: center;
}

.clusterMeLabel {
  position: absolute;
  top: 0px;
  right: 16px;
  background-color: #007bff;
  color: black;
  z-index: 100;
  transform: translateX(50%);
}

.borderStyle {
  border-radius: clamp(0.5rem, 2vw, 1rem);
  border: 1px solid #e0e0e0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  padding: clamp(0.25rem, 1.5vw, 0.75rem) clamp(0.5rem, 2vw, 1rem);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dynamicFont {
  font-size: clamp(0.65rem, 2.5vw, 0.85rem);
  line-height: 1.2;
}

.clusterNameOverlay {
  position: absolute;
  user-select: none;
  pointer-events: none;
  z-index: 10;

  // Center the overlay relative to the cluster
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  // Ensure overlay stays within bounds
  max-width: 80%;
}

.clusterOverlayFontBold {
  font-weight: 600;
  text-align: center;
  margin-bottom: clamp(0.125rem, 0.5vw, 0.25rem);
}

.clusterLabelFlex {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.125rem, 0.5vw, 0.25rem);
}

.clusterGroupSize {
  display: flex;
  align-items: center;
  gap: clamp(0.25rem, 1vw, 0.5rem);
  white-space: nowrap;
  font-size: clamp(0.6rem, 2vw, 0.75rem);
  color: #666;
}

.infoIcon {
  position: absolute;
  right: clamp(0.5rem, 2vw, 1rem);
  top: clamp(0.5rem, 2vw, 1rem);
  z-index: 50;
}
</style>
