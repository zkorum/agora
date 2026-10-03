<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive && !isNavigatingAway" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left>
          <BackButton
            :fallback-route="{ name: '/conversation/new/create/' }"
            @click="handleBack"
          />
        </template>
        <template #right>
          <PrimeButton
            :label="submitButtonLabel"
            :loading="isSubmitButtonLoading"
            class="next-button"
            @click="onSubmit()"
          />
        </template>
      </DefaultMenuBar>
    </Teleport>

    <div class="container">
      <!-- Title with Privacy Label -->
      <ConversationTitle
        :is-private="conversationDraft.isPrivate"
        :title="conversationDraft.title"
        size="large"
        :conversation-type-config="conversationDraft"
        :external-source-config="conversationDraft.externalSourceConfig"
        :project-context="undefined"
        project-context-title-mode="original"
      />

      <!-- GitHub-linked: show read-only preview (items will sync from GitHub) -->
      <div
        v-if="conversationDraft.externalSourceConfig !== null"
        class="seed-opinions-section"
      >
        <div class="section-title">{{ t("githubSyncTitle") }}</div>
        <p class="section-description">
          {{ t("githubSyncDescription") }}
        </p>
        <div v-if="isLoadingPreview" class="preview-loading">
          <q-spinner size="1.5rem" />
          <span>{{ t("loadingGithubPreview") }}</span>
        </div>
        <ErrorRetryBlock
          v-else-if="previewError"
          compact
          :title="t('githubPreviewError')"
          :retry-label="t('githubPreviewRetry')"
          @retry="retryPreview"
        />
        <div v-else-if="githubPreviewItems.length > 0" class="opinions-list">
          <div
            v-for="item in githubPreviewItems"
            :key="item.number"
            class="github-preview-item"
          >
            <span class="preview-item-title">{{ item.title }}</span>
            <a
              :href="item.htmlUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="preview-item-link"
              @click.stop
            >
              <q-icon name="mdi-open-in-new" size="0.875rem" />
            </a>
          </div>
        </div>
        <div v-else class="preview-empty">
          {{ t("noGithubIssuesFound") }}
        </div>
      </div>

      <!-- Manual: Add Seed Opinions Section -->
      <div v-else class="seed-opinions-section">
        <div class="section-title">
          {{ isMaxDiffDraft ? t("addMaxDiffItems") : t("addSeedOpinions") }}
        </div>
        <p class="section-description">
          {{
            isMaxDiffDraft
              ? t("maxDiffSeedDescription")
              : t("seedOpinionsDescription")
          }}
          <span class="shortcut-hint">{{ t("addStatementShortcut") }}</span>
        </p>

        <!-- Seed Opinions List -->
        <div
          v-if="conversationDraft.seedOpinions.length > 0"
          class="opinions-list"
        >
          <SeedOpinionItem
            v-for="(opinion, index) in conversationDraft.seedOpinions"
            :key="index"
            :ref="
              (el: Element | ComponentPublicInstance | null) =>
                setOpinionRef(el, index)
            "
            :model-value="opinion"
            :error-message="opinionErrors[index]"
            :is-active="currentActiveOpinionIndex === index"
            :disabled="isSubmitButtonLoading"
            @update:model-value="
              (val) => {
                conversationDraft.seedOpinions[index] = val;
                clearOpinionError(index);
              }
            "
            @focus="
              () => {
                currentActiveOpinionIndex = index;
              }
            "
            @blur="currentActiveOpinionIndex = -1"
            @add-next="addNewOpinion"
            @remove="removeOpinion(index)"
          />
        </div>

        <!-- AI suggestions: shown on this page only, never part of the draft.
             Hidden once publishing succeeded, while the page waits to navigate away. -->
        <div
          v-if="isSuggestionsBoxVisible && !isNavigatingAway"
          class="suggestions-row"
        >
          <SeedSuggestionsBox
            class="suggestions-row-box"
            :suggestions="pendingSuggestions"
            :tip="notConfidentTip"
            :is-frozen="isSubmitButtonLoading"
            :can-take-suggestion="canTakeSuggestion"
            :can-generate="canGenerateSuggestions"
            :is-generating="isGeneratingSuggestions"
            :generate-more-label="generateMoreLabel"
            @add="addSuggestion"
            @discard="discardSuggestion"
            @generate-more="generateSuggestions"
            @edit-conversation="handleBack"
          />
          <!-- Takes the room of a statement's delete button, so the box is as wide as the statement boxes -->
          <PrimeButton
            icon="pi pi-trash"
            text
            rounded
            class="suggestions-row-spacer"
            aria-hidden="true"
            tabindex="-1"
            disabled
          />
        </div>

        <!-- Add Opinion Button -->
        <div v-if="!isSubmitButtonLoading" class="add-button-container">
          <ConversationControlButton
            :label="isMaxDiffDraft ? t('addMaxDiffItem') : t('addOpinion')"
            icon="pi pi-plus"
            :show-border="false"
            icon-position="left"
            @click="addNewOpinion"
          />
          <!-- Once the box is shown, its own "Generate more" button takes over -->
          <ConversationControlButton
            v-if="isAiSuggestionsEnabled && !isSuggestionsBoxVisible"
            class="ai-suggestions-button"
            :label="aiSuggestionsButtonLabel"
            icon="pi pi-lightbulb"
            :show-border="false"
            icon-position="left"
            :disabled="!canGenerateSuggestions"
            :aria-busy="isGeneratingSuggestions"
            @click="generateSuggestions"
          />
        </div>
      </div>
    </div>

    <NewConversationRouteGuard
      ref="routeGuard"
      :allowed-routes="[
        '/conversation/new/create/',
        '/conversation/new/survey/',
        '/welcome/',
      ]"
      :has-unsaved-changes="isDraftModified"
      :reset-draft="resetDraft"
    />

    <PreParticipationIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="newConversation"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import ConversationTitle from "src/components/features/conversation/ConversationTitle.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import SeedOpinionItem from "src/components/newConversation/SeedOpinionItem.vue";
import SeedSuggestionsBox from "src/components/newConversation/SeedSuggestionsBox.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import { useConversationDraft } from "src/composables/conversation/draft";
import { useCreateSurveyAccess } from "src/composables/conversation/useCreateSurveyAccess";
import type { SeedOpinionCreateFailure } from "src/composables/conversation/usePublishConversationDraft";
import { usePublishConversationDraft } from "src/composables/conversation/usePublishConversationDraft";
import { useSeedSuggestions } from "src/composables/conversation/useSeedSuggestions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { validateRichTextInput } from "src/shared/richText";
import { type RichTextValidationFailure } from "src/shared/shared";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import {
  isHistoryBackToPath,
  navigateBackOrReplace,
} from "src/utils/nav/historyBack";
import { processEnv } from "src/utils/processEnv";
import { useNotify } from "src/utils/ui/notify";
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationReviewTranslations,
  conversationReviewTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const router = useRouter();
const { showNotifyMessage } = useNotify();

// Use composable for validation and draft management (with syncToStore: true since we're in create flow)
const { validateForReview, isDraftModified, resetDraft } = useConversationDraft(
  { syncToStore: true }
);
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());
const isMaxDiffDraft = computed(
  () =>
    conversationDraft.value.conversationType === "ranking" &&
    conversationDraft.value.rankingMode === "bws"
);

const { previewGitHubIssues } = useMaxDiffApi();
const { publishConversationDraft } = usePublishConversationDraft();

// AI suggestions. Whether this author may use them is decided by the API alone.
const isAiSuggestionsEnabled =
  processEnv.VITE_AI_SUGGESTIONS_ENABLED === "true";
const {
  pendingSuggestions,
  notConfidentTip,
  isGenerating: isGeneratingSuggestions,
  canGenerate: canGenerateSuggestions,
  canTakeSuggestion,
  generate,
  add: addSuggestionToStatements,
  discard: discardSuggestion,
} = useSeedSuggestions({ conversationDraft });
const isSuggestionsBoxVisible = computed(
  () =>
    pendingSuggestions.value.length > 0 || notConfidentTip.value !== undefined
);

const showLoginDialog = ref(false);
const isSubmitButtonLoading = ref(false);
const isNavigatingAway = ref(false);
const currentActiveOpinionIndex = ref(-1);
const routeGuard = ref<{ unlockRoute: () => void } | undefined>(undefined);

async function handleBack(event: MouseEvent): Promise<void> {
  event.preventDefault();
  isNavigatingAway.value = true;

  const fallbackRoute = { name: "/conversation/new/create/" } as const;
  await navigateBackOrReplace({
    router,
    fallbackRoute,
    shouldNavigateBack: isHistoryBackToPath({
      historyBack: window.history.state?.back,
      expectedPath: "/conversation/new/create/",
    }),
  });
}

// Validation state
const opinionErrors = ref<Record<number, string>>({});
const opinionRefs = ref<Record<number, HTMLElement>>({});
const opinionComponentRefs = ref<
  Record<number, InstanceType<typeof SeedOpinionItem>>
>({});

// GitHub preview state
interface GitHubPreviewItem {
  number: number;
  title: string;
  htmlUrl: string;
}
const isLoadingPreview = ref(false);
const previewError = ref(false);
const githubPreviewItems = ref<GitHubPreviewItem[]>([]);

const { createNewConversationIntention } = useLoginIntentionStore();
const { t } = useComponentI18n<ConversationReviewTranslations>(
  conversationReviewTranslations
);
const { isSurveyCreationAllowed, refreshSurveyCreationAccess } =
  useCreateSurveyAccess();
const submitButtonLabel = computed(() => {
  return isSurveyCreationAllowed.value === true
    ? t("nextButton")
    : t("publishButton");
});

onMounted(async () => {
  await nextTick();

  const validation = validateForReview();

  if (!validation.isValid) {
    isNavigatingAway.value = true;
    await router.replace({ name: "/conversation/new/create/" });
    return;
  }

  await refreshSurveyCreationAccess();

  // Fetch GitHub preview if this is a GitHub-linked conversation
  if (conversationDraft.value.externalSourceConfig !== null) {
    await fetchGitHubPreview();
  }
});

function onLoginCallback() {
  createNewConversationIntention();
}

async function fetchGitHubPreview(): Promise<void> {
  const config = conversationDraft.value.externalSourceConfig;
  if (config === null) return;

  isLoadingPreview.value = true;
  previewError.value = false;
  githubPreviewItems.value = [];

  const response = await previewGitHubIssues({
    repository: config.repository,
    label: config.label,
  });

  if (response.status === "success") {
    githubPreviewItems.value = response.data.issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      htmlUrl: issue.htmlUrl,
    }));
  } else {
    previewError.value = true;
  }

  isLoadingPreview.value = false;
}

async function retryPreview(): Promise<void> {
  await fetchGitHubPreview();
}

function setOpinionRef(
  el: Element | ComponentPublicInstance | null,
  index: number
): void {
  if (el) {
    // Handle Vue component instance
    if ("$el" in el) {
      opinionRefs.value[index] = el.$el as HTMLElement;
      // Store component instance for calling focus method
      opinionComponentRefs.value[index] = el as InstanceType<
        typeof SeedOpinionItem
      >;
    } else {
      // Handle direct DOM element
      opinionRefs.value[index] = el as HTMLElement;
    }
  }
}

function clearOpinionError(index: number) {
  if (opinionErrors.value[index]) {
    delete opinionErrors.value[index];
  }
}

// "Generating" followed by one to three dots while a request is running.
const generatingDotCount = ref(1);
let generatingDotsTimer: ReturnType<typeof setInterval> | undefined;
watch(isGeneratingSuggestions, (isGenerating) => {
  clearInterval(generatingDotsTimer);
  generatingDotCount.value = 1;
  if (isGenerating) {
    generatingDotsTimer = setInterval(() => {
      generatingDotCount.value = (generatingDotCount.value % 3) + 1;
    }, 400);
  }
});
onBeforeUnmount(() => {
  clearInterval(generatingDotsTimer);
});
// Dots not shown yet are replaced by punctuation spaces (U+2008, as wide as a period),
// so the button keeps the same width while the dots move.
const generatingLabel = computed(
  () =>
    `${t("aiSuggestionsGenerating")}${".".repeat(generatingDotCount.value)}${"\u2008".repeat(3 - generatingDotCount.value)}`
);
const aiSuggestionsButtonLabel = computed(() =>
  isGeneratingSuggestions.value
    ? generatingLabel.value
    : t("aiSuggestionsButton")
);
const generateMoreLabel = computed(() =>
  isGeneratingSuggestions.value
    ? generatingLabel.value
    : t("aiSuggestionsGenerateMore")
);

async function generateSuggestions(): Promise<void> {
  if (isSubmitButtonLoading.value) {
    return;
  }
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  const result = await generate();
  if (result.success) {
    return;
  }
  switch (result.reason) {
    case "not_available":
      showNotifyMessage(t("aiSuggestionsNotAvailable"));
      break;
    case "rate_limited":
      showNotifyMessage(t("aiSuggestionsRateLimited"));
      break;
    case "failed":
      showNotifyMessage(t("aiSuggestionsFailed"));
      break;
  }
}

async function scrollToOpinion({
  index,
  focus,
}: {
  index: number;
  focus: boolean;
}): Promise<void> {
  // Wait for Vue to render the new element
  await nextTick();

  const element = opinionRefs.value[index];
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  if (focus) {
    const component = opinionComponentRefs.value[index];
    if (component) {
      component.focus();
    }
  }
}

async function addSuggestion(suggestionId: string): Promise<void> {
  if (isSubmitButtonLoading.value) {
    return;
  }
  const newIndex = addSuggestionToStatements(suggestionId);
  if (newIndex !== undefined) {
    await scrollToOpinion({ index: newIndex, focus: false });
  }
}

async function addNewOpinion(): Promise<void> {
  if (isSubmitButtonLoading.value) {
    return;
  }

  conversationDraft.value.seedOpinions.push("");
  await scrollToOpinion({
    index: conversationDraft.value.seedOpinions.length - 1,
    focus: true,
  });
}

function removeOpinion(index: number): void {
  if (isSubmitButtonLoading.value) {
    return;
  }

  conversationDraft.value.seedOpinions.splice(index, 1);
  // Clear any error for this index
  clearOpinionError(index);
  // Shift errors for indices that come after the removed one
  const newErrors: Record<number, string> = {};
  Object.keys(opinionErrors.value).forEach((key) => {
    const idx = parseInt(key);
    if (idx < index) {
      newErrors[idx] = opinionErrors.value[idx];
    } else if (idx > index) {
      newErrors[idx - 1] = opinionErrors.value[idx];
    }
  });
  opinionErrors.value = newErrors;

  // Clean up opinionRefs to prevent memory leaks
  const newRefs: Record<number, HTMLElement> = {};
  Object.keys(opinionRefs.value).forEach((key) => {
    const idx = parseInt(key);
    if (idx < index) {
      newRefs[idx] = opinionRefs.value[idx];
    } else if (idx > index) {
      newRefs[idx - 1] = opinionRefs.value[idx];
    }
    // Skip the removed index (idx === index) to clean it up
  });
  opinionRefs.value = newRefs;

  // Clean up opinionComponentRefs to prevent memory leaks
  const newComponentRefs: Record<
    number,
    InstanceType<typeof SeedOpinionItem>
  > = {};
  Object.keys(opinionComponentRefs.value).forEach((key) => {
    const idx = parseInt(key);
    if (idx < index) {
      newComponentRefs[idx] = opinionComponentRefs.value[idx];
    } else if (idx > index) {
      newComponentRefs[idx - 1] = opinionComponentRefs.value[idx];
    }
    // Skip the removed index (idx === index) to clean it up
  });
  opinionComponentRefs.value = newComponentRefs;
}

function validateSeedOpinions(): boolean {
  // GitHub-linked conversations don't need manual seeds
  if (conversationDraft.value.externalSourceConfig !== null) {
    return true;
  }

  const validationResults = conversationDraft.value.seedOpinions.map((html) =>
    validateRichTextInput({ htmlString: html, mode: "opinion" })
  );
  const visibleOpinionCount = validationResults.filter(
    (result) => result.success || result.reason !== "plain_text_empty"
  ).length;

  if (isMaxDiffDraft.value && visibleOpinionCount < 2) {
    showNotifyMessage(t("needMinimumForMaxDiff"));
    return false;
  }

  // Clear previous errors
  opinionErrors.value = {};

  let hasErrors = false;
  let firstErrorIndex = -1;

  const comparisonKeys = validationResults.map((result) =>
    result.success ? result.plainText.trim().toLocaleLowerCase() : undefined
  );
  const comparisonKeyCounts = new Map<string, number>();
  for (const key of comparisonKeys) {
    if (key !== undefined) {
      comparisonKeyCounts.set(key, (comparisonKeyCounts.get(key) ?? 0) + 1);
    }
  }

  validationResults.forEach((validation, index) => {
    if (!validation.success) {
      opinionErrors.value[index] = getOpinionValidationMessage(validation);
      hasErrors = true;
      if (firstErrorIndex === -1) firstErrorIndex = index;
      return;
    }

    const comparisonKey = comparisonKeys[index];
    if (
      comparisonKey !== undefined &&
      (comparisonKeyCounts.get(comparisonKey) ?? 0) > 1
    ) {
      opinionErrors.value[index] = t("opinionDuplicate");
      hasErrors = true;
      if (firstErrorIndex === -1) firstErrorIndex = index;
    }
  });

  // If there are errors, scroll to the first problematic item
  if (hasErrors && firstErrorIndex !== -1) {
    setTimeout(() => {
      const errorElement = opinionRefs.value[firstErrorIndex];
      if (errorElement) {
        errorElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  }

  return !hasErrors;
}

function getOpinionValidationMessage({
  reason,
  count,
  limit,
}: {
  reason: RichTextValidationFailure["reason"];
  count: RichTextValidationFailure["count"];
  limit: RichTextValidationFailure["limit"];
}): string {
  if (reason === "plain_text_empty") {
    return t("opinionCannotBeEmpty");
  }

  if (reason === "html_too_long") {
    return t("errorCreatingConversation");
  }

  return t("opinionExceedsLimit")
    .replaceAll("{limit}", limit.toString())
    .replaceAll("{count}", count.toString());
}

function showSeedOpinionFailure(failure: SeedOpinionCreateFailure): void {
  opinionErrors.value[failure.index] = getOpinionValidationMessage(failure);
  setTimeout(() => {
    const errorElement = opinionRefs.value[failure.index];
    errorElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    opinionComponentRefs.value[failure.index]?.focus();
  }, 100);
}

async function onSubmit() {
  if (isSubmitButtonLoading.value) {
    return;
  }

  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  if (!validateSeedOpinions()) {
    return;
  }

  isSubmitButtonLoading.value = true;
  const canCreateSurvey = await refreshSurveyCreationAccess();

  if (canCreateSurvey) {
    routeGuard.value?.unlockRoute();
    isNavigatingAway.value = true;
    await nextTick();
    await router.push({
      name: "/conversation/new/survey/",
    });
    return;
  }

  const wasPublished = await publishConversationDraft({
    conversationDraft: conversationDraft.value,
    surveyConfig: null,
    invalidSurveyMessage: t("errorCreatingConversation"),
    defaultErrorMessage: t("errorCreatingConversation"),
    onSeedOpinionFailure: showSeedOpinionFailure,
    beforeSuccessNavigation: () => {
      routeGuard.value?.unlockRoute();
      isNavigatingAway.value = true;
    },
  });

  if (!wasPublished) {
    isSubmitButtonLoading.value = false;
  }
}
</script>

<style scoped lang="scss">
.container {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.next-button:focus-visible {
  outline: 3px solid rgba(107, 78, 255, 0.4);
  outline-offset: 3px;
}

.seed-opinions-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
  margin: 0;
  color: #333;
}

.section-description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}

.shortcut-hint {
  display: block;
  margin-block-start: 0.5rem;
  color: $color-text-weak;
  font-size: 0.85rem;
}

.add-button-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.75rem;
}

// Same layout as a statement row (SeedOpinionItem): the box, then the room its
// delete button takes.
.suggestions-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.suggestions-row-box {
  flex: 1;
  min-width: 0;
}

.suggestions-row-spacer {
  flex-shrink: 0;
  visibility: hidden;
}

// Grey while a request is running, after a not-confident answer, and above the
// statement limit.
.add-button-container .ai-suggestions-button:disabled {
  background-color: #e6e6e6;
  color: #7a7a7a;
}

.opinions-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: $color-text-weak;
  padding: 1rem 0;
}

.github-preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: $app-background-color;
  border-radius: 8px;
}

.preview-item-title {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  color: #333;
}

.preview-item-link {
  color: $color-text-weak;
  flex-shrink: 0;

  &:hover {
    color: $primary;
  }
}

.preview-empty {
  color: $color-text-weak;
  font-size: 0.9rem;
  padding: 1rem 0;
}
</style>
