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
              {{ t("moderatorFlaggedMessage") }} "{{
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

            <div v-if="canModerateConversation" class="moderationEditButton">
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
                  :label="t('edit')"
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
import ModerationTime from "src/components/post/common/moderation/ModerationTime.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OpinionItem } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { computed } from "vue";

import {
  type CommentModerationTranslations,
  commentModerationTranslations,
} from "./CommentModeration.i18n";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
}>();

const { profileData } = storeToRefs(useUserStore());

const canModerateConversation = computed(() => {
  const profile = profileData.value;
  if (profile.isSiteModerator) return true;
  if (profile.userName !== "" && profile.userName === props.conversationAuthorUsername) return true;
  if (
    props.conversationOrganizationName !== "" &&
    profile.organizationList.some((org) => org.name === props.conversationOrganizationName)
  ) return true;
  return false;
});

const { t } = useComponentI18n<CommentModerationTranslations>(
  commentModerationTranslations
);
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
  font-weight: var(--font-weight-normal);
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
