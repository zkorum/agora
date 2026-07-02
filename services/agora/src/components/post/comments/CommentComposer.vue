<template>
  <div v-if="!hideComposerForRoute" ref="target">
    <div class="container borderStyle" :class="{ focused: innerFocus }">
      <Editor
        v-if="isEditorMounted"
        ref="editorRef"
        v-model="opinionBody"
        v-model:plain-text="opinionPlainText"
        :placeholder="innerFocus ? t('placeholderExpanded') : t('placeholder')"
        :min-height="innerFocus ? '6rem' : '2rem'"
        :show-toolbar="innerFocus"
        :single-line="false"
        :disabled="false"
        :max-length="MAX_LENGTH_OPINION"
        :show-character-count="innerFocus"
        @update:character-count="onCharacterCountUpdate"
        @update:is-over-limit="(v: boolean) => (isOverLimit = v)"
        @manually-focused="editorFocused()"
      />

      <div v-if="validationWarning" class="validation-warning">
        <q-icon name="mdi-alert-circle" class="warning-icon" />
        {{ validationWarning }}
      </div>

      <div v-if="innerFocus" class="actionButtonCluster">
        <input ref="dummyInput" type="button" class="dummyInputStyle" />

        <ZKButton
          button-type="icon"
          aria-label="Opinion writing guidelines"
          @click="showGuidelinesDialog = true"
        >
          <ZKIcon
            color="#6d6a74"
            name="mdi-information-outline"
            size="1.2rem"
          />
        </ZKButton>

        <PrimeButton
          :label="t('postButton')"
          severity="primary"
          :disabled="
            isOverLimit ||
            characterCount === 0 ||
            isSubmissionLoading ||
            isComposerDisabled
          "
          :loading="isSubmissionLoading"
          @click="submitPostClicked()"
        />
      </div>
    </div>

    <ExitRoutePrompt
      v-model="showExitDialog"
      :title="t('exitPromptTitle')"
      :description="t('exitPromptDescription')"
      :save-draft="saveDraft"
      :no-save-draft="noSaveDraft"
    />

    <PreParticipationIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="newOpinion"
      :conversation-slug-id="props.postSlugId"
      :requires-zupass-event-slug="props.requiresEventTicket"
      :needs-auth="needsLogin"
      :participation-mode="props.participationMode"
    />

    <OpinionWritingGuidelinesDialog v-model="showGuidelinesDialog" />
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { onClickOutside, useWindowScroll } from "@vueuse/core";
import Button from "primevue/button";
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useIdleMount } from "src/composables/ui/useIdleMount";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import type {
  EventSlug,
  OpinionItem,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useUserStore } from "src/stores/user";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useInvalidateConversationQuery } from "src/utils/api/post/useConversationQuery";
import {
  type RouteGuardDestination,
  useRouteGuard,
} from "src/utils/component/routing/routeGuard";
import {
  type ConversationRouteContext,
  isConversationOnboardingRoutePath,
  isConversationRoutePath,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import {
  type CommentComposerTranslations,
  commentComposerTranslations,
} from "./CommentComposer.i18n";
import OpinionWritingGuidelinesDialog from "./OpinionWritingGuidelinesDialog.vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const props = defineProps<{
  postSlugId: string;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  surveyGate?: SurveyGateSummary;
  isComposerDisabled: boolean;
  conversationRouteContext?: ConversationRouteContext;
}>();

const emit = defineEmits<{
  submittedComment: [
    data: {
      opinionSlugId: string;
      opinionItem: OpinionItem;
      authStateChanged: boolean;
      needsCacheRefresh: boolean;
    },
  ];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

const conversationRouteContext = computed(
  () => props.conversationRouteContext ?? normalConversationRouteContext
);

const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);

type RouteName = keyof RouteNamedMap;

const sameConversationTabRouteNames = [
  "/conversation/[postSlugId]",
  "/conversation/[postSlugId]/",
  "/conversation/[postSlugId]/analysis",
  "/conversation/[postSlugId].embed",
  "/conversation/[postSlugId].embed/",
  "/conversation/[postSlugId].embed/analysis",
  "/project/[projectSlug]/conversation/[postSlugId]",
  "/project/[projectSlug]/conversation/[postSlugId]/",
  "/project/[projectSlug]/conversation/[postSlugId]/analysis",
] satisfies readonly RouteName[];

const draftAutoSaveRouteNames = [
  "/welcome/",
  "/conversation/[conversationSlugId]/report",
  "/project/[projectSlug]/conversation/[postSlugId]/report",
  "/verify/email/",
  "/verify/email-code/",
  "/verify/hard/",
  "/verify/identity/",
  "/verify/passport/",
  "/verify/phone/",
  "/verify/phone-code/",
  "/conversation/[postSlugId].onboarding",
  "/conversation/[postSlugId].onboarding/",
  "/conversation/[postSlugId].onboarding/complete",
  "/conversation/[postSlugId].onboarding/question.[questionSlugId]",
  "/conversation/[postSlugId].onboarding/summary",
  "/conversation/[postSlugId].onboarding/verify",
  "/conversation/[postSlugId].onboarding/verify/email",
  "/conversation/[postSlugId].onboarding/verify/email-code",
  "/conversation/[postSlugId].onboarding/verify/hard",
  "/conversation/[postSlugId].onboarding/verify/identity",
  "/conversation/[postSlugId].onboarding/verify/passport",
  "/conversation/[postSlugId].onboarding/verify/phone",
  "/conversation/[postSlugId].onboarding/verify/phone-code",
  "/conversation/[postSlugId].onboarding/verify/ticket",
] satisfies readonly RouteName[];

const route = useRoute();

// Defer Editor mounting until browser is idle to improve initial page load performance
const { isMounted: isEditorMounted } = useIdleMount({});

const dummyInput = ref<HTMLInputElement>();

const { saveOpinionDraft, getOpinionDraft, deleteOpinionDraft } =
  useNewOpinionDraftsStore();
const userStore = useUserStore();

const { createNewOpinionIntention, clearNewOpinionIntention } =
  useLoginIntentionStore();

const { createNewComment } = useBackendCommentApi();
const queryClient = useQueryClient();

const { showNotifyMessage } = useNotify();
const { needsAuth: isAuthBlocked, shouldOpenParticipationModal } =
  useParticipationGate({
    conversationSlugId: computed(() => props.postSlugId),
    participationMode: computed(() => props.participationMode),
    requiresEventTicket: computed(() => props.requiresEventTicket),
    surveyGate: computed(() => props.surveyGate),
  });

const { invalidateConversation } = useInvalidateConversationQuery();

type UserVoteCacheItem = {
  opinionSlugId: string;
  votingAction: string;
};

function addCreatedOpinionVoteToCache({
  opinionSlugId,
}: {
  opinionSlugId: string;
}): void {
  const userVotesKey = ["userVotes", props.postSlugId];

  queryClient.setQueryData<UserVoteCacheItem[]>(userVotesKey, (oldData) => {
    const filteredVotes =
      oldData?.filter((vote) => vote.opinionSlugId !== opinionSlugId) ?? [];
    return [...filteredVotes, { opinionSlugId, votingAction: "agree" }];
  });
}

// Check if user needs login/verification based on participation mode
const needsLogin = computed(() => {
  return isAuthBlocked.value;
});

const hideComposerForRoute = computed(() => {
  const routePath = route.path;
  return (
    !isConversationRoutePath(routePath) ||
    isConversationOnboardingRoutePath(routePath)
  );
});

const characterCount = ref(0);
const isOverLimit = ref(false);

const innerFocus = ref(false);

const target = useTemplateRef<HTMLElement>("target");
onClickOutside(target, () => {
  innerFocus.value = false;
});

const newOpinionIntention = clearNewOpinionIntention();
if (newOpinionIntention.enabled) {
  innerFocus.value = true;
}

const opinionBody = ref(newOpinionIntention.opinionBody);
const opinionPlainText = ref("");

const showLoginDialog = ref(false);
const showGuidelinesDialog = ref(false);

// Template ref for Editor component
const editorRef = ref<{ focus: () => void }>();

// Handle guidelines dialog close - restore focus to editor
function handleGuidelinesDialogClose() {
  void nextTick(() => {
    editorRef.value?.focus();
  });
}

// Watch for guidelines dialog close to restore focus
watch(showGuidelinesDialog, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    handleGuidelinesDialogClose();
  }
});

watch(opinionBody, () => {
  checkWordCount();
  if (characterCount.value === 0) {
    deleteOpinionDraft(props.postSlugId);
  }
});

// Validation warning for multiple ideas
const validationWarning = computed(() => {
  const htmlContent = opinionBody.value;

  // Check 1: HTML lists (bullet points or numbered lists)
  const hasLists = /<[uo]l>/i.test(htmlContent) || /<li>/i.test(htmlContent);
  if (hasLists) {
    return t("validationWarningMultipleIdeas");
  }

  // Convert HTML to plain text for further checks
  const plainText = htmlContent
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Too short to analyze meaningfully
  if (plainText.length < 20) {
    return null;
  }

  // Check 2: Multiple sentences (high confidence indicator of multiple ideas)
  const sentenceEndings = plainText.match(/[.!?]+\s+[A-Z]/g);
  if (sentenceEndings && sentenceEndings.length >= 1) {
    return t("validationWarningMultipleIdeas");
  }

  // Check 3: Multiple coordinating conjunctions (suggests compound ideas)
  const coordinatingConjunctions = plainText
    .toLowerCase()
    .match(/\b(and|but|or|yet|nor)\b/g);

  if (
    coordinatingConjunctions &&
    coordinatingConjunctions.length >= 2 &&
    plainText.length > 50
  ) {
    return t("validationWarningMultipleIdeas");
  }

  // Check 4: Complexity indicators (many clauses or transition words)
  const commaCount = (plainText.match(/,/g) || []).length;
  const clauseIndicators = plainText
    .toLowerCase()
    .match(
      /\b(however|moreover|furthermore|therefore|thus|consequently|although|whereas|while|because|since)\b/g
    );

  if (commaCount >= 3 || (clauseIndicators && clauseIndicators.length >= 2)) {
    return t("validationWarningMultipleIdeas");
  }

  return null;
});

const {
  lockRoute,
  unlockRoute,
  showExitDialog,
  proceedWithNavigation,
  isRouteLockedCheck,
} = useRouteGuard(() => characterCount.value > 0, onBeforeRouteLeaveCallback);

const { y: yScroll } = useWindowScroll();

let disableAutocollapse = false;

const isSubmissionLoading = ref(false);

const { t } = useComponentI18n<CommentComposerTranslations>(
  commentComposerTranslations
);

onMounted(() => {
  lockRoute();

  const savedDraft = getOpinionDraft(props.postSlugId);
  if (savedDraft) {
    opinionBody.value = savedDraft.body;
  }

  checkWordCount();
});

watch(yScroll, () => {
  if (disableAutocollapse === false) {
    innerFocus.value = false;
    dummyInput.value?.focus();
  }
});

async function saveDraft() {
  saveOpinionDraft(props.postSlugId, opinionBody.value);
  await proceedWithNavigation(() => {});
}

async function noSaveDraft() {
  deleteOpinionDraft(props.postSlugId);
  await proceedWithNavigation(() => {});
}

function routeNameMatches({
  routeName,
  routes,
}: {
  routeName: string;
  routes: readonly RouteName[];
}): boolean {
  return routes.some((route) => route === routeName);
}

function isSameConversationTabRoute(to: RouteGuardDestination): boolean {
  if (typeof to.name !== "string") {
    return false;
  }

  if (
    !routeNameMatches({
      routeName: to.name,
      routes: sameConversationTabRouteNames,
    })
  ) {
    return false;
  }

  const postSlugId = to.params.postSlugId;
  return postSlugId === props.postSlugId;
}

function onLoginCallback() {
  // Save draft before any async operations
  saveOpinionDraft(props.postSlugId, opinionBody.value);

  // Don't unlock route yet - keep draft protected until verification completes
  createNewOpinionIntention(
    props.postSlugId,
    opinionBody.value,
    conversationRouteContext.value,
    props.requiresEventTicket
  );

  unlockRoute();
}

function discardDraft(): void {
  opinionBody.value = "";
  characterCount.value = 0;
  innerFocus.value = false;
  deleteOpinionDraft(props.postSlugId);
  unlockRoute();
}

defineExpose({
  discardDraft,
});

function onBeforeRouteLeaveCallback(to: RouteGuardDestination): boolean {
  if (characterCount.value === 0) {
    deleteOpinionDraft(props.postSlugId);
    return true;
  }

  if (!isRouteLockedCheck()) {
    return true;
  }

  if (isSameConversationTabRoute(to)) {
    return true;
  }

  if (
    typeof to.name === "string" &&
    routeNameMatches({ routeName: to.name, routes: draftAutoSaveRouteNames })
  ) {
    saveOpinionDraft(props.postSlugId, opinionBody.value);
    return true;
  }

  return false;
}

function editorFocused() {
  // Disable the auto collapse for a few seconds for mobile
  // because mobile keyboard will trigger it
  disableAutocollapse = true;
  innerFocus.value = true;

  setTimeout(function () {
    disableAutocollapse = false;
  }, 1000);
}

function checkWordCount() {
  characterCount.value = validateHtmlStringCharacterCount(
    opinionBody.value,
    "opinion"
  ).characterCount;
}

function onCharacterCountUpdate(count: number) {
  characterCount.value = count;
}

async function submitPostClicked() {
  if (await shouldOpenParticipationModal()) {
    showLoginDialog.value = true;
    return;
  }

  isSubmissionLoading.value = true;

  try {
    const response = await createNewComment(
      opinionBody.value,
      opinionPlainText.value,
      props.postSlugId
    );

    if (response.success) {
      addCreatedOpinionVoteToCache({
        opinionSlugId: response.opinionSlugId,
      });

      // Emit to parent to refresh and highlight the opinion
      emit("submittedComment", {
        opinionSlugId: response.opinionSlugId,
        opinionItem: response.opinionItem,
        authStateChanged: response.authStateChanged ?? false,
        needsCacheRefresh: response.needsCacheRefresh ?? false,
      });

      isSubmissionLoading.value = false;
      innerFocus.value = false;
      opinionBody.value = "";
      characterCount.value = 0;
      unlockRoute(); // Clear the draft since we successfully submitted
      deleteOpinionDraft(props.postSlugId);
    } else {
      isSubmissionLoading.value = false;
      // Business logic failure
      if (response.reason) {
        switch (response.reason) {
          case "conversation_locked":
            showNotifyMessage(t("conversationLockedError"));
            break;
          case "conversation_closed":
            // Show error message but keep text so user can copy it
            showNotifyMessage(t("conversationClosedError"));
            // Invalidate conversation to refresh UI and show disabled state
            invalidateConversation(props.postSlugId);
            // Don't clear opinionBody or unlock route - preserve the text
            break;
          case "event_ticket_required":
            // Backend says ticket required, but our local state might be stale
            // Refresh user profile to get latest verified tickets, then show dialog
            await userStore.loadUserProfile();
            showLoginDialog.value = true;
            break;
          case "account_required":
          case "strong_verification_required":
          case "email_verification_required":
            // User lacks required verification for this conversation
            showLoginDialog.value = true;
            break;
          case "survey_required":
          case "survey_outdated":
            showLoginDialog.value = true;
            break;
          case "plain_text_too_long":
          case "html_too_long":
            showNotifyMessage(t("createOpinionError"));
            break;
        }
      }
    }
  } catch {
    // Technical errors (network, server errors, etc.) are handled by TanStack Query
    isSubmissionLoading.value = false;
    showNotifyMessage(t("createOpinionError"));
  }
}
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  background-color: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.actionBar {
  display: flex;
  padding: 0.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: $color-text-weak;
}

.actionButtonCluster {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
}

.borderStyle {
  border-radius: 20px;
  padding: 0.5rem;
  border-color: rgba(255, 255, 255, 0.3);
  border-style: solid;
  border-width: 1px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &.focused {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
}

.dummyInputStyle {
  border: none;
  background-color: transparent;
  width: 1px;
  height: 1px;
}

.validation-warning {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  background-color: #fff9e6;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #92400e;
}

.warning-icon {
  color: #f59e0b;
  font-size: 1.1rem;
  margin-right: 0.5rem;
}
</style>
