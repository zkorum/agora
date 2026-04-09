<template>
  <div
    class="commentListFlex"
    role="list"
    :aria-label="`Comments section with ${finalCommentList.length} comments`"
    aria-describedby="comments-navigation-help"
  >
    <!-- Screen reader instructions -->
    <div id="comments-navigation-help" class="sr-only">
      Use arrow keys to navigate between comments.
      {{ highlightedOpinion ? "The first comment is highlighted." : "" }}
    </div>

    <ZKCard
      v-for="(commentItem, index) in finalCommentList"
      :id="`comment-${commentItem.opinionSlugId}`"
      :key="commentItem.opinionSlugId"
      :tabindex="0"
      :aria-posinset="index + 1"
      :aria-setsize="finalCommentList.length"
      :aria-label="getCommentAriaLabel(commentItem, index)"
      :aria-describedby="`comment-meta-${commentItem.opinionSlugId}`"
      role="listitem"
      padding="0rem"
      class="commentItemBackground"
      :class="{
        highlightCommentItem: isHighlightedComment(commentItem),
      }"
      @keydown="handleKeyNavigation($event, index)"
    >
      <!-- Hidden metadata for screen readers -->
      <div :id="`comment-meta-${commentItem.opinionSlugId}`" class="sr-only">
        Comment by {{ commentItem.username }}, posted
        {{ formatDateForScreenReader(commentItem.createdAt) }}.
        {{
          isHighlightedComment(commentItem)
            ? "This comment is highlighted."
            : ""
        }}
        {{ commentItem.isSeed ? "This is a seed comment." : "" }}
      </div>

      <CommentItem
        :comment-item="commentItem"
        :post-slug-id="postSlugId"
        :conversation-author-username="conversationAuthorUsername"
        :conversation-organization-name="conversationOrganizationName"
        :voting-utilities="votingUtilities"
        :participation-mode="participationMode"
        :requires-event-ticket="props.requiresEventTicket"
        :on-view-analysis="props.onViewAnalysis"
        :is-voting-disabled="props.isVotingDisabled"
        @deleted="deletedComment(commentItem.opinionSlugId)"
        @muted-comment="mutedComment()"
      />
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import ZKCard from "src/components/ui-library/ZKCard.vue";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import {
  localizedDateTimeFormatOptions,
  useLocalizedDateTimeFormatter,
} from "src/composables/ui/useLocalizedDateTime";
import type { OpinionItem } from "src/shared/types/zod";
import { computed, nextTick } from "vue";

import CommentItem from "./item/CommentItem.vue";

const props = defineProps<{
  commentItemList: OpinionItem[];
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  highlightedOpinion?: OpinionItem | null;
  votingUtilities: OpinionVotingUtilities;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
}>();

const emit = defineEmits<{
  deleted: [opinionSlugId: string];
  mutedComment: [];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

import type { EventSlug, ParticipationMode } from "src/shared/types/zod";

const formatDateForScreenReader = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.dateTime,
});

const finalCommentList = computed((): OpinionItem[] => {
  const result: OpinionItem[] = [];

  // Add highlighted opinion first if it exists
  if (props.highlightedOpinion) {
    // targetOpinion is fetched separately from the comments cache, so optimistic
    // vote updates (which modify the cache) don't reach it. Use the cached version
    // when available; fall back to targetOpinion while cache is still loading.
    const cachedVersion = props.commentItemList.find(
      (c) => c.opinionSlugId === props.highlightedOpinion?.opinionSlugId
    );
    result.push(cachedVersion ?? props.highlightedOpinion);
  }

  // Add regular comments, excluding the highlighted one to prevent duplication
  const highlightedSlugId = props.highlightedOpinion?.opinionSlugId;
  const regularComments = props.commentItemList.filter(
    (comment) => comment.opinionSlugId !== highlightedSlugId
  );

  result.push(...regularComments);

  return result;
});

/**
 * Checks if the given comment is the highlighted one
 */
function isHighlightedComment(commentItem: OpinionItem): boolean {
  return props.highlightedOpinion?.opinionSlugId === commentItem.opinionSlugId;
}

/**
 * Generates accessible aria-label for each comment
 */
function getCommentAriaLabel(commentItem: OpinionItem, index: number): string {
  const position = `Comment ${index + 1} of ${finalCommentList.value.length}`;
  const author = `by ${commentItem.username}`;
  const highlighted = isHighlightedComment(commentItem) ? ", highlighted" : "";
  const seed = commentItem.isSeed ? ", seed comment" : "";

  return `${position} ${author}${highlighted}${seed}`;
}

/**
 * Handles keyboard navigation between comments
 */
function handleKeyNavigation(event: KeyboardEvent, currentIndex: number): void {
  const { key } = event;

  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(key)) {
    return;
  }

  event.preventDefault();

  let targetIndex: number;
  const maxIndex = finalCommentList.value.length - 1;

  switch (key) {
    case "ArrowUp":
      targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      break;
    case "ArrowDown":
      targetIndex = currentIndex < maxIndex ? currentIndex + 1 : currentIndex;
      break;
    case "Home":
      targetIndex = 0;
      break;
    case "End":
      targetIndex = maxIndex;
      break;
    default:
      return;
  }

  // Focus the target comment
  const targetComment = finalCommentList.value[targetIndex];
  if (targetComment) {
    void focusCommentById(targetComment.opinionSlugId);
  }
}

/**
 * Focuses a comment by its ID
 */
async function focusCommentById(commentId: string): Promise<void> {
  await nextTick();
  const element = document.getElementById(`comment-${commentId}`);
  if (element) {
    element.focus();
  }
}

/**
 * Emits deleted comment event
 */
function deletedComment(opinionSlugId: string): void {
  emit("deleted", opinionSlugId);
}

/**
 * Emits muted comment event
 */
function mutedComment(): void {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.commentListFlex {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
}

.commentItemBackground {
  background-color: white;
}

.highlightCommentItem {
  border-style: solid;
  border-color: $primary;
  border-width: 2px;
}

// Screen reader only content - visually hidden but accessible to screen readers
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

// High contrast mode support
@media (prefers-contrast: high) {
  .highlightCommentItem {
    border-width: 3px;
    border-color: currentColor;
  }
}
</style>
