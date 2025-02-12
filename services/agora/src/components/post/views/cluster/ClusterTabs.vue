<template>
  <div>
    <div class="container">
      <div
        class="tabStyle"
        :class="{ highlightTab: model === 'all' }"
        @click="clickedTab('all')"
      >
        All
      </div>

      <div
        v-for="clusterItem in clusterMetadataList"
        :key="clusterItem.key"
        class="tabStyle"
        :class="{ highlightTab: model === clusterItem.key }"
        @click="clickedTab(clusterItem.key)"
      >
        {{ formatClusterLabel(clusterItem.key) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClusterMetadata, PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";

const model = defineModel({ required: true, type: String });

defineProps<{
  clusterMetadataList: ClusterMetadata[];
}>();

function clickedTab(tabKey: PolisKey | "all") {
  model.value = tabKey;
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tabStyle {
  cursor: pointer;
  padding-left: 8px;
  padding-right: 8px;
  padding-top: 6px;
  padding-bottom: 6px;
  font-weight: 500;
  color: #7d7a85;
  user-select: none;
}

.highlightTab {
  border-bottom: 3px solid;
  border-color: $primary;
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
}
</style>
