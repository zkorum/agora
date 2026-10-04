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
              :participation-mode="props.participationMode"
              :requires-event-ticket="props.requiresEventTicket"
              :survey-gate="props.surveyGate"
              :on-view-analysis="props.onViewAnalysis"
              :is-voting-disabled="props.isVotingDisabled"
              :show-vote-results="true"
              :conversation-route-context="props.conversationRouteContext"
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
import { storeToRefs } from "pinia";
import NewContentPill from "src/components/feed/NewContentPill.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useOpinionPagination } from "src/composables/opinion/useOpinionPagination";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { useTargetOpinion } from "src/composables/opinion/useTargetOpinion";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  EventSlug,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import { useUserStore } from "src/stores/user";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import {
  useInvalidateCommentQueries,
  usePagedCommentsQuery,
} from "src/utils/api/comment/useCommentQueries";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";

import {
  type CommentSectionTranslations,
  commentSectionTranslations,
} from "./CommentSection.i18n";
import CommentGroup from "./group/CommentGroup.vue";

const props = defineProps<{
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  surveyGate: SurveyGateSummary | undefined;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
  filter: CommentFilterOptions;
}>();

const emit = defineEmits<{
  deleted: [];
  participantCountDelta: [delta: number];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

const isComponentMounted = ref(false);
const isCommentTabActive = ref(true);
const isInitialActivation = ref(true);
const currentFilter = ref<CommentFilterOptions>(props.filter);
const showNewStatementsPill = ref(false);
let isCheckingForNewStatements = false;

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

const { profileData } = storeToRefs(useUserStore());
const { showNotifyMessage } = useNotify();
const opinionUpdatesStore = useOpinionUpdatesStore();
const queryClient = useQueryClient();
const { fetchOpinionPage } = useBackendCommentApi();
const scrollToActionBar = inject<
  ({ behavior }: { behavior?: ScrollBehavior }) => void
>("scrollToActionBar", () => {
  /* noop */
});

// Get invalidation utilities
const { invalidateAll } = useInvalidateCommentQueries();

const activeQuery = usePagedCommentsQuery({
  conversationSlugId: () => props.postSlugId,
  filter: currentFilter,
});
const currentOpinionData = computed(() => {
  const items =
    activeQuery.data.value?.pages.flatMap((page) => page.items) ?? [];
  return [...new Map(items.map((item) => [item.opinionSlugId, item])).values()];
});
const customIsEmpty = computed(() => currentOpinionData.value.length === 0);
const listQueryState = {
  isPending: activeQuery.isPending,
  isError: computed(() => activeQuery.isError.value && customIsEmpty.value),
  error: activeQuery.error,
  isRefetching: activeQuery.isRefetching,
  data: activeQuery.data,
  refetch: () => activeQuery.refetch(),
};

watch(
  () => props.filter,
  (filter) => {
    currentFilter.value = filter;
  }
);

function handleUserFilterChange(filter: CommentFilterOptions): void {
  currentFilter.value = filter;
  showNewStatementsPill.value = false;
}

function handleRetryLoadComments(): void {
  void activeQuery.refetch();
}

const refreshData = async (): Promise<void> => {
  await invalidateAll(props.postSlugId);
  await fetchUserVotingData();
};

const {
  targetOpinion,
  setupHighlightFromRoute,
  clearRouteQueryParameters,
  highlightOpinion,
} = useTargetOpinion({
  onModeratedOpinionDetected: (opinion) => {
    if (opinion.moderation.status !== "moderated") {
      return;
    }
    if (opinion.moderation.action === "move") {
      currentFilter.value = "moderated";
    } else if (opinion.moderation.action === "hide") {
      if (profileData.value.isSiteModerator) {
        currentFilter.value = "hidden";
      } else {
        showNotifyMessage(t("statementRemovedByModerator"));
        targetOpinion.value = null;
      }
    }
  },
});

const {
  visibleOpinions,
  hasMore: hasMoreLocally,
  onLoad: revealMore,
  triggerLoadMore,
} = useOpinionPagination({
  currentOpinionData,
  currentFilter,
  isComponentMounted,
  targetOpinion,
});
const hasMore = computed(
  () => hasMoreLocally.value || activeQuery.hasNextPage.value
);

async function onLoad(index: number, done: () => void): Promise<void> {
  if (hasMoreLocally.value) {
    revealMore(index, done);
    return;
  }
  try {
    if (activeQuery.hasNextPage.value && !activeQuery.isFetching.value) {
      const result = await activeQuery.fetchNextPage();
      if (!result.isError) triggerLoadMore();
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
  hidden: "emptyHidden",
};

const isCommentListEmpty = computed(
  () => customIsEmpty.value && targetOpinion.value === null
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

// AsyncStateHandler configuration
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

onMounted(async (): Promise<void> => {
  await setupHighlightFromRoute();
  await clearRouteQueryParameters();
  isComponentMounted.value = true;
});

onActivated(async (): Promise<void> => {
  isCommentTabActive.value = true;
  showNewStatementsPill.value = false;
  if (isInitialActivation.value) {
    isInitialActivation.value = false;
    return;
  }
  await setupHighlightFromRoute();
  await clearRouteQueryParameters();
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
      // Reset component state for new conversation
      isComponentMounted.value = false;
      await fetchUserVotingData();
      await setupHighlightFromRoute();
      await clearRouteQueryParameters();
      isComponentMounted.value = true;
    }
  }
);

function openModerationHistory(): void {
  currentFilter.value = "moderated";
}

async function handleOpinionMuted(): Promise<void> {
  await refreshData();
}

function handleOpinionDeleted(opinionSlugId: string): void {
  // If the deleted opinion is the currently highlighted one, clear it
  if (targetOpinion.value?.opinionSlugId === opinionSlugId) {
    targetOpinion.value = null;
  }
  emit("deleted");
}

defineExpose({
  openModerationHistory,
  highlightOpinion,
  triggerLoadMore,
  handleRetryLoadComments,
  refreshData,
  refetchActiveQuery: () => activeQuery.refetch(),
  targetOpinion,
  currentFilter,
  handleUserFilterChange,
  isLoading: computed(() => activeQuery.isPending.value && customIsEmpty.value),
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  padding-bottom: 5rem;
}
</style>
