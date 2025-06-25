<template>
  <div class="innerContainer">
    <PostMetadata
      :poster-user-name="extendedPostData.metadata.authorUsername"
      :created-at="new Date(extendedPostData.metadata.createdAt)"
      :post-slug-id="extendedPostData.metadata.conversationSlugId"
      :author-verified="false"
      :organization-url="extendedPostData.metadata.organization?.imageUrl || ''"
      :organization-name="extendedPostData.metadata.organization?.name || ''"
      @open-moderation-history="$emit('openModerationHistory')"
    />

    <div class="postDiv">
      <div>
        <div class="titleDiv titlePadding">
          {{ extendedPostData.payload.title }}
        </div>
      </div>

      <div
        v-if="
          extendedPostData.payload.body != undefined &&
          extendedPostData.payload.body.length > 0
        "
        class="bodyDiv"
      >
        <HtmlContent
          :html-body="extendedPostData.payload.body"
          :compact-mode="compactMode"
        />
      </div>

      <!-- Poll is part of the post content -->
      <div v-if="extendedPostData.payload.poll" class="pollContainer">
        <PollWrapper
          :login-required-to-participate="
            extendedPostData.metadata.isIndexed ||
            extendedPostData.metadata.isLoginRequired
          "
          :poll-options="extendedPostData.payload.poll"
          :post-slug-id="extendedPostData.metadata.conversationSlugId"
          :user-response="extendedPostData.interaction"
        />
      </div>

      <ZKCard
        v-if="extendedPostData.metadata.moderation.status == 'moderated'"
        padding="1rem"
        class="lockCardStyle"
      >
        <PostLockedMessage
          :moderation-property="extendedPostData.metadata.moderation"
          :post-slug-id="extendedPostData.metadata.conversationSlugId"
        />
      </ZKCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostMetadata from "./PostMetadata.vue";
import HtmlContent from "./HtmlContent.vue";
import PollWrapper from "./poll/PollWrapper.vue";
import ZKCard from "../../ui-library/ZKCard.vue";
import PostLockedMessage from "./PostLockedMessage.vue";
import type { ExtendedConversation } from "src/shared/types/zod";

defineEmits(["openModerationHistory"]);

defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
}>();
</script>

<style scoped lang="scss">
.innerContainer {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pollContainer {
  padding-bottom: 1rem;
}

.titleDiv {
  font-size: 1.125rem;
  font-weight: 500;
}

.bodyDiv {
  padding-bottom: 1rem;
}

.postDiv {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.titlePadding {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.lockCardStyle {
  background-color: white;
  margin-bottom: 1rem;
}
</style>
