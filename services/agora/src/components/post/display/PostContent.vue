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
      :conversation-title="effectiveDisplayedTitle"
      :conversation-type-config="extendedPostData.metadata"
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
          :title="effectiveDisplayedTitle"
          size="medium"
          :conversation-type-config="extendedPostData.metadata"
          :external-source-config="extendedPostData.metadata.externalSourceConfig"
          :project-context="
            compactMode ? undefined : extendedPostData.metadata.projectContext
          "
          :project-context-title-mode="contentTranslation?.mode ?? 'original'"
        />
      </div>

      <div
        v-if="
          effectiveDisplayedBody != undefined &&
          effectiveDisplayedBody.length > 0
        "
        class="bodyDiv"
      >
        <ZKHtmlContent
          :html-body="effectiveDisplayedBody"
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
  ExtendedConversationDisplayData,
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
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedTitle: string;
  translatedBody: string | undefined;
}

const props = defineProps<{
  extendedPostData: ExtendedConversation | ExtendedConversationDisplayData;
  compactMode: boolean;
  contentTranslation: PostContentTranslationPreview | undefined;
  displayedTitle?: string;
  displayedBody?: string;
}>();

const emit = defineEmits<{
  openModerationHistory: [];
  conversationDeleted: [];
  verified: [payload: { userIdChanged: boolean; needsCacheRefresh: boolean }];
  "update:contentTranslationMode": [mode: ContentTranslationDisplayMode];
}>();

const effectiveDisplayedTitle = computed(() => {
  if (props.displayedTitle !== undefined) {
    return props.displayedTitle;
  }

  return "payload" in props.extendedPostData
    ? props.extendedPostData.payload.title
    : "";
});

const effectiveDisplayedBody = computed(() => {
  if (props.displayedBody !== undefined) {
    return props.displayedBody;
  }

  return "payload" in props.extendedPostData
    ? props.extendedPostData.payload.body
    : undefined;
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
