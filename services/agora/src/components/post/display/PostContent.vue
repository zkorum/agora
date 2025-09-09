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
      @edit="onOpenEditDialog"
    />

    <EditPostDialog
      v-model="showEditDialog"
      :initial-title="extendedPostData.payload.title"
      :initial-body="extendedPostData.payload.body || ''"
      @save="onSaveEdit"
    />

    <div class="postDiv">
      <div>
        <ConversationTitleWithPrivacyLabel
          :is-private="!extendedPostData.metadata.isIndexed"
          :title="extendedPostData.payload.title"
          size="medium"
        />
      </div>

      <div
        v-if="
          extendedPostData.payload.body != undefined &&
          extendedPostData.payload.body.length > 0
        "
        class="bodyDiv"
      >
        <ZKHtmlContent
          :html-body="extendedPostData.payload.body"
          :compact-mode="compactMode"
          :enable-links="compactMode ? false : true"
        />
      </div>

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
import EditPostDialog from "./EditPostDialog.vue";
import ZKHtmlContent from "../../ui-library/ZKHtmlContent.vue";
import PollWrapper from "./poll/PollWrapper.vue";
import ZKCard from "../../ui-library/ZKCard.vue";
import PostLockedMessage from "./PostLockedMessage.vue";
import ConversationTitleWithPrivacyLabel from "../../features/conversation/ConversationTitleWithPrivacyLabel.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import { ref } from 'vue';

const emit = defineEmits(["openModerationHistory", "saveEdit"]);

defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
}>();

const showEditDialog = ref(false);

function onOpenEditDialog() {
  showEditDialog.value = true;
}

function onSaveEdit(payload: { title: string; body: string }) {
  // Bubble up to the parent (page) to actually perform the save via API
  emit('saveEdit', payload);
}
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

.bodyDiv {
  padding-bottom: 1rem;
}

.postDiv {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lockCardStyle {
  background-color: white;
  margin-bottom: 1rem;
}
</style>
