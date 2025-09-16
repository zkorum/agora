<template>
  <div class="container">
    <div
      v-for="(imgItem, imageIndex) in activeClusterConfig.imgList"
      :key="imageIndex"
      class="imageStyle"
      :style="{
        width: imgItem.clusterWidthPercent + '%',
        top: imgItem.top + '%',
        left: imgItem.left + '%',
        zIndex: imgItem.isSelected ? 100 + imageIndex : 20 + imageIndex,
      }"
      role="button"
      tabindex="0"
      :aria-label="getClusterAriaLabel(String(imageIndex) as PolisKey)"
      :aria-pressed="imgItem.isSelected"
      @click="handleClusterSelection(String(imageIndex) as PolisKey)"
      @keydown.enter="handleClusterSelection(String(imageIndex) as PolisKey)"
    >
      <div :style="{ position: 'relative' }">
        <img
          :src="
            composeImagePath(
              imgItem.isSelected,
              imageIndex,
              activeClusterConfig.numNodes
            )
          "
          :style="{ width: '100%' }"
          draggable="false"
        />
        <div
          class="clusterNameOverlay borderStyle dynamicFont"
          :class="{ selected: imgItem.isSelected }"
        >
          <div class="clusterLabelFlex">
            <div class="clusterOverlayFontBold">
              {{
                formatClusterLabel(
                  String(imageIndex) as PolisKey,
                  false,
                  clusters[String(imageIndex) as PolisKey]?.aiLabel
                )
              }}
            </div>
            <div class="clusterGroupSize">
              <q-icon name="mdi-account-supervisor-outline" />
              {{ clusters[String(imageIndex) as PolisKey]?.numUsers }}
              ({{
                formatPercentage(
                  calculatePercentage(
                    clusters[String(imageIndex) as PolisKey]!.numUsers,
                    totalParticipantCount
                  )
                )
              }})
            </div>
            <div
              v-if="clusters[String(imageIndex) as PolisKey]?.isUserInCluster"
              class="meIndicator"
            >
              <q-icon name="mdi-account-outline" />
              {{ t("meLabel") }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";
import { calculatePercentage } from "src/shared/common/util";
import { formatPercentage } from "src/utils/common";
import { ref, watch } from "vue";
import { z } from "zod";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  clusterVisualizationTranslations,
  type ClusterVisualizationTranslations,
} from "./ClusterVisualization.i18n";

const props = defineProps<{
  clusters: Partial<PolisClusters>;
  totalParticipantCount: number;
  currentClusterTab: PolisKey;
}>();

const emit = defineEmits<{
  "update:currentClusterTab": [value: PolisKey];
}>();

const { t } = useComponentI18n<ClusterVisualizationTranslations>(
  clusterVisualizationTranslations
);

// Cluster configuration data
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

const clusterConfigs: ClusterConfig[] = [
  {
    numNodes: 2,
    imgList: [
      {
        clusterWidthPercent: 47,
        top: 15,
        left: 2,
        isSelected: false,
      },
      {
        clusterWidthPercent: 42,
        top: 28,
        left: 50,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 3,
    imgList: [
      {
        clusterWidthPercent: 45,
        top: 5,
        left: 28,
        isSelected: false,
      },
      {
        clusterWidthPercent: 45,
        top: 42,
        left: 4,
        isSelected: false,
      },
      {
        clusterWidthPercent: 45,
        top: 50,
        left: 52,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 4,
    imgList: [
      {
        clusterWidthPercent: 40,
        top: 5,
        left: 8,
        isSelected: false,
      },
      {
        clusterWidthPercent: 40,
        top: 2,
        left: 52,
        isSelected: false,
      },
      {
        clusterWidthPercent: 40,
        top: 52,
        left: 5,
        isSelected: false,
      },
      {
        clusterWidthPercent: 40,
        top: 50,
        left: 48,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 5,
    imgList: [
      {
        clusterWidthPercent: 40,
        top: 8,
        left: 10,
        isSelected: false,
      },
      {
        clusterWidthPercent: 40,
        top: 12,
        left: 52,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 50,
        left: 5,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 55,
        left: 35,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 55,
        left: 65,
        isSelected: false,
      },
    ],
  },
  {
    numNodes: 6,
    imgList: [
      {
        clusterWidthPercent: 35,
        top: 5,
        left: 10,
        isSelected: false,
      },
      {
        clusterWidthPercent: 40,
        top: 8,
        left: 45,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 35,
        left: 5,
        isSelected: false,
      },
      {
        clusterWidthPercent: 35,
        top: 35,
        left: 32,
        isSelected: false,
      },
      {
        clusterWidthPercent: 30,
        top: 40,
        left: 70,
        isSelected: false,
      },
      {
        clusterWidthPercent: 40,
        top: 73,
        left: 30,
        isSelected: false,
      },
    ],
  },
];

// Validate cluster configurations
const validationResult = z.array(zodClusterConfig).safeParse(clusterConfigs);
if (!validationResult.success) {
  console.error(
    "Invalid cluster configuration detected:",
    validationResult.error
  );
}

// Get the appropriate cluster configuration based on cluster count
const activeClusterConfig = ref<ClusterConfig>(getClusterConfigForCount());

function getClusterConfigForCount(): ClusterConfig {
  const clusterCount = Object.keys(props.clusters).length;

  if (clusterCount < 2 || clusterCount > 6) {
    console.warn(
      `Unsupported cluster count: ${clusterCount}, using default configuration`
    );
    return clusterConfigs[0];
  }

  return clusterConfigs[clusterCount - 2];
}

// Update cluster selection visualization
function updateClusterVisualization(): void {
  clearAllSelection();
  const currentTabKey = Number(props.currentClusterTab);
  if (currentTabKey < activeClusterConfig.value.imgList.length) {
    activeClusterConfig.value.imgList[currentTabKey].isSelected = true;
  }
}

function clearAllSelection(): void {
  activeClusterConfig.value.imgList.forEach((imgItem) => {
    imgItem.isSelected = false;
  });
}

function handleClusterSelection(clusterKey: PolisKey): void {
  emit("update:currentClusterTab", clusterKey);
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
  const isSelected = props.currentClusterTab === clusterKey;
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

// Watch for changes in currentClusterTab to update visualization
watch(() => props.currentClusterTab, updateClusterVisualization, {
  immediate: true,
});

// Watch for changes in cluster count to update active configuration
watch(
  () => Object.keys(props.clusters).length,
  () => {
    activeClusterConfig.value = getClusterConfigForCount();
    updateClusterVisualization();
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  width: 100%;
  padding: 40%;
  margin-bottom: 1rem;
}

.imageStyle {
  position: absolute;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  // Prevent unwanted drag and selection behaviors
  user-select: none;
  -webkit-user-drag: none;
  touch-action: manipulation;

  img {
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none; // Prevent image from receiving pointer events directly
  }

  &:hover {
    filter: brightness(1.05);
  }

  &:focus-visible {
    outline: 3px solid #007bff;
    outline-offset: 4px;
    border-radius: 8px;
  }
}

.borderStyle {
  border-radius: clamp(0.5rem, 2vw, 1rem);
  border: 1px solid #f0f0f0;
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

  // Center the overlay relative to the cluster
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  // Ensure overlay stays within bounds
  max-width: 80%;

  &.selected {
    border-color: $primary;
    background-color: rgb(233, 243, 255);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  }
}

.clusterOverlayFontBold {
  font-weight: var(--font-weight-semibold);
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

.meIndicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.25rem, 1vw, 0.5rem);
  color: #007bff;
  font-weight: var(--font-weight-semibold);
  text-align: center;
  font-size: clamp(0.6rem, 2vw, 0.75rem);
  margin-top: clamp(0.125rem, 0.5vw, 0.25rem);
}
</style>
