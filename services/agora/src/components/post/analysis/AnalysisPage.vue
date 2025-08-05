<template>
  <div v-if="isLoading" class="analysisLoading">
    <q-spinner-gears size="50px" color="primary" />
  </div>
  <div v-if="!isLoading">
    <div class="container flexStyle">
      <ShortcutBar v-model="currentTab" />

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Me'"
        class="tabComponent"
      >
        <MeTab
          v-model="currentTab"
          :cluster-key="userCluster?.key"
          :ai-label="userCluster?.aiLabel"
          :ai-summary="userCluster?.aiSummary"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Common ground'"
        class="tabComponent"
      >
        <ConsensusTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="consensusItemList"
          :compact-mode="currentTab === 'Summary'"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Majority'"
        class="tabComponent"
      >
        <MajorityTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="majorityItemList"
          :compact-mode="currentTab === 'Summary'"
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
        />
      </div>

      <div
        v-if="
          currentTab === 'Summary' ||
          currentTab === 'Groups' ||
          currentTab === 'Me'
        "
        class="tabComponent"
      >
        <OpinionGroupTab
          :conversation-slug-id="props.conversationSlugId"
          :item-list-per-cluster-key="representativeItemListPerClusterKey"
          :polis="props.polis"
          :total-participant-count="props.participantCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ClusterMetadata,
  ExtendedConversationPolis,
  OpinionItem,
  PolisKey,
} from "src/shared/types/zod";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import MajorityTab from "./majorityTab/MajorityTab.vue";
import DivisiveTab from "./divisivenessTab/DivisiveTab.vue";
import { ref, onMounted } from "vue";
import MeTab from "./meTab/MeTab.vue";
import { useBackendCommentApi } from "src/utils/api/comment";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
  conversationSlugId: string;
}>();

const isLoading = ref<boolean>(true);

const {
  fetchConsensusItemList,
  fetchMajorityItemList,
  fetchControversialItemList,
  fetchAllRepresentativeItemLists,
} = useBackendCommentApi();

const currentTab = ref<ShortcutItem>("Summary");

const consensusItemList = ref<OpinionItem[]>([]);
const majorityItemList = ref<OpinionItem[]>([]);
const divisiveItemList = ref<OpinionItem[]>([]);
const representativeItemListPerClusterKey = ref<
  Partial<Record<PolisKey, OpinionItem[]>>
>({});

async function loadItemLists({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): Promise<void> {
  isLoading.value = true;
  consensusItemList.value = await fetchConsensusItemList({
    conversationSlugId,
  });
  majorityItemList.value = await fetchMajorityItemList({ conversationSlugId });
  divisiveItemList.value = await fetchControversialItemList({
    conversationSlugId,
  });
  representativeItemListPerClusterKey.value =
    await fetchAllRepresentativeItemLists({
      conversationSlugId,
    });
}

const userCluster: ClusterMetadata | undefined = props.polis.clusters.find(
  (c) => c.isUserInCluster
);

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
