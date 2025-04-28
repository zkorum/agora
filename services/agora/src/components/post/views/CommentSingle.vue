<template>
  <div>
    <div class="container">
      <div class="pushReasonPosition">
        <ZKCard padding="0rem" class="labelBackground">
          <div
            v-if="reasonLabel !== undefined"
            class="pushReasonStyle pushReasonFlex"
          >
            {{ reasonLabel }}
          </div>
        </ZKCard>
      </div>

      <div class="topBar">
        <!-- TODO: Pass author verified flag here -->
        <UserIdentity
          :author-verified="false"
          :created-at="commentItem.createdAt"
          :user-identity="commentItem.username"
          :show-verified-text="false"
          :organization-image-url="''"
        />

        <CommentActionOptions
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />
      </div>

      <div>
        <UserHtmlBody :html-body="commentItem.opinion" :compact-mode="false" />
      </div>

      <div class="commentAdditionalDetailsFlex">
        <CommentModeration
          v-if="commentItem.moderation?.status == 'moderated'"
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
        />

        <div>
          <CommentActionBar
            :selected-cluster-key="selectedClusterKey"
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :participant-count="participantCount"
            :is-post-locked="isPostLocked"
            :login-required-to-participate="loginRequiredToParticipate"
            @change-vote="(vote: VotingAction) => changeVote(vote)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentActionBar from "./CommentActionBar.vue";
import type {
  ClusterStats,
  OpinionItem,
  PolisKey,
  VotingAction,
} from "src/shared/types/zod";
import CommentModeration from "./CommentModeration.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import { formatClusterLabel } from "src/utils/component/opinion";
import UserIdentity from "./UserIdentity.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import UserHtmlBody from "./UserHtmlBody.vue";
import { computed } from "vue";
import { isControversial, isMajority } from "src/shared/conversationLogic";

const emit = defineEmits(["deleted", "mutedComment", "changeVote"]);

const props = defineProps<{
  selectedClusterKey: PolisKey | undefined;
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
  participantCount: number;
  loginRequiredToParticipate: boolean;
}>();

const reasonLabel = computed(() => calculateReasonLabel()); // enable changing immediately the props without waiting for re-render

function changeVote(vote: VotingAction) {
  emit("changeVote", vote, props.commentItem.opinionSlugId);
}

function calculateTotalReasonLabel() {
  if (
    isControversial({
      numAgrees: props.commentItem.numAgrees,
      numDisagrees: props.commentItem.numDisagrees,
      memberCount: props.participantCount,
    })
  ) {
    return "Debated (Total)";
  }
  if (
    isMajority({
      numAgrees: props.commentItem.numAgrees,
      numDisagrees: props.commentItem.numDisagrees,
      memberCount: props.participantCount,
    })
  ) {
    return "Majority (Total)";
  }
}

function doCalculateClusterReasonLabel(
  clusterStats: ClusterStats
): string | undefined {
  const labelCluster =
    clusterStats.aiLabel ??
    formatClusterLabel(clusterStats.key, true, clusterStats.aiLabel);
  if (
    isControversial({
      numAgrees: clusterStats.numAgrees,
      numDisagrees: clusterStats.numDisagrees,
      memberCount: clusterStats.numUsers,
    })
  ) {
    return `Debated (${labelCluster})`;
  }
  if (
    isMajority({
      numAgrees: clusterStats.numAgrees,
      numDisagrees: clusterStats.numDisagrees,
      memberCount: clusterStats.numUsers,
    })
  ) {
    return `Majority (${labelCluster})`;
  }
}

function calculateClusterReasonLabel(): string | undefined {
  if (props.commentItem.clustersStats.length >= 2) {
    if (
      props.selectedClusterKey !== undefined &&
      props.selectedClusterKey in props.commentItem.clustersStats
    ) {
      const clusterStats =
        props.commentItem.clustersStats[props.selectedClusterKey];
      const reasonLabel = doCalculateClusterReasonLabel(clusterStats);
      if (reasonLabel !== undefined) {
        return reasonLabel;
      }
    }
    for (const clusterStats of props.commentItem.clustersStats) {
      if (clusterStats.key === props.selectedClusterKey) {
        // already done
        continue;
      }
      const reasonLabel = doCalculateClusterReasonLabel(clusterStats);
      if (reasonLabel !== undefined) {
        return reasonLabel;
      }
    }
  }
}

function calculateReasonLabel() {
  const totalReasonLabel = calculateTotalReasonLabel();
  const clusterReasonLabel = calculateClusterReasonLabel();
  if (props.selectedClusterKey !== undefined) {
    return clusterReasonLabel ?? totalReasonLabel;
  } else {
    return totalReasonLabel ?? clusterReasonLabel;
  }
}

function deletedComment() {
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: $container-padding;
}

.pushReasonFlex {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.labelBackground {
  background-color: #f6f5f8;
}

.pushReasonStyle {
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 1rem;
  padding-right: 1rem;
  color: #48545a;
}

.pushReasonPosition {
  position: absolute;
  top: -2.5rem;
  right: -0.2rem;
}

.contentLayout {
  display: flex;
  flex-direction: column;
  justify-content: left;
  gap: 1rem;
}

.avatarIcon {
  margin-right: 0.5rem;
}

.topBar {
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
}

.topRightBar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.commentAdditionalDetailsFlex {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
