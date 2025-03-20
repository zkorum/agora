<template>
  <div>
    <div v-if="clusterMetadataList.length > 1" class="container">
      <ZKTab
        text="All"
        :is-highlighted="model === 'all'"
        @click="clickedTab('all')"
      />

      <div v-for="clusterItem in clusterMetadataList" :key="clusterItem.key">
        <ZKTab
          :text="
            formatClusterLabel(clusterItem.key, false, clusterItem.aiLabel)
          "
          :is-highlighted="model === clusterItem.key"
          @click="clickedTab(clusterItem.key)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";
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
</style>
