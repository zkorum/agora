<template>
  <div class="report-cluster-list">
    <div
      v-for="item in clusterEntries"
      :key="item.key"
      class="report-cluster-item"
      :class="{
        'report-cluster-item--selected': isClusterSelected({
          clusterKey: item.key,
        }),
      }"
    >
      <div class="report-cluster-shape">
        <img
          :src="
            composeImagePath({
              isSelected: isClusterSelected({ clusterKey: item.key }),
              imageIndex: item.imageIndex,
              clusterNumber: activeClusterConfig.numNodes,
            })
          "
          draggable="false"
        />
      </div>
      <div class="report-cluster-label">
        <div class="report-cluster-label__title">
          {{ getClusterLabel({ clusterKey: item.key }) }}
        </div>
        <div class="report-cluster-label__size">
          <q-icon name="mdi-account-supervisor-outline" />
          {{ formatAmount(item.cluster.numUsers) }}
          ({{
            formatPercentage(
              calculatePercentage(item.cluster.numUsers, totalParticipantCount)
            )
          }})
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { calculatePercentage } from "src/shared/util";
import { formatAmount, formatPercentage } from "src/utils/common";
import { formatClusterLabel } from "src/utils/component/opinion";
import { computed } from "vue";

const props = defineProps<{
  clusters: Partial<PolisClusters>;
  totalParticipantCount: number;
  selectedClusterKey?: PolisKey;
}>();

interface ClusterImg {
  clusterWidthPercent: number;
}

interface ClusterConfig {
  numNodes: number;
  imgList: readonly ClusterImg[];
}

const polisKeys = ["0", "1", "2", "3", "4", "5"] satisfies PolisKey[];

const clusterConfigs = [
  {
    numNodes: 2,
    imgList: [{ clusterWidthPercent: 47 }, { clusterWidthPercent: 42 }],
  },
  {
    numNodes: 3,
    imgList: [
      { clusterWidthPercent: 45 },
      { clusterWidthPercent: 45 },
      { clusterWidthPercent: 45 },
    ],
  },
  {
    numNodes: 4,
    imgList: [
      { clusterWidthPercent: 40 },
      { clusterWidthPercent: 40 },
      { clusterWidthPercent: 44 },
      { clusterWidthPercent: 40 },
    ],
  },
  {
    numNodes: 5,
    imgList: [
      { clusterWidthPercent: 40 },
      { clusterWidthPercent: 40 },
      { clusterWidthPercent: 30 },
      { clusterWidthPercent: 35 },
      { clusterWidthPercent: 32 },
    ],
  },
  {
    numNodes: 6,
    imgList: [
      { clusterWidthPercent: 35 },
      { clusterWidthPercent: 40 },
      { clusterWidthPercent: 30 },
      { clusterWidthPercent: 35 },
      { clusterWidthPercent: 30 },
      { clusterWidthPercent: 40 },
    ],
  },
] satisfies readonly ClusterConfig[];

const clusterCount = computed(() => Object.keys(props.clusters).length);
const useLetterCodes = computed(() => clusterCount.value >= 4);

const activeClusterConfig = computed(() => {
  const fallbackConfig = clusterConfigs[0];

  if (fallbackConfig === undefined) {
    throw new Error("Missing fallback cluster configuration");
  }

  if (clusterCount.value < 2 || clusterCount.value > 6) {
    return fallbackConfig;
  }

  return clusterConfigs[clusterCount.value - 2] ?? fallbackConfig;
});

const clusterEntries = computed(() =>
  activeClusterConfig.value.imgList.flatMap((imgItem, imageIndex) => {
    const key = polisKeys[imageIndex];

    if (key === undefined) {
      return [];
    }

    const cluster = props.clusters[key];

    if (!cluster) {
      return [];
    }

    return [{ key, cluster, imgItem, imageIndex }];
  })
);

function isClusterSelected({ clusterKey }: { clusterKey: PolisKey }): boolean {
  return (
    props.selectedClusterKey === undefined ||
    props.selectedClusterKey === clusterKey
  );
}

function getClusterLabel({ clusterKey }: { clusterKey: PolisKey }): string {
  const cluster = props.clusters[clusterKey];
  if (useLetterCodes.value) {
    const code = formatClusterLabel(clusterKey, false);
    return cluster?.aiLabel ? `${code} · ${cluster.aiLabel}` : code;
  }

  return cluster?.aiLabel || formatClusterLabel(clusterKey, false);
}

function composeImagePath({
  isSelected,
  imageIndex,
  clusterNumber,
}: {
  isSelected: boolean;
  imageIndex: number;
  clusterNumber: number;
}): string {
  const imgSuffix = isSelected ? "-on" : "-off";
  const version = "-v2";

  return `/images/cluster/cluster${clusterNumber}-${imageIndex + 1}${imgSuffix}${version}.svg`;
}
</script>

<style lang="scss" scoped>
.report-cluster-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  margin: 0 auto 1rem;
}

.report-cluster-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1 1 12rem;
  max-width: 15rem;
  min-width: 12rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid #e6e3ee;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.report-cluster-item--selected {
  border-color: $primary;
  background: #f5f3ff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.18);
}

.report-cluster-shape {
  position: relative;
  flex: 0 0 3.25rem;
  aspect-ratio: 1.12 / 1;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }
}

.report-cluster-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.report-cluster-label__title {
  color: #333238;
  font-weight: var(--font-weight-semibold);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.report-cluster-label__size {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #666;
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
