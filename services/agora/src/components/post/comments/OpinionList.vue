<template>
  <div>
    <q-infinite-scroll :offset="2000" :disable="!hasMore" @load="onLoad">
      <div>
        <div class="container">
          <AsyncStateHandler
            :query="listQueryState"
            :is-empty="isCommentListEmpty"
            :config="asyncStateConfig"
          >
            <CommentGroup
              :comment-item-list="visibleOpinions"
              :post-slug-id="postSlugId"
              :conversation-author-username="conversationAuthorUsername"
              :conversation-organization-name="conversationOrganizationName"
              :highlighted-opinion="targetOpinion"
              :voting-utilities="{
                userVotes,
                castVote,
              }"
              :on-view-analysis="props.onViewAnalysis"
              :is-voting-disabled="props.isVotingDisabled"
              :show-vote-results="true"
              :conversation-route-context="props.conversationRouteContext"
              :editing-opinion-slug-id="editingOpinion?.opinionSlugId"
              @edit-opinion="emit('editOpinion', $event)"
              @deleted="(opinionSlugId) => handleOpinionDeleted(opinionSlugId)"
              @muted-comment="handleOpinionMuted()"
            />
          </AsyncStateHandler>
        </div>
      </div>
    </q-infinite-scroll>

    <NewContentPill
      v-if="showNewStatementsPill && !activeQuery.isPending.value"
      :label="t('newStatementButton')"
      dismissible
      @click="showNewStatements"
      @dismiss="showNewStatementsPill = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import NewContentPill from "src/components/feed/NewContentPill.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import type { OpinionEditRequest } from "src/composables/opinion/types";
import type { OpinionListState } from "src/composables/opinion/useOpinionListState";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useComputedPagination } from "src/composables/ui/useComputedPagination";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import { usePagedCommentsQuery } from "src/utils/api/comment/usePagedCommentsQuery";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { computed, inject, onActivated, onDeactivated, ref, watch } from "vue";

import {
  type CommentSectionTranslations,
  commentSectionTranslations,
} from "./CommentSection.i18n";
import CommentGroup from "./group/CommentGroup.vue";

const props = defineProps<{
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
  opinionState: OpinionListState;
  editingOpinion: DisplayedOpinionItem | undefined;
}>();

const emit = defineEmits<{
  deleted: [];
  editOpinion: [request: OpinionEditRequest];
}>();

const isCommentTabActive = ref(true);
const showNewStatementsPill = ref(false);
let isCheckingForNewStatements = false;

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

const opinionUpdatesStore = useOpinionUpdatesStore();
const queryClient = useQueryClient();
const { fetchOpinionPage } = useBackendCommentApi();
const scrollToActionBar = inject<
  ({ behavior }: { behavior?: ScrollBehavior }) => void
>("scrollToActionBar", () => {
  /* noop */
});

const { invalidateAll } = useInvalidateCommentQueries();

const {
  targetOpinion,
  highlightState,
  isResolvingLink,
  clearHighlight,
  highlightOpinion,
  captureHighlight,
  filter: currentFilter,
} = props.opinionState;

const activeQuery = usePagedCommentsQuery({
  conversationSlugId: () => props.postSlugId,
  filter: currentFilter,
  enabled: () => isCommentTabActive.value && !isResolvingLink.value,
});
const currentOpinionData = computed(() => {
  const items =
    activeQuery.data.value?.pages.flatMap((page) => page.items) ?? [];
  return [...new Map(items.map((item) => [item.opinionSlugId, item])).values()];
});
const customIsEmpty = computed(() => currentOpinionData.value.length === 0);
const listQueryState = {
  isPending: computed(
    () => isResolvingLink.value || activeQuery.isPending.value
  ),
  isError: computed(() => activeQuery.isError.value && customIsEmpty.value),
  error: activeQuery.error,
  isRefetching: activeQuery.isRefetching,
  data: activeQuery.data,
  refetch: () => activeQuery.refetch(),
};

const refreshData = async (): Promise<void> => {
  await invalidateAll(props.postSlugId);
  await fetchUserVotingData();
};

const {
  visibleItems: visibleOpinions,
  hasMore: hasMoreLocally,
  loadMore,
  resetPagination,
} = useComputedPagination(currentOpinionData);
watch(currentFilter, () => {
  resetPagination();
  showNewStatementsPill.value = false;
});

let restorePreviousHighlight = () => {};
watch(
  () => props.editingOpinion,
  (opinion, previous) => {
    const current = highlightState.value;
    if (opinion !== undefined) {
      if (previous === undefined) restorePreviousHighlight = captureHighlight();
      highlightOpinion(opinion);
    } else if (
      previous !== undefined &&
      current.kind !== "none" &&
      current.opinion.displayContent.sourceVersion ===
        previous.displayContent.sourceVersion
    ) {
      restorePreviousHighlight();
    }
  },
  { immediate: true }
);
const hasMore = computed(
  () => hasMoreLocally.value || activeQuery.hasNextPage.value
);

async function onLoad(_index: number, done: () => void): Promise<void> {
  try {
    if (hasMoreLocally.value) {
      loadMore();
      return;
    }
    if (activeQuery.hasNextPage.value && !activeQuery.isFetching.value) {
      const result = await activeQuery.fetchNextPage();
      if (!result.isError) loadMore();
    }
  } finally {
    done();
  }
}

const { userVotes, castVote, fetchUserVotingData } = useOpinionVoting({
  postSlugId: props.postSlugId,
});

const emptyTextByFilter: Record<
  CommentFilterOptions,
  keyof CommentSectionTranslations
> = {
  discover: "emptyDiscover",
  new: "emptyNew",
  moderated: "emptyModerated",
  my_votes: "emptyMyVotes",
  my_statements: "emptyMyStatements",
  hidden: "emptyHidden",
};

const isCommentListEmpty = computed(
  () => customIsEmpty.value && highlightState.value.kind === "none"
);

const newOpinionSignalVersion = computed(() =>
  opinionUpdatesStore.getNewOpinionSignalVersion(props.postSlugId)
);

let lastCheckedSignalVersion = newOpinionSignalVersion.value;
watch(
  [
    newOpinionSignalVersion,
    activeQuery.data,
    currentFilter,
    isCommentTabActive,
  ],
  ([version, data]) => {
    if (
      version === lastCheckedSignalVersion ||
      !isCommentTabActive.value ||
      (currentFilter.value !== "discover" && currentFilter.value !== "new") ||
      data === undefined ||
      isCheckingForNewStatements
    ) {
      return;
    }
    void checkForNewStatements();
  }
);

async function checkForNewStatements(): Promise<void> {
  isCheckingForNewStatements = true;
  const conversationSlugId = props.postSlugId;
  const filter = currentFilter.value;
  const previewVersion = newOpinionSignalVersion.value;
  try {
    const preview = await fetchOpinionPage({
      conversationSlugId,
      filter,
      cursor: null,
    });
    if (
      conversationSlugId !== props.postSlugId ||
      filter !== currentFilter.value ||
      !isCommentTabActive.value
    )
      return;
    lastCheckedSignalVersion = previewVersion;
    const visibleIds = new Set(
      currentOpinionData.value.map((item) => item.opinionSlugId)
    );
    showNewStatementsPill.value = preview.items.some(
      (item) => !visibleIds.has(item.opinionSlugId)
    );
  } catch {
    return;
  } finally {
    isCheckingForNewStatements = false;
    if (
      isCommentTabActive.value &&
      conversationSlugId === props.postSlugId &&
      (currentFilter.value === "discover" || currentFilter.value === "new") &&
      newOpinionSignalVersion.value !== previewVersion
    ) {
      void checkForNewStatements();
    }
  }
}

async function showNewStatements(): Promise<void> {
  showNewStatementsPill.value = false;
  scrollToActionBar({ behavior: "smooth" });
  await queryClient.resetQueries({
    queryKey: ["comments", props.postSlugId, currentFilter.value],
  });
  await fetchUserVotingData();
}

const asyncStateConfig = computed(() => ({
  loading: {
    text: t("loadingOpinions"),
  },
  retrying: {
    text: t("retrying"),
  },
  error: {
    title: t("failedToLoadOpinions"),
    retryButtonText: t("retryLoadingOpinions"),
    showRetryButton: true,
  },
  empty: {
    text: t(emptyTextByFilter[currentFilter.value]),
    icon: "forum",
    iconColor: "grey-5",
  },
}));

onActivated((): void => {
  isCommentTabActive.value = true;
  showNewStatementsPill.value = false;
});

onDeactivated((): void => {
  isCommentTabActive.value = false;
});

// Watch for postSlugId changes to refetch user votes when navigating between conversations
watch(
  () => props.postSlugId,
  async (newSlugId, oldSlugId) => {
    if (newSlugId && newSlugId !== oldSlugId) {
      lastCheckedSignalVersion = newOpinionSignalVersion.value;
      showNewStatementsPill.value = false;
      resetPagination();
      await fetchUserVotingData();
    }
  }
);

async function handleOpinionMuted(): Promise<void> {
  await refreshData();
}

function handleOpinionDeleted(opinionSlugId: string): void {
  // If the deleted opinion is the currently highlighted one, clear it
  const current = highlightState.value;
  if (
    current.kind !== "none" &&
    current.opinion.opinionSlugId === opinionSlugId
  ) {
    clearHighlight();
  }
  emit("deleted");
}

defineExpose({
  highlightOpinion,
  refreshData,
  refetchActiveQuery: () => activeQuery.refetch(),
  isLoading: computed(
    () =>
      isResolvingLink.value ||
      (activeQuery.isPending.value && customIsEmpty.value)
  ),
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
}
</style>
