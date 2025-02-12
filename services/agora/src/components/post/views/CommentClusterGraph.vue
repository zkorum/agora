<template>
  <div>
    <div class="container">
      <div
        v-for="(imgItem, imageIndex) in activeCluster.imgList"
        :key="imageIndex"
        class="imageStyle"
        :style="{
          width: activeCluster.clusterWidthPercent + '%',
          top: imgItem.top + '%',
          left: imgItem.left + '%',
        }"
      >
        <!-- TODO: Integration the show me label -->
        <div
          v-if="showMeLabel"
          class="clusterMeLabel borderStyle clusterMeFlex dynamicFont"
        >
          <q-icon name="mdi-account-outline" />
          Me
        </div>

        <div
          :style="{ position: 'relative' }"
          @click="
            emit(
              'selectedCluster',
              String(
                imageIndex
              ) as PolisKey /* this is enforce because of the zod type below */
            )
          "
        >
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
                    clusters[imageIndex].key,
                    clusters[imageIndex].aiLabel
                  )
                }}
              </div>
              <div class="clusterGroupSize">
                <q-icon name="mdi-account-supervisor-outline" />
                {{ clusters[imageIndex].numUsers }} ({{
                  formatPercentage(
                    calculatePercentage(
                      clusters[imageIndex].numUsers,
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
  </div>
</template>

<script setup lang="ts">
import { ClusterMetadata, PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";
import { formatPercentage, calculatePercentage } from "src/utils/common";
import { ref, watch } from "vue";
import { z } from "zod";

const emit = defineEmits<{
  (e: "selectedCluster", clusterKey: PolisKey): void;
}>();

const props = defineProps<{
  showMeLabel: boolean;
  clusters: ClusterMetadata[];
  currentClusterTab: string;
  totalParticipantCount: number;
}>();

const VITE_PUBLIC_DIR = process.env.VITE_PUBLIC_DIR;

const zodClusterImg = z.object({
  top: z.number(),
  left: z.number(),
  isSelected: z.boolean(),
});

const zodClusterConfig = z.object({
  numNodes: z.number(),
  clusterWidthPercent: z.number(),
  imgList: z.array(zodClusterImg).max(5).min(0),
});

type ClusterConfig = z.infer<typeof zodClusterConfig>;

const clusterConfig: ClusterConfig[] = [
  {
    numNodes: 2,
    clusterWidthPercent: 35,
    imgList: [
      {
        top: 15,
        left: 15,
        isSelected: false,
      },
      {
        top: 25,
        left: 50,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 3,
    clusterWidthPercent: 30,
    imgList: [
      {
        top: 15,
        left: 30,
        isSelected: false,
      },
      {
        top: 48,
        left: 20,
        isSelected: false,
      },
      {
        top: 50,
        left: 48,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 4,
    clusterWidthPercent: 30,
    imgList: [
      {
        top: 5,
        left: 15,
        isSelected: false,
      },
      {
        top: 5,
        left: 45,
        isSelected: false,
      },
      {
        top: 50,
        left: 15,
        isSelected: false,
      },
      {
        top: 53,
        left: 46,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 5,
    clusterWidthPercent: 30,
    imgList: [
      {
        top: 2,
        left: 15,
        isSelected: false,
      },
      {
        top: 5,
        left: 45,
        isSelected: false,
      },
      {
        top: 45,
        left: 10,
        isSelected: false,
      },
      {
        top: 45,
        left: 37,
        isSelected: false,
      },
      {
        top: 40,
        left: 68,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 6,
    clusterWidthPercent: 30,
    imgList: [
      {
        top: 5,
        left: 15,
        isSelected: false,
      },
      {
        top: 12,
        left: 50,
        isSelected: false,
      },
      {
        top: 37,
        left: 10,
        isSelected: false,
      },
      {
        top: 32,
        left: 35,
        isSelected: false,
      },
      {
        top: 42,
        left: 70,
        isSelected: false,
      },
      {
        top: 75,
        left: 40,
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
if (props.clusters.length >= 2 && props.clusters.length <= 6) {
  targetClusterIndex = props.clusters.length - 2;
}
const activeCluster = ref<ClusterConfig>(clusterConfig[targetClusterIndex]);

watch(
  () => props.currentClusterTab,
  () => {
    if (props.currentClusterTab == "all") {
      clearAllSelection();
    } else {
      clearAllSelection();
      const currentTabKey = Number(props.currentClusterTab);
      activeCluster.value.imgList[currentTabKey].isSelected = true;
    }
  }
);

function clearAllSelection() {
  activeCluster.value.imgList.forEach((imgItem) => {
    imgItem.isSelected = false;
  });
}

function composeImagePath(
  isSelected: boolean,
  index: number,
  clusterNumber: number
) {
  const imgSuffix = isSelected ? "-on" : "-off";

  return (
    VITE_PUBLIC_DIR +
    "/images/cluster/cluster" +
    clusterNumber +
    "-" +
    (index + 1) +
    imgSuffix +
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
</style>
