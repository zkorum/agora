<template>
  <Teleport v-if="isActive" to="#page-header">
    <DefaultMenuBar :center-content="false">
      <template #left>
        <BackButton @click="router.back()" />
      </template>
    </DefaultMenuBar>
  </Teleport>

  <WidthWrapper :enable="true">
    <div class="page-container">
      <PrimeCard class="control-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-cog section-icon"></i>
            <span>Preview controls</span>
          </div>
        </template>

        <template #content>
          <div class="controls-row">
            <div class="control-item">
              <label for="description-length" class="control-label">
                Description
              </label>
              <PrimeSelect
                id="description-length"
                v-model="descriptionMode"
                :options="descriptionModeOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>

            <div class="control-item">
              <label for="conversation-mode" class="control-label">
                Conversation view
              </label>
              <PrimeSelect
                id="conversation-mode"
                v-model="conversationMode"
                :options="conversationModeOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>

            <div class="control-item">
              <label for="statement-set" class="control-label">
                Below action bar
              </label>
              <PrimeSelect
                id="statement-set"
                v-model="statementMode"
                :options="statementModeOptions"
                option-label="label"
                option-value="value"
                class="control-select"
              />
            </div>
          </div>
        </template>
      </PrimeCard>

      <ZKHoverEffect :enable-hover="false">
        <div class="conversation-container standardStyle">
          <PostContent
            :extended-post-data="conversationPreview"
            :compact-mode="conversationMode === 'compact'"
          />

          <PostActionBar
            v-model="currentTab"
            :compact-mode="conversationMode === 'compact'"
            :opinion-count="conversationPreview.metadata.opinionCount"
            :participant-count="conversationPreview.metadata.participantCount"
            :vote-count="conversationPreview.metadata.voteCount"
            :total-participant-count="
              conversationPreview.metadata.totalParticipantCount
            "
            :total-vote-count="conversationPreview.metadata.totalVoteCount"
            :conversation-slug-id="conversationPreview.metadata.conversationSlugId"
            :conversation-title="conversationPreview.payload.title"
            :author-username="conversationPreview.metadata.authorUsername"
            :on-same-tab-click="noop"
            :conversation-type="conversationPreview.metadata.conversationType"
            :enable-route-navigation="false"
          />

          <div class="comments-section">
            <CommentItem
              v-for="statement in displayedStatements"
              :key="statement.opinionSlugId"
              :comment-item="statement"
              post-slug-id="longtxt1"
              conversation-author-username="test-author"
              conversation-organization-name=""
              :voting-utilities="votingUtilities"
              participation-mode="guest"
              :survey-gate="undefined"
              :on-view-analysis="noop"
              :is-voting-disabled="true"
            />
          </div>
        </div>
      </ZKHoverEffect>
    </div>
  </WidthWrapper>
</template>

<script setup lang="ts">
import Card from "primevue/card";
import Select from "primevue/select";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import CommentItem from "src/components/post/comments/group/item/CommentItem.vue";
import PostContent from "src/components/post/display/PostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type { CastVoteResponse } from "src/shared/types/dto";
import type {
  ExtendedConversation,
  OpinionItem,
  VotingAction,
} from "src/shared/types/zod";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

defineOptions({
  components: {
    PrimeCard: Card,
    PrimeSelect: Select,
  },
});

type DescriptionMode =
  | "short"
  | "single-empty-line"
  | "multiple-empty-lines"
  | "long"
  | "long-with-empty-lines";
type ConversationMode = "full" | "compact";
type StatementMode =
  | "short"
  | "single-empty-line"
  | "multiple-empty-lines"
  | "long"
  | "mixed";

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

const router = useRouter();
const { isActive } = usePageLayout({
  enableFooter: false,
  addBottomPadding: true,
});
const now = new Date("2026-01-01T00:00:00Z");

const descriptionMode = ref<DescriptionMode>("long-with-empty-lines");
const conversationMode = ref<ConversationMode>("full");
const statementMode = ref<StatementMode>("mixed");
const currentTab = ref<"comment" | "analysis">("comment");

const descriptionModeOptions: Array<SelectOption<DescriptionMode>> = [
  { label: "Short", value: "short" },
  { label: "Single preserved empty line", value: "single-empty-line" },
  { label: "Multiple empty lines collapse", value: "multiple-empty-lines" },
  { label: "Long", value: "long" },
  { label: "Long with empty paragraphs", value: "long-with-empty-lines" },
];

const conversationModeOptions: Array<SelectOption<ConversationMode>> = [
  { label: "Full conversation page", value: "full" },
  { label: "Compact feed card", value: "compact" },
];

const statementModeOptions: Array<SelectOption<StatementMode>> = [
  { label: "Short", value: "short" },
  { label: "Single preserved empty line", value: "single-empty-line" },
  { label: "Multiple empty lines collapse", value: "multiple-empty-lines" },
  { label: "Long", value: "long" },
  { label: "Mixed", value: "mixed" },
];

function noop(): void {}

function paragraphs({ prefix, count }: { prefix: string; count: number }): string {
  return Array.from({ length: count }, (_value, index) => {
    const paragraphNumber = index + 1;
    return `<p>${prefix} paragraph ${paragraphNumber.toString()} with enough text to wrap across multiple lines on mobile and desktop layouts.</p>`;
  }).join("");
}

function createConversation({
  body,
}: {
  body: string;
}): ExtendedConversation {
  return {
    metadata: {
      conversationSlugId: "longtxt1",
      conversationViewSnapshotId: 1,
      createdAt: now,
      lastReactedAt: now,
      opinionCount: 2,
      voteCount: 12,
      participantCount: 6,
      totalOpinionCount: 2,
      totalVoteCount: 12,
      totalParticipantCount: 6,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "test-author",
      participationMode: "guest",
      conversationType: "polis",
      isIndexed: true,
      aiLabelingEnabled: true,
      preferredOpinionGroupCount: null,
      isClosed: false,
      isEdited: false,
      moderation: { status: "unmoderated" },
      externalSourceConfig: null,
    },
    payload: {
      title: "Long description conversation",
      body,
    },
    interaction: {
      hasVoted: false,
      votedIndex: 0,
    },
  };
}

function createStatement({
  slugId,
  opinion,
}: {
  slugId: string;
  opinion: string;
}): OpinionItem {
  return {
    opinionSlugId: slugId,
    createdAt: now,
    updatedAt: now,
    opinion,
    numParticipants: 6,
    numAgrees: 3,
    numDisagrees: 2,
    numPasses: 1,
    username: "statement-author",
    moderation: { status: "unmoderated" },
    isSeed: false,
  };
}

const shortDescription =
  "<p>This description should stay fully visible and should not show a disclosure button.</p>";
const singleEmptyLineDescription = [
  "<p>This paragraph is followed by one intentionally empty paragraph.</p>",
  "<p> </p>",
  "<p>This paragraph should appear after one visible blank line.</p>",
].join("");
const multipleEmptyLinesDescription = [
  "<p>This paragraph is followed by several empty paragraphs.</p>",
  "<p> </p><p>&nbsp;</p><p><br></p><p>   </p>",
  "<p>This paragraph should still appear after only one visible blank line.</p>",
].join("");
const longDescription = paragraphs({ prefix: "Long description", count: 14 });
const longDescriptionWithEmptyLines = [
  "<p>   </p>",
  longDescription,
  "<p> </p><p></p><p>Trailing cleanup should remove extra empty space after this sentence.   </p><p></p><p> </p>",
].join("");

const shortStatement = createStatement({
  slugId: "shorts1",
  opinion: "<p>A short statement should not show read more.</p>",
});

const singleEmptyLineStatement = createStatement({
  slugId: "singleblank1",
  opinion: [
    "<p>This statement has one intentionally empty paragraph.</p>",
    "<p> </p>",
    "<p>This sentence should appear after one visible blank line.</p>",
  ].join(""),
});

const multipleEmptyLinesStatement = createStatement({
  slugId: "multiblank1",
  opinion: [
    "<p>This statement has several empty paragraphs.</p>",
    "<p> </p><p>&nbsp;</p><p><br></p><p>   </p>",
    "<p>This sentence should still appear after only one visible blank line.</p>",
  ].join(""),
});

const longStatement = createStatement({
  slugId: "longs1",
  opinion: [
    "<p> </p><p></p>",
    paragraphs({ prefix: "Long statement", count: 12 }),
    "<p></p><p> </p><p>Final statement paragraph with trailing spaces.   </p><p></p>",
  ].join(""),
});

const conversationBody = computed(() => {
  if (descriptionMode.value === "short") return shortDescription;
  if (descriptionMode.value === "single-empty-line") {
    return singleEmptyLineDescription;
  }
  if (descriptionMode.value === "multiple-empty-lines") {
    return multipleEmptyLinesDescription;
  }
  if (descriptionMode.value === "long") return longDescription;
  return longDescriptionWithEmptyLines;
});

const conversationPreview = computed(() => {
  return createConversation({ body: conversationBody.value });
});

const displayedStatements = computed(() => {
  if (statementMode.value === "short") return [shortStatement];
  if (statementMode.value === "single-empty-line") {
    return [singleEmptyLineStatement];
  }
  if (statementMode.value === "multiple-empty-lines") {
    return [multipleEmptyLinesStatement];
  }
  if (statementMode.value === "long") return [longStatement];
  return [shortStatement, singleEmptyLineStatement, multipleEmptyLinesStatement, longStatement];
});

const votingUtilities: OpinionVotingUtilities = {
  userVotes: [],
  castVote: (
    _opinionSlugId: string,
    _voteAction: VotingAction
  ): Promise<CastVoteResponse> => {
    return Promise.resolve({ success: false, reason: "conversation_closed" });
  },
};
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0 2rem;
}

.control-card {
  margin: 0 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.controls-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.control-label {
  color: $grey-8;
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
}

.control-select {
  width: 100%;
}

.conversation-container {
  margin: 0 1rem;
  padding: 1rem;
}

.comments-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}
</style>
