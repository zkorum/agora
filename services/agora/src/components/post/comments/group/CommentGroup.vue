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
        'focused-comment': focusedCommentId === commentItem.opinionSlugId,
      }"
      @keydown="handleKeyNavigation($event, index)"
      @focus="onCommentFocus(commentItem)"
      @blur="onCommentBlur(commentItem)"
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
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        :login-required-to-participate="loginRequiredToParticipate"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
        @change-vote="
          (vote: VotingAction, opinionSlugId: string) =>
            changeVote(vote, opinionSlugId)
        "
      />
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import type {
  OpinionItem,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import CommentItem from "./item/CommentItem.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";

const emit = defineEmits(["deleted", "mutedComment", "changeVote"]);

const props = defineProps<{
  commentItemList: OpinionItem[];
  postSlugId: string;
  highlightedOpinion?: OpinionItem | null;
  commentSlugIdLikedMap: Map<string, VotingOption>;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
}>();

// Reactive state for focus management
const focusedCommentId = ref<string | null>(null);

const finalCommentList = computed((): OpinionItem[] => {
  const result: OpinionItem[] = [];

  // Add highlighted opinion first if it exists
  if (props.highlightedOpinion) {
    result.push(props.highlightedOpinion);
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
 * Formats date for screen reader accessibility
 */
function formatDateForScreenReader(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
 * Handles comment focus events
 */
function onCommentFocus(commentItem: OpinionItem): void {
  focusedCommentId.value = commentItem.opinionSlugId;
}

/**
 * Handles comment blur events
 */
function onCommentBlur(commentItem: OpinionItem): void {
  if (focusedCommentId.value === commentItem.opinionSlugId) {
    focusedCommentId.value = null;
  }
}

/**
 * Emits vote change event
 */
function changeVote(vote: VotingAction, opinionSlugId: string): void {
  emit("changeVote", vote, opinionSlugId);
}

/**
 * Emits deleted comment event
 */
function deletedComment(): void {
  emit("deleted");
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
  transition:
    box-shadow 0.2s ease,
    outline 0.2s ease;

  // Focus styles for keyboard navigation
  &:focus {
    outline: 2px solid $primary;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba($primary, 0.1);
  }

  // Enhanced focus indicator for better visibility
  &:focus-visible {
    outline: 3px solid $primary;
    outline-offset: 3px;
    box-shadow: 0 0 0 6px rgba($primary, 0.15);
  }
}

.highlightCommentItem {
  border-style: solid;
  border-color: $primary;
  border-width: 2px;
}

.focused-comment {
  background-color: rgba($primary, 0.04);
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

  .commentItemBackground:focus {
    outline-width: 3px;
    outline-color: currentColor;
  }
}

// Reduced motion preferences
@media (prefers-reduced-motion: reduce) {
  .commentItemBackground {
    transition: none;
  }
}
</style>
