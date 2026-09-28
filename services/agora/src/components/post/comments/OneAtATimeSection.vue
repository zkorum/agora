<template>
  <div class="one-at-a-time">
    <div
      v-if="currentOpinion !== undefined"
      class="remaining"
      aria-live="polite"
    >
      {{ t("remaining", { count: remainingCount.toString() }) }}
    </div>

    <CommentGroup
      v-if="currentOpinion !== undefined"
      :comment-item-list="[currentOpinion]"
      :post-slug-id="props.postSlugId"
      :conversation-author-username="props.conversationAuthorUsername"
      :conversation-organization-name="props.conversationOrganizationName"
      :highlighted-opinion="null"
      :voting-utilities="{ userVotes, castVote }"
      :participation-mode="props.participationMode"
      :requires-event-ticket="props.requiresEventTicket"
      :survey-gate="props.surveyGate"
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="props.isVotingDisabled || isSubmittingVote"
      :conversation-route-context="props.conversationRouteContext"
      @muted-comment="refresh"
      @deleted="refresh"
    />

    <PageLoadingSpinner v-else-if="query.isPending.value || isAdvancing" />
    <ErrorRetryBlock
      v-else-if="query.isError.value"
      :title="t('loadError')"
      :retry-label="t('retry')"
      @retry="refresh"
    />
    <div v-else class="caught-up" role="status">
      <q-icon name="mdi-check-circle-outline" size="2rem" color="primary" />
      <strong class="text-primary">{{ t("caughtUp") }}</strong>
      <span>{{ t("caughtUpDescription") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  DisplayedOpinionItem,
  EventSlug,
  ParticipationMode,
  SurveyGateSummary,
  VotingAction,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import {
  computed,
  onActivated,
  onDeactivated,
  onUnmounted,
  ref,
  watch,
} from "vue";

import CommentGroup from "./group/CommentGroup.vue";
import {
  type OneAtATimeTranslations,
  oneAtATimeTranslations,
} from "./OneAtATimeSection.i18n";

const props = defineProps<{
  postSlugId: string;
  order: "discover" | "new";
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  participationMode: ParticipationMode;
  requiresEventTicket: EventSlug | undefined;
  surveyGate: SurveyGateSummary | undefined;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
}>();

const { t } = useComponentI18n<OneAtATimeTranslations>(oneAtATimeTranslations);
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
const { userId } = storeToRefs(useAuthenticationStore());
const opinionUpdates = useOpinionUpdatesStore();
const { fetchNextUnansweredOpinion } = useBackendCommentApi();
const excludedOpinionSlugIds = ref<string[]>([]);
const currentOpinion = ref<DisplayedOpinionItem>();
const isAdvancing = ref(false);
const isSubmittingVote = ref(false);
let liveRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let preserveCurrentCard = false;
const query = useQuery({
  queryKey: [
    "nextUnansweredOpinion",
    computed(() => props.postSlugId),
    computed(() => props.order),
    userId,
    displayLanguage,
    spokenLanguages,
    excludedOpinionSlugIds,
  ],
  queryFn: () =>
    fetchNextUnansweredOpinion({
      conversationSlugId: props.postSlugId,
      order: props.order,
      excludedOpinionSlugIds: excludedOpinionSlugIds.value,
    }),
  staleTime: 0,
  retry: false,
});
const remainingCount = computed(() =>
  currentOpinion.value === undefined
    ? (query.data.value?.remainingCount ?? 0)
    : Math.max(query.data.value?.remainingCount ?? 1, 1)
);
const {
  userVotes,
  castVote: submitVote,
  fetchUserVotingData,
} = useOpinionVoting({
  postSlugId: props.postSlugId,
  visibleOpinions: computed(() =>
    currentOpinion.value === undefined ? [] : [currentOpinion.value]
  ),
});

watch(
  () => query.data.value,
  (data) => {
    if (data?.status === "ready") {
      if (!preserveCurrentCard || currentOpinion.value === undefined) {
        currentOpinion.value = data.opinion;
      }
    } else if (data?.status === "caught_up" && !preserveCurrentCard) {
      currentOpinion.value = undefined;
    }
    isAdvancing.value = false;
  },
  { immediate: true }
);
watch(
  () => query.isError.value,
  (isError) => {
    if (isError) isAdvancing.value = false;
  }
);

watch(
  userId,
  () => {
    excludedOpinionSlugIds.value = [];
    currentOpinion.value = undefined;
    preserveCurrentCard = false;
  },
  { flush: "sync" }
);

watch(
  () => opinionUpdates.getNewOpinionSignalVersion(props.postSlugId),
  (version, previousVersion) => {
    if (version === previousVersion) return;
    preserveCurrentCard = true;
    void query.refetch();
    if (liveRefreshTimer !== undefined) clearTimeout(liveRefreshTimer);
    liveRefreshTimer = setTimeout(() => {
      liveRefreshTimer = undefined;
      void query.refetch();
    }, 1200);
  }
);

async function castVote(opinionSlugId: string, voteAction: VotingAction) {
  isSubmittingVote.value = true;
  try {
    const response = await submitVote(opinionSlugId, voteAction);
    if (response.success && voteAction !== "cancel") {
      preserveCurrentCard = false;
      isAdvancing.value = true;
      currentOpinion.value = undefined;
      excludedOpinionSlugIds.value = [
        ...excludedOpinionSlugIds.value.slice(-98),
        opinionSlugId,
      ];
    }
    return response;
  } finally {
    isSubmittingVote.value = false;
  }
}

async function refresh(): Promise<void> {
  preserveCurrentCard = false;
  await query.refetch();
  await fetchUserVotingData();
}

async function acknowledgeCreatedOpinion(opinionSlugId: string): Promise<void> {
  excludedOpinionSlugIds.value = [
    ...excludedOpinionSlugIds.value.slice(-98),
    opinionSlugId,
  ];
  if (currentOpinion.value?.opinionSlugId === opinionSlugId) {
    currentOpinion.value = undefined;
  }
  await refresh();
}

onActivated(() => {
  void refresh();
});
onDeactivated(() => {
  if (liveRefreshTimer !== undefined) clearTimeout(liveRefreshTimer);
});
onUnmounted(() => {
  if (liveRefreshTimer !== undefined) clearTimeout(liveRefreshTimer);
});

defineExpose({
  refresh,
  acknowledgeCreatedOpinion,
  isLoading: computed(() => query.isPending.value || isAdvancing.value),
});
</script>

<style scoped lang="scss">
.one-at-a-time {
  min-height: 13rem;
  padding-block: 0.75rem 5rem;
}
.remaining {
  text-align: center;
  color: $color-text-weak;
  margin-block-end: 0.75rem;
}
.caught-up {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  background: white;
  border-radius: 1rem;
  color: $color-text-weak;
}
</style>
