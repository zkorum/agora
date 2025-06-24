<template>
  <div>
    <div
      v-if="commentItem.moderation?.status == 'moderated'"
      class="moderatedBox"
    >
      <ZKCard padding="1rem" class="cardBackground">
        <div class="moderationContainer">
          <div class="moderatedMessage">
            <div class="moderatedFont moderatedItalic">
              Moderator flagged this response as "{{
                commentItem.moderation.reason
              }}".
            </div>
            <div
              v-if="commentItem.moderation.explanation.length > 0"
              class="moderatedFont"
            >
              "{{ commentItem.moderation.explanation }}"
            </div>
          </div>

          <div class="moderationTimeBox moderatedFont">
            <ModerationTime
              :created-at="commentItem.moderation.createdAt"
              :updated-at="commentItem.moderation.updatedAt"
            />

            <div v-if="profileData.isModerator" class="moderationEditButton">
              <RouterLink
                :to="{
                  name: '/moderate/conversation/[conversationSlugId]/opinion/[opinionSlugId]/',
                  params: {
                    conversationSlugId: postSlugId,
                    opinionSlugId: commentItem.opinionSlugId,
                  },
                }"
              >
                <ZKButton
                  button-type="largeButton"
                  label="Edit"
                  color="primary"
                />
              </RouterLink>
            </div>
          </div>
        </div>
      </ZKCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { OpinionItem } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ModerationTime from "../../views/moderation/ModerationTime.vue";

defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
}>();

const { profileData } = storeToRefs(useUserStore());
</script>

<style lang="scss" scoped>
.moderationContainer {
  display: flex;
  justify-content: space-between;
}

.moderationTimeBox {
  display: flex;
  flex-direction: column;
  align-items: end;
  width: 8rem;
}

.moderationEditButton {
  padding-top: 1rem;
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

.moderatedBox {
  padding-top: 1rem;
}

.cardBackground {
  background-color: $app-background-color;
}
</style>
