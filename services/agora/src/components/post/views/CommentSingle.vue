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
          :username="commentItem.username"
          :show-verified-text="false"
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
            @change-vote="(vote: VotingAction) => changeVote(vote)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentActionBar from "./CommentActionBar.vue";
import type { OpinionItem, PolisKey, VotingAction } from "src/shared/types/zod";
import CommentModeration from "./CommentModeration.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import { formatClusterLabel } from "src/utils/component/opinion";
import { calculatePercentage } from "src/utils/common";
import UserIdentity from "./UserIdentity.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import UserHtmlBody from "./UserHtmlBody.vue";

const emit = defineEmits(["deleted", "mutedComment", "changeVote"]);

const props = defineProps<{
  selectedClusterKey: PolisKey | undefined;
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
  participantCount: number;
}>();

const reasonLabel = calculateReasonLabel();

function changeVote(vote: VotingAction) {
  emit("changeVote", vote, props.commentItem.opinionSlugId);
}

function calculateTotalReasonLabel() {
  const totalPercentageAgrees = calculatePercentage(
    props.commentItem.numAgrees,
    props.participantCount
  );
  const totalPercentageDisagrees = calculatePercentage(
    props.commentItem.numDisagrees,
    props.participantCount
  );
  if (totalPercentageAgrees > 50 || totalPercentageDisagrees > 50) {
    return "Majority (Total)";
  }
  if (
    totalPercentageDisagrees + totalPercentageAgrees > 50 &&
    Math.abs(totalPercentageAgrees - totalPercentageDisagrees) < 50
  ) {
    return "Debated (Total)";
  }
}

function calculateClusterReasonLabel() {
  if (props.commentItem.clustersStats.length >= 2) {
    if (props.selectedClusterKey !== undefined) {
      const clusterStat =
        props.commentItem.clustersStats[props.selectedClusterKey];
      const selectedClusterPercentageAgrees = calculatePercentage(
        clusterStat.numAgrees,
        clusterStat.numUsers
      );
      const selectedClusterPercentageDisagrees = calculatePercentage(
        clusterStat.numDisagrees,
        clusterStat.numUsers
      );
      const labelCluster =
        clusterStat.aiLabel ??
        formatClusterLabel(clusterStat.key, clusterStat.aiLabel);
      if (
        selectedClusterPercentageAgrees > 50 ||
        selectedClusterPercentageDisagrees > 50
      ) {
        return `Majority (Group ${labelCluster})`;
      }
      if (
        selectedClusterPercentageDisagrees + selectedClusterPercentageAgrees >
          50 &&
        Math.abs(
          selectedClusterPercentageAgrees - selectedClusterPercentageDisagrees
        ) < 50
      ) {
        return `Debated (Group ${labelCluster})`;
      }
    }
    for (const clusterStat of props.commentItem.clustersStats) {
      if (clusterStat.key === props.selectedClusterKey) {
        // already done
        continue;
      }
      const clusterPercentageAgrees = calculatePercentage(
        clusterStat.numAgrees,
        clusterStat.numUsers
      );
      const clusterPercentageDisagrees = calculatePercentage(
        clusterStat.numDisagrees,
        clusterStat.numUsers
      );
      const labelCluster =
        clusterStat.aiLabel ??
        formatClusterLabel(clusterStat.key, clusterStat.aiLabel);
      if (clusterPercentageAgrees > 50 || clusterPercentageDisagrees > 50) {
        return `Majority (Group ${labelCluster})`;
      }
      if (
        clusterPercentageDisagrees + clusterPercentageAgrees > 50 &&
        Math.abs(clusterPercentageAgrees - clusterPercentageDisagrees) < 50
      ) {
        return `Debated (Group ${labelCluster})`;
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
