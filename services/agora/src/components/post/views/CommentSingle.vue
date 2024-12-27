<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div class="container">
      <div class="metadata">
        <UserAvatar
          :user-name="commentItem.username"
          :size="40"
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

      <div>
        <div :class="{ highlightComment: highlight }">
          <span v-html="commentItem.comment"></span>
        </div>

        <div v-if="commentItem.moderation.isModerated" class="moderatedBox">
          <ZKCard padding="1rem">
            <div class="moderationContainer">
              <div class="moderatedMessage">
                <div class="moderatedFont moderatedItalic">
                  <span
                    v-if="commentItem.moderation.moderationReason != 'nothing'"
                  >
                    Moderator flagged this response as
                    {{ commentItem.moderation.moderationReason }}.
                  </span>
                  <span
                    v-if="commentItem.moderation.moderationReason == 'nothing'"
                  >
                    Moderator did not provide a reason for the removal.
                  </span>
                </div>
                <div
                  v-if="commentItem.moderation.moderationExplanation.length > 0"
                  class="moderatedFont"
                >
                  "{{ commentItem.moderation.moderationExplanation }}"
                </div>
              </div>

              <div class="moderationTimeBox moderatedFont">
                <div>
                  {{
                    useDateFormat(commentItem.moderation.createdAt, "HH:mm A")
                  }}
                </div>
                <div>
                  {{
                    useDateFormat(
                      commentItem.moderation.createdAt,
                      "YYYY-MM-DD"
                    )
                  }}
                </div>

                <div
                  v-if="profileData.isModerator"
                  class="moderationEditButton"
                >
                  <RouterLink
                    :to="{
                      name: 'moderate-comment-page',
                      params: { commentSlugId: commentItem.commentSlugId },
                    }"
                  >
                    <ZKButton label="Edit" color="primary" />
                  </RouterLink>
                </div>
              </div>
            </div>
          </ZKCard>
        </div>

        <div
          v-if="!commentItem.moderation.isModerated"
          class="actionBarPaddings"
        >
          <CommentActionBar
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :is-post-locked="isPostLocked"
            @deleted="deletedComment()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentActionBar from "./CommentActionBar.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";
import { formatTimeAgo, useDateFormat } from "@vueuse/core";
import type { CommentItem } from "src/shared/types/zod";
import { ref } from "vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useUserStore } from "src/stores/user";
import { storeToRefs } from "pinia";

const emit = defineEmits(["deleted"]);

defineProps<{
  commentItem: CommentItem;
  postSlugId: string;
  highlight: boolean;
  commentSlugIdLikedMap: Map<string, "like" | "dislike">;
  isPostLocked: boolean;
}>();

const { profileData } = storeToRefs(useUserStore());

const deleted = ref(false);

function deletedComment() {
  deleted.value = true;
  emit("deleted");
}
</script>

<style scoped lang="scss">
.container {
  padding: 0.5rem;
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

.actionBarPaddings {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
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
}

.moderatedFont {
  font-weight: 400;
  color: #6d6a74;
}

.moderatedItalic {
  font-style: italic;
}

.moderatedMessage {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.moderationContainer {
  display: flex;
  justify-content: space-between;
}

.moderatedBox {
  padding-top: 1rem;
}

.moderationTimeBox {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.moderationEditButton {
  padding-top: 1rem;
}
</style>
