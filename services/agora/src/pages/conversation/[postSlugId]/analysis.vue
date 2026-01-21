<template>
  <div>
    <AnalysisPage
      ref="analysisPageRef"
      :conversation-slug-id="conversationData.metadata.conversationSlugId"
      :participant-count="conversationData.metadata.participantCount"
      :analysis-query="analysisQuery"
    />
  </div>
</template>

<script setup lang="ts">
import AnalysisPage from "src/components/post/analysis/AnalysisPage.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { computed, inject, onMounted, ref, watch } from "vue";

// Props from parent
const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
}>();

// Inject parent function to report loading state
const setCurrentTabLoading = inject<(loading: boolean) => void>(
  "setCurrentTabLoading",
  () => {
    /* noop */
  }
);

const analysisPageRef = ref<InstanceType<typeof AnalysisPage>>();

// Create computed properties to ensure reactivity
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const voteCount = computed(() => props.conversationData.metadata.voteCount);

// Load analysis data
const analysisQuery = useAnalysisQuery({
  conversationSlugId,
  voteCount,
  enabled: () => props.hasConversationData,
});

// Report loading state to parent (for spinner in PostActionBar)
const isLoading = computed(
  () => analysisQuery.isPending.value || analysisQuery.isRefetching.value
);

watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

onMounted(() => {
  // Report initial loading state to parent
  setCurrentTabLoading(isLoading.value);
});
</script>

<style scoped lang="scss"></style>
