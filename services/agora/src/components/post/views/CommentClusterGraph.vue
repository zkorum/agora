<template>
  <div>
    <div class="container">
      <div
        v-for="imgItem in activeCluster.imgList"
        :key="imgItem.imageBaseName"
        class="imageStyle"
        :style="{
          width: activeCluster.clusterWidthPercent + '%',
          top: imgItem.top + '%',
          left: imgItem.left + '%',
        }"
      >
        <div :style="{ position: 'relative' }">
          <img
            :src="composeImagePath(imgItem.imageBaseName, imgItem.isSelected)"
            :style="{ width: '100%' }"
            @mouseover="imgItem.isSelected = true"
            @mouseleave="imgItem.isSelected = false"
          />
          <div
            class="clusterNameOverlay"
            :style="{
              top: '30%',
              left: '45%',
            }"
          >
            {{ encodeClusterIndexToName(imgItem.index) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { encodeClusterIndexToName } from "src/utils/component/opinion";
import { ref } from "vue";

defineProps<{
  numClusters: number;
}>();

interface ClusterConfig {
  numNodes: number;
  clusterWidthPercent: number;
  imgList: ClusterImg[];
}

interface ClusterImg {
  index: number;
  top: number;
  left: number;
  imageBaseName: string;
  isSelected: boolean;
}

const VITE_PUBLIC_DIR = process.env.VITE_PUBLIC_DIR;

const clusterConfig: ClusterConfig[] = [
  {
    numNodes: 2,
    clusterWidthPercent: 30,
    imgList: [
      {
        index: 0,
        top: 20,
        left: 20,
        imageBaseName: "cluster2-1",
        isSelected: false,
      },
      {
        index: 1,
        top: 25,
        left: 50,
        imageBaseName: "cluster2-2",
        isSelected: false,
      },
    ],
  },
];

const activeCluster = ref<ClusterConfig>(clusterConfig[0]);

function composeImagePath(imageBaseName: string, isSelected: boolean) {
  const imgSuffix = isSelected ? "-on" : "-off";

  return (
    VITE_PUBLIC_DIR + "/images/cluster/" + imageBaseName + imgSuffix + ".svg"
  );
}
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  width: 100%;
  height: 20rem;
  background-color: red;
}

.imageStyle {
  position: absolute;
}

.imageStyle:hover {
  cursor: pointer;
}

.clusterNameOverlay {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: $primary;
}
</style>
