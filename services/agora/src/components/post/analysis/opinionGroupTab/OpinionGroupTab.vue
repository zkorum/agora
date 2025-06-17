<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          title="What are the opinion groups?"
          :show-choice="'whatIsThis'"
        />
      </template>

      <template #body>
        <div class="container">
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
            @click="toggleClusterSelection(String(imageIndex) as PolisKey)"
          >
            <!-- TODO: Integration the show me label -->
            <div
              v-if="props.polis.clusters[imageIndex].isUserInCluster"
              class="clusterMeLabel borderStyle clusterMeFlex dynamicFont"
            >
              <q-icon name="mdi-account-outline" />
              Me
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
              <div
                class="clusterNameOverlay borderStyle dynamicFont"
                :style="{
                  top: '30%',
                  left: '22%',
                }"
              >
                <div class="clusterLabelFlex">
                  <div class="clusterOverlayFontBold">
                    {{
                      formatClusterLabel(
                        props.polis.clusters[imageIndex].key,
                        false,
                        props.polis.clusters[imageIndex].aiLabel
                      )
                    }}
                  </div>
                  <div class="clusterGroupSize">
                    <q-icon name="mdi-account-supervisor-outline" />
                    {{ props.polis.clusters[imageIndex].numUsers }} ({{
                      formatPercentage(
                        calculatePercentage(
                          props.polis.clusters[imageIndex].numUsers,
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

        <ClusterTabs
          :cluster-metadata-list="props.polis.clusters"
          :selected-cluster-key="currentClusterTab"
          @changed-cluster-key="currentClusterTab = $event"
        />

        <CommentConsensusSummary
          v-if="currentAiSummary"
          :summary="currentAiSummary"
          :selected-cluster-key="currentClusterTab"
        />
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";
import { formatPercentage, calculatePercentage } from "src/utils/common";
import { computed, ref, watch } from "vue";
import { z } from "zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import ClusterInformationDialog from "./ClusterInformationDialog.vue";
import ClusterTabs from "./ClusterTabs.vue";
import CommentConsensusSummary from "../CommentConsensusSummary.vue";
import { SelectedClusterKeyType } from "src/utils/component/analysis/analysisTypes";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  totalParticipantCount: number;
}>();

const currentClusterTab = ref<SelectedClusterKeyType>("all");

const showClusterInformation = ref(false);

const VITE_PUBLIC_DIR = process.env.VITE_PUBLIC_DIR;

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
  {
    numNodes: 2,
    imgList: [
      {
        clusterWidthPercent: 35,
        top: 15,
        left: 11,
        isSelected: false,
      },
      {
        clusterWidthPercent: 32,
        top: 25,
        left: 48,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 3,
    imgList: [
      {
        clusterWidthPercent: 30,
        top: 14,
        left: 30,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 50,
        left: 22,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 51,
        left: 50,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 4,
    imgList: [
      {
        clusterWidthPercent: 30,
        top: 10,
        left: 15,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 5,
        left: 44,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 55,
        left: 13,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 51,
        left: 42,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 5,
    imgList: [
      {
        clusterWidthPercent: 30,
        top: 1,
        left: 14,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 7,
        left: 42,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 41,
        left: 4,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 41,
        left: 29,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 43,
        left: 58,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 6,
    imgList: [
      {
        clusterWidthPercent: 28,
        top: 6,
        left: 14,
        isSelected: false,
      },
      {
        clusterWidthPercent: 35,
        top: 10,
        left: 40,
        isSelected: false,
      },
      {
        clusterWidthPercent: 23,
        top: 37,
        left: 13,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 32,
        left: 33,
        isSelected: false,
      },
      {
        clusterWidthPercent: 23,
        top: 45,
        left: 65,
        isSelected: false,
      },
      {
        clusterWidthPercent: 35,
        top: 75,
        left: 30,
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
if (props.polis.clusters.length >= 2 && props.polis.clusters.length <= 6) {
  targetClusterIndex = props.polis.clusters.length - 2;
}
const activeCluster = ref<ClusterConfig>(clusterConfig[targetClusterIndex]);

updateClusterTab();

watch(currentClusterTab, () => {
  updateClusterTab();
});

const currentAiSummary = computed(() => {
  if (currentClusterTab.value === "all") {
    return props.polis.aiSummary;
  } else if (
    typeof currentClusterTab.value === "string" &&
    parseInt(currentClusterTab.value) in props.polis.clusters
  ) {
    return props.polis.clusters[parseInt(currentClusterTab.value)].aiSummary;
  }
  return undefined;
});

function toggleClusterSelection(clusterKey: PolisKey) {
  if (currentClusterTab.value == clusterKey) {
    currentClusterTab.value = "all";
  } else {
    currentClusterTab.value = clusterKey;
  }
}

function updateClusterTab() {
  if (currentClusterTab.value == "all") {
    clearAllSelection(true);
  } else {
    clearAllSelection(false);
    const currentTabKey = Number(currentClusterTab.value);
    activeCluster.value.imgList[currentTabKey].isSelected = true;
  }
}

function clearAllSelection(useBlueColor: boolean) {
  activeCluster.value.imgList.forEach((imgItem) => {
    imgItem.isSelected = useBlueColor;
  });
}

function composeImagePath(
  isSelected: boolean,
  index: number,
  clusterNumber: number
) {
  const imgSuffix = isSelected ? "-on" : "-off";
  const version = "-v2";

  return (
    VITE_PUBLIC_DIR +
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
  padding: 30%;
}

.imageStyle {
  position: absolute;
}

.imageStyle:hover {
  cursor: pointer;
}

.clusterMeFlex {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.clusterMeLabel {
  position: absolute;
  top: 0;
  left: 0;
  background-color: white;
  z-index: 100;
}

.borderStyle {
  border-radius: 1rem;
  border-style: solid;
  border-width: 1px;
  border-color: lightgray;
  background-color: white;
  padding-top: min(0.5rem, 1vw);
  padding-bottom: min(0.5rem, 1vw);
  padding-left: min(1rem, 3vw);
  padding-right: min(1rem, 3vw);
}

.dynamicFont {
  font-size: min(0.8rem, 3vw);
}

.clusterNameOverlay {
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
}

.clusterOverlayFontBold {
  font-weight: 600;
}

.clusterLabelFlex {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: column;
  align-items: center;
}

.clusterGroupSize {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  gap: min(0.5rem, 1vw);
  align-items: center;
  white-space: nowrap;
}

.infoIcon {
  position: absolute;
  right: 1rem;
  top: 1rem;
}
</style>
