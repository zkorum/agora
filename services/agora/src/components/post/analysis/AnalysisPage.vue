<template>
  <div v-if="analysisQuery.isLoading.value" class="analysisLoading">
    <q-spinner-gears size="50px" color="primary" />
  </div>
  <div v-if="analysisQuery.hasError.value" class="analysisError">
    <div class="errorContainer">
      <q-icon name="error_outline" size="48px" color="negative" />
      <p class="errorMessage">{{ analysisQuery.errorMessage }}</p>
      <q-btn
        v-if="analysisQuery.isRetryable"
        color="primary"
        :loading="analysisQuery.isRefetching.value"
        @click="() => analysisQuery.refetch()"
      >
        Retry
      </q-btn>
    </div>
  </div>
  <div
    v-if="
      !analysisQuery.isLoading.value &&
      !analysisQuery.hasError.value &&
      analysisQuery.data.value
    "
  >
    <div class="container flexStyle">
      <ShortcutBar v-model="currentTab" />

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Common ground'"
        class="tabComponent"
      >
        <ConsensusTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="analysisQuery.data.value?.consensus || []"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
        class="tabComponent"
      >
        <DivisiveTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="analysisQuery.data.value?.controversial || []"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Groups'"
        class="tabComponent"
      >
        <OpinionGroupTab
          :conversation-slug-id="props.conversationSlugId"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
          :total-participant-count="props.participantCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisiveTab from "./divisivenessTab/DivisiveTab.vue";
import { ref } from "vue";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";

const props = defineProps<{
  participantCount: number;
  conversationSlugId: string;
}>();

const currentTab = ref<ShortcutItem>("Summary");

const analysisQuery = useAnalysisQuery({
  conversationSlugId: props.conversationSlugId,
  enabled: true,
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

.analysisError {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}

.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.errorMessage {
  font-size: 1rem;
  color: #dc2626;
  margin: 0;
  font-weight: var(--font-weight-semibold);
}
</style>
