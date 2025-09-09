<template>
  <div v-if="isLoading" class="analysisLoading">
    <q-spinner-gears size="50px" color="primary" />
  </div>
  <div v-if="!isLoading">
    <div class="container flexStyle">
      <ShortcutBar v-model="currentTab" />

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Common ground'"
        class="tabComponent"
      >
        <ConsensusTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="consensusItemList"
          :compact-mode="currentTab === 'Summary'"
          :clusters="clusters"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
        class="tabComponent"
      >
        <DivisiveTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="divisiveItemList"
          :compact-mode="currentTab === 'Summary'"
          :clusters="clusters"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Groups'"
        class="tabComponent"
      >
        <OpinionGroupTab
          :conversation-slug-id="props.conversationSlugId"
          :clusters="clusters"
          :total-participant-count="props.participantCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OpinionItem, PolisClusters } from "src/shared/types/zod";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisiveTab from "./divisivenessTab/DivisiveTab.vue";
import { ref, onMounted } from "vue";
import { useBackendCommentApi } from "src/utils/api/comment";

const props = defineProps<{
  participantCount: number;
  conversationSlugId: string;
}>();

const isLoading = ref<boolean>(true);

const { fetchAnalysisData } = useBackendCommentApi();

const currentTab = ref<ShortcutItem>("Summary");

const consensusItemList = ref<OpinionItem[]>([]);
const divisiveItemList = ref<OpinionItem[]>([]);
const clusters = ref<Partial<PolisClusters>>({});

async function loadItemLists({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): Promise<void> {
  isLoading.value = true;
  const { consensus, controversial, polisClusters } = await fetchAnalysisData({
    conversationSlugId,
  });

  consensusItemList.value = consensus;
  divisiveItemList.value = controversial;
  clusters.value = polisClusters;
}

onMounted(async () => {
  await loadItemLists({ conversationSlugId: props.conversationSlugId });
  isLoading.value = false;
});
</script>

<style lang="scss" scoped>
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
  margin-bottom: 10rem;
  color: #333238;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tabComponent {
  border-radius: 12px;
  padding: 0.5rem;
}

.analysisLoading {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}
</style>
