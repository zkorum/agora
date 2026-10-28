<template>
  <OpinionList
    ref="listRef"
    :post-slug-id="postSlugId"
    :conversation-author-username="conversationAuthorUsername"
    :conversation-organization-name="conversationOrganizationName"
    :on-view-analysis="onViewAnalysis"
    :is-voting-disabled="isVotingDisabled"
    :conversation-route-context="conversationRouteContext"
    :opinion-state="opinionState"
    :editing-opinion="editingOpinion"
    @edit-opinion="emit('editOpinion', $event)"
    @deleted="emit('deleted')"
  />
</template>

<script setup lang="ts">
import type { OpinionEditRequest } from "src/composables/opinion/types";
import { useOpinionListState } from "src/composables/opinion/useOpinionListState";
import type {
  ConversationTypeConfig,
  DisplayedOpinionItem,
} from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { computed, ref } from "vue";

import OpinionList from "./OpinionList.vue";

const props = defineProps<{
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
  conversationTypeConfig: ConversationTypeConfig;
  editingOpinion: DisplayedOpinionItem | undefined;
}>();
const emit = defineEmits<{
  deleted: [];
  editOpinion: [request: OpinionEditRequest];
}>();
const listRef = ref<InstanceType<typeof OpinionList>>();
const opinionState = useOpinionListState({
  conversationSlugId: () => props.postSlugId,
  metadata: () => props.conversationTypeConfig,
  routeContext: () => props.conversationRouteContext,
});

defineExpose({
  openModerationHistory: () => opinionState.selectFilter("moderated"),
  highlightOpinion: opinionState.highlightOpinion,
  refreshData: async () => {
    await listRef.value?.refreshData();
  },
  isLoading: computed(() => listRef.value?.isLoading ?? false),
});
</script>
