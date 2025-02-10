<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div class="container">
      <!-- TODO: Add push reason label -->
      <div
        v-if="reasonLabel !== undefined"
        class="pushReasonPosition pushReasonStyle pushReasonFlex"
      >
        {{ reasonLabel }}
      </div>

      <div class="topBar">
        <div class="metadata">
          <UserAvatar
            :user-name="commentItem.username"
            :size="30"
            class="avatarIcon"
          />

          <div class="userNameTime">
            <div>
              {{ commentItem.username }}
            </div>
            <div>
              {{ formatTimeAgo(new Date(commentItem.createdAt)) }}
            </div>
          </div>
        </div>

        <CommentActionOptions
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />
      </div>

      <div>
        <div :class="{ highlightComment: highlight }">
          <span v-html="commentItem.opinion"></span>
        </div>

        <CommentModeration
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
        />

        <div class="actionBarPaddings">
          <CommentActionBar
            :selected-cluster-key="selectedClusterKey"
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :is-post-locked="isPostLocked"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentActionBar from "./CommentActionBar.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";
import type { OpinionItem, PolisKey } from "src/shared/types/zod";
import { ref } from "vue";
import CommentModeration from "./CommentModeration.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import { formatTimeAgo } from "@vueuse/core";
import { formatClusterLabel } from "src/utils/component/opinion";
import { calculatePercentage } from "src/utils/common";

const emit = defineEmits(["deleted", "mutedComment"]);

const props = defineProps<{
  selectedClusterKey?: PolisKey;
  commentItem: OpinionItem;
  postSlugId: string;
  highlight: boolean;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
}>();

const deleted = ref(false);

const reasonLabel = calculateReasonLabel();

function calculateReasonLabel() {
  const totalPercentageAgrees = calculatePercentage(
    props.commentItem.numAgrees,
    props.commentItem.numParticipants
  );
  const totalPercentageDisagrees = calculatePercentage(
    props.commentItem.numDisagrees,
    props.commentItem.numParticipants
  );
  if (totalPercentageAgrees > 50 || totalPercentageDisagrees > 50) {
    return "Majority (Total)";
  }
  if (
    totalPercentageDisagrees + totalPercentageAgrees > 50 &&
    Math.abs(totalPercentageAgrees - totalPercentageDisagrees) < 50
  ) {
    return "Controversial (Total)";
  }
  if (props.commentItem.clustersStats.length >= 2) {
    for (const clusterStat of props.commentItem.clustersStats) {
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
        return `Controversial (Group ${labelCluster})`;
      }
    }
  }
}

function deletedComment() {
  deleted.value = true;
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.container {
  position: relative;
}

.pushReasonFlex {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.pushReasonStyle {
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0.5rem;
  color: $primary;
  background-color: white;
  border-style: solid;
  border-width: 1px;
  border-color: $primary;
}

.pushReasonPosition {
  position: absolute;
  top: -2rem;
  right: -0.2rem;
}

.contentLayout {
  display: flex;
  flex-direction: column;
  justify-content: left;
  gap: 1rem;
}

.metadata {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  color: $color-text-weak;
  padding-bottom: 1rem;
}

.highlightComment {
  background-color: #ccfbf1;
  border-radius: 15px;
  padding: 0.5rem;
}

.avatarIcon {
  margin-right: 0.5rem;
}

.userNameTime {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  word-break: break-all;
}

.topBar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.topRightBar {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
