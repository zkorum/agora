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

            <div class="control-item">
              <label for="translation-scenario" class="control-label">
                Translation
              </label>
              <PrimeSelect
                id="translation-scenario"
                v-model="translationScenario"
                :options="translationScenarioOptions"
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
            :content-translation="conversationTranslationPreview"
            @update:content-translation-mode="conversationTranslationMode = $event"
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
              :content-translation="statementTranslationPreview(statement)"
              @update:content-translation-mode="statementTranslationMode = $event"
            />
          </div>

          <div class="survey-preview-card">
            <div class="survey-preview-card__eyebrow">Survey preview</div>
            <ContentTranslationControl
              v-if="surveyTranslationPreview.isAvailable"
              :model-value="surveyTranslationMode"
              :source-language-label="surveyTranslationPreview.sourceLanguageLabel"
              :translation-status="surveyTranslationPreview.translationStatus"
              class="survey-preview-card__translation-control"
              @update:model-value="surveyTranslationMode = $event"
            />
            <div class="survey-preview-card__question">
              {{ displayedSurveyQuestion }}
            </div>
            <div class="survey-preview-card__options">
              <button
                v-for="option in displayedSurveyOptions"
                :key="option"
                type="button"
                class="survey-preview-card__option"
              >
                {{ option }}
              </button>
            </div>
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
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type { CastVoteResponse } from "src/shared/types/dto";
import type {
  DisplayedOpinionItem,
  ExtendedConversation,
  OpinionItem,
  VotingAction,
} from "src/shared/types/zod";
import {
  type ContentTranslationDisplayMode,
  resolveContentTranslationState,
} from "src/utils/translation/contentTranslation";
import { computed, ref, watch } from "vue";
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
type TranslationScenario =
  | "off"
  | "same-display"
  | "spoken-not-display"
  | "pending"
  | "dto-original"
  | "dto-translated"
  | "dto-pending"
  | "not-spoken"
  | "unknown";

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
const translationScenario = ref<TranslationScenario>("not-spoken");
const currentTab = ref<"comment" | "analysis">("comment");
const conversationTranslationMode = ref<ContentTranslationDisplayMode>("original");
const statementTranslationMode = ref<ContentTranslationDisplayMode>("original");
const surveyTranslationMode = ref<ContentTranslationDisplayMode>("original");

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

const translationScenarioOptions: Array<SelectOption<TranslationScenario>> = [
  { label: "Dynamic translation off", value: "off" },
  { label: "Source matches display language", value: "same-display" },
  { label: "Source is spoken by viewer", value: "spoken-not-display" },
  { label: "Translation pending", value: "pending" },
  { label: "DTO original with translate", value: "dto-original" },
  { label: "DTO translated with original", value: "dto-translated" },
  { label: "DTO pending", value: "dto-pending" },
  { label: "Source is not spoken by viewer", value: "not-spoken" },
  { label: "Unknown source language", value: "unknown" },
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
      contentLanguageMetadata: {
        detectedDisplayLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectionConfidence: null,
        autoDetectionStatus: "not_attempted",
      },
      languageSetting: {
        mode: "auto",
        languageCode: null,
        detectedLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectionConfidence: null,
        autoDetectionStatus: "not_attempted",
      },
      multilingualSetting: {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      },
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
    sourceLanguageCode: null,
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

const translationInputs = computed(() => {
  if (translationScenario.value === "off") {
    return {
      dynamicTranslationEnabled: false,
      sourceLanguageCode: "ja",
      displayLanguage: "en" as const,
      spokenLanguages: ["en" as const],
      supportedTargetLanguageCodes: ["en" as const],
    };
  }
  if (translationScenario.value === "same-display") {
    return {
      dynamicTranslationEnabled: true,
      sourceLanguageCode: "en",
      displayLanguage: "en" as const,
      spokenLanguages: ["en" as const],
      supportedTargetLanguageCodes: ["en" as const],
    };
  }
  if (translationScenario.value === "spoken-not-display") {
    return {
      dynamicTranslationEnabled: true,
      sourceLanguageCode: "ja",
      displayLanguage: "en" as const,
      spokenLanguages: ["en" as const, "ja" as const],
      supportedTargetLanguageCodes: ["en" as const],
    };
  }
  if (translationScenario.value === "unknown") {
    return {
      dynamicTranslationEnabled: true,
      sourceLanguageCode: null,
      displayLanguage: "en" as const,
      spokenLanguages: ["en" as const],
      supportedTargetLanguageCodes: ["en" as const],
    };
  }
  return {
    dynamicTranslationEnabled: true,
    sourceLanguageCode: "ja",
    displayLanguage: "en" as const,
    spokenLanguages: ["en" as const],
    supportedTargetLanguageCodes: ["en" as const],
  };
});

const translationState = computed(() =>
  {
    if (translationScenario.value === "pending") {
      return {
        isAvailable: true,
        initialMode: "original" as const,
        sourceLanguageLabel: "Japanese",
        translationStatus: "pending" as const,
      };
    }
    if (translationScenario.value === "dto-original") {
      return {
        isAvailable: true,
        initialMode: "original" as const,
        sourceLanguageLabel: "Japanese",
        translationStatus: "completed" as const,
      };
    }
    if (translationScenario.value === "dto-translated") {
      return {
        isAvailable: true,
        initialMode: "translated" as const,
        sourceLanguageLabel: "Japanese",
        translationStatus: "completed" as const,
      };
    }
    if (translationScenario.value === "dto-pending") {
      return {
        isAvailable: true,
        initialMode: "original" as const,
        sourceLanguageLabel: "Japanese",
        translationStatus: "pending" as const,
      };
    }
    return resolveContentTranslationState({
      ...translationInputs.value,
      hasTranslatedContent: true,
    });
  }
);

watch(
  translationState,
  (state) => {
    conversationTranslationMode.value = state.initialMode;
    statementTranslationMode.value = state.initialMode;
    surveyTranslationMode.value = state.initialMode;
  },
  { immediate: true }
);

const translatedConversationBody = computed(() => {
  if (descriptionMode.value === "short") {
    return "<p>Translated short description preview.</p>";
  }
  return paragraphs({ prefix: "Translated description", count: 10 });
});

const conversationTranslationPreview = computed(() => ({
  isAvailable: translationState.value.isAvailable,
  isLoadingInitialTranslation: false,
  mode: conversationTranslationMode.value,
  sourceLanguageLabel: translationState.value.sourceLanguageLabel,
  translationStatus: translationState.value.translationStatus,
  translatedTitle: "Translated long description conversation",
  translatedBody: translatedConversationBody.value,
}));

function getStatementContentId(statement: OpinionItem): string {
  if (statement.opinionSlugId === shortStatement.opinionSlugId) {
    return "00000000-0000-4000-8000-000000000001";
  }
  if (statement.opinionSlugId === singleEmptyLineStatement.opinionSlugId) {
    return "00000000-0000-4000-8000-000000000002";
  }
  if (statement.opinionSlugId === multipleEmptyLinesStatement.opinionSlugId) {
    return "00000000-0000-4000-8000-000000000003";
  }
  return "00000000-0000-4000-8000-000000000004";
}

function getTranslatedStatementOpinion(statement: OpinionItem): string {
  return statement.opinion.length < 120
    ? "<p>Ugh, I'm so nervous.</p>"
    : paragraphs({ prefix: "Translated statement", count: 8 });
}

function getStatementDisplayContent(
  statement: OpinionItem
): DisplayedOpinionItem["displayContent"] {
  const contentId = getStatementContentId(statement);
  if (!translationState.value.isAvailable) {
    return {
      contentId,
      status: "available",
      mode: "original",
      content: { content: statement.opinion },
      translationControl: null,
    };
  }

  if (translationState.value.translationStatus === "pending") {
    return {
      contentId,
      status: "pending",
      translationControl: {
        status: "pending",
        sourceLanguageLabel: translationState.value.sourceLanguageLabel,
        alternateMode: "translated",
        canRequestAlternate: true,
      },
    };
  }

  const mode = translationState.value.initialMode;
  return {
    contentId,
    status: "available",
    mode,
    content: {
      content:
        mode === "translated"
          ? getTranslatedStatementOpinion(statement)
          : statement.opinion,
    },
    translationControl: {
      status: "completed",
      sourceLanguageLabel: translationState.value.sourceLanguageLabel,
      alternateMode: mode === "translated" ? "original" : "translated",
      canRequestAlternate: true,
    },
  };
}

function toDisplayedStatement(statement: OpinionItem): DisplayedOpinionItem {
  return {
    ...statement,
    displayContent: getStatementDisplayContent(statement),
  };
}

function statementTranslationPreview(statement: DisplayedOpinionItem) {
  const { displayContent } = statement;
  const translationControl = displayContent.translationControl;
  return {
    isAvailable: translationControl !== null,
    isLoadingInitialTranslation: false,
    mode: statementTranslationMode.value,
    sourceLanguageLabel: translationControl?.sourceLanguageLabel,
    translationStatus: translationControl?.status ?? "not_requested",
    translatedOpinion:
      displayContent.status === "available" && displayContent.mode === "translated"
        ? displayContent.content.content
        : getTranslatedStatementOpinion(statement),
  };
}

const surveyTranslationPreview = computed(() => translationState.value);

const displayedSurveyQuestion = computed(() =>
  surveyTranslationMode.value === "translated"
    ? "Which translated option best represents your view?"
    : "どの選択肢があなたの考えに一番近いですか？"
);

const displayedSurveyOptions = computed(() =>
  surveyTranslationMode.value === "translated"
    ? ["Strongly agree", "Not sure yet", "Strongly disagree"]
    : ["強く賛成", "まだわからない", "強く反対"]
);

const displayedStatements = computed((): DisplayedOpinionItem[] => {
  if (statementMode.value === "short") return [toDisplayedStatement(shortStatement)];
  if (statementMode.value === "single-empty-line") {
    return [toDisplayedStatement(singleEmptyLineStatement)];
  }
  if (statementMode.value === "multiple-empty-lines") {
    return [toDisplayedStatement(multipleEmptyLinesStatement)];
  }
  if (statementMode.value === "long") return [toDisplayedStatement(longStatement)];
  return [
    shortStatement,
    singleEmptyLineStatement,
    multipleEmptyLinesStatement,
    longStatement,
  ].map(toDisplayedStatement);
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

.survey-preview-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem $container-padding $container-padding;
  padding: 1rem;
  border: 1px solid $color-border-weak;
  border-radius: 1rem;
  background: white;
}

.survey-preview-card__eyebrow {
  color: $color-text-weak;
  font-size: 0.75rem;
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.survey-preview-card__translation-control {
  margin-bottom: -0.15rem;
}

.survey-preview-card__question {
  color: $ink-darkest;
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.35;
}

.survey-preview-card__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.survey-preview-card__option {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid $color-border-weak;
  border-radius: 0.75rem;
  background: white;
  color: $ink-darker;
  font: inherit;
  text-align: start;
}
</style>
