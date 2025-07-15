<template>
  <div>
    <div v-if="clusterMetadataList.length > 1" class="container">
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
import type { ClusterMetadata, PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";

defineProps<{
  clusterMetadataList: ClusterMetadata[];
  selectedClusterKey: PolisKey;
}>();

const emit = defineEmits<{
  (e: "changedClusterKey", key: PolisKey): void;
}>();

function clickedTab(tabKey: PolisKey) {
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
