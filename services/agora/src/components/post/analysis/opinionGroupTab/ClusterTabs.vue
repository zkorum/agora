<template>
  <div>
    <div v-if="clusterMetadataList.length > 1" class="container">
      <ZKTab
        text="All"
        :is-highlighted="selectedClusterKey === 'all'"
        :should-underline-on-highlight="true"
        @click="clickedTab('all')"
      />

      <div v-for="clusterItem in clusterMetadataList" :key="clusterItem.key">
        <ZKTab
          :text="
            formatClusterLabel(clusterItem.key, false, clusterItem.aiLabel)
          "
          :is-highlighted="selectedClusterKey === clusterItem.key"
          :should-underline-on-highlight="true"
          @click="clickedTab(clusterItem.key)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { ClusterMetadata } from "src/shared/types/zod";
import { SelectedClusterKeyType } from "src/utils/component/analysis/analysisTypes";
import { formatClusterLabel } from "src/utils/component/opinion";

defineProps<{
  clusterMetadataList: ClusterMetadata[];
  selectedClusterKey: SelectedClusterKeyType;
}>();

const emit = defineEmits<{
  (e: "changedClusterKey", key: SelectedClusterKeyType): void;
}>();

function clickedTab(tabKey: SelectedClusterKeyType) {
  emit("changedClusterKey", tabKey);
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
