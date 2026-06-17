<template>
  <div class="innerContainer">
    <PostMetadata
      :poster-user-name="extendedPostData.metadata.authorUsername"
      :author-username="extendedPostData.metadata.authorUsername"
      :created-at="new Date(extendedPostData.metadata.createdAt)"
      :is-edited="extendedPostData.metadata.isEdited"
      :post-slug-id="extendedPostData.metadata.conversationSlugId"
      :author-verified="false"
      :organization-url="extendedPostData.metadata.organization?.imageUrl || ''"
      :organization-name="extendedPostData.metadata.organization?.name || ''"
      :participation-mode="extendedPostData.metadata.participationMode"
      :is-closed="extendedPostData.metadata.isClosed"
      :conversation-title="extendedPostData.payload.title"
      :conversation-type="extendedPostData.metadata.conversationType"
      :external-source-config="extendedPostData.metadata.externalSourceConfig ?? null"
      @open-moderation-history="$emit('openModerationHistory')"
      @conversation-deleted="$emit('conversationDeleted')"
    />

    <div class="postDiv">
      <div>
        <ContentTranslationControl
          v-if="contentTranslation?.isAvailable === true"
          :model-value="contentTranslation.mode"
          :source-language-label="contentTranslation.sourceLanguageLabel"
          :translation-status="contentTranslation.translationStatus"
          class="translation-control"
          @update:model-value="emit('update:contentTranslationMode', $event)"
        />

        <ConversationTitle
          :is-private="!extendedPostData.metadata.isIndexed"
          :title="displayedTitle"
          size="medium"
          :conversation-type="extendedPostData.metadata.conversationType"
          :external-source-config="extendedPostData.metadata.externalSourceConfig"
        />
      </div>

      <div
        v-if="
          displayedBody != undefined &&
          displayedBody.length > 0
        "
        class="bodyDiv"
      >
        <ZKHtmlContent
          :html-body="displayedBody"
          :compact-mode="compactMode"
          :enable-links="compactMode ? false : true"
          :desktop-collapsed-line-count="18"
        />
      </div>

      <ImportedConversationIndicator
        v-if="!compactMode && extendedPostData.metadata.importInfo"
        :import-info="extendedPostData.metadata.importInfo"
      />

      <ZKCard
        v-if="
          extendedPostData.metadata.moderation.status == 'moderated' ||
          extendedPostData.metadata.isClosed
        "
        padding="1rem"
        class="lockCardStyle"
      >
        <PostLockedMessage
          :moderation-property="extendedPostData.metadata.moderation"
          :post-slug-id="extendedPostData.metadata.conversationSlugId"
          :is-closed="extendedPostData.metadata.isClosed"
        />
      </ZKCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import type {
  ExtendedConversation,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { computed, defineAsyncComponent } from "vue";

import ConversationTitle from "../../features/conversation/ConversationTitle.vue";
import ZKCard from "../../ui-library/ZKCard.vue";
import ZKHtmlContent from "../../ui-library/ZKHtmlContent.vue";
import PostLockedMessage from "./PostLockedMessage.vue";
import PostMetadata from "./PostMetadata.vue";

interface PostContentTranslationPreview {
  isAvailable: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string;
  translationStatus: LocalizedContentTranslationStatus;
  translatedTitle: string;
  translatedBody: string | undefined;
}

const props = defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
  contentTranslation: PostContentTranslationPreview | undefined;
}>();

const emit = defineEmits<{
  openModerationHistory: [];
  conversationDeleted: [];
  verified: [payload: { userIdChanged: boolean; needsCacheRefresh: boolean }];
  "update:contentTranslationMode": [mode: ContentTranslationDisplayMode];
}>();

const displayedTitle = computed(() => {
  if (props.contentTranslation?.mode === "translated") {
    return props.contentTranslation.translatedTitle;
  }
  return props.extendedPostData.payload.title;
});

const displayedBody = computed(() => {
  if (props.contentTranslation?.mode === "translated") {
    return props.contentTranslation.translatedBody;
  }
  return props.extendedPostData.payload.body;
});

const ImportedConversationIndicator = defineAsyncComponent(
  () => import("./ImportedConversationIndicator.vue")
);
</script>

<style scoped lang="scss">
.innerContainer {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.bodyDiv {
  padding-bottom: 0;
}

.postDiv {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.translation-control {
  margin-bottom: 0.45rem;
}

.lockCardStyle {
  background-color: white;
  margin-bottom: 1rem;
}
</style>
