<template>
  <div ref="target">
    <div class="container borderStyle" :class="{ focused: innerFocus }">
      <Editor
        ref="editorRef"
        v-model="opinionBody"
        :placeholder="innerFocus ? t('placeholderExpanded') : t('placeholder')"
        :min-height="innerFocus ? '6rem' : '2rem'"
        :show-toolbar="innerFocus"
        :single-line="false"
        :max-length="MAX_LENGTH_OPINION"
        :disabled="false"
        @update:model-value="checkWordCount()"
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

        <div v-if="characterProgress > 100">
          {{ MAX_LENGTH_OPINION - characterCount }}
        </div>

        <q-circular-progress
          :value="characterProgress"
          size="1.5rem"
          :thickness="0.3"
        />

        <q-separator v-if="characterProgress > 0" vertical inset />

        <PrimeButton
          :label="t('postButton')"
          severity="primary"
          :disabled="
            characterProgress > 100 ||
            characterProgress == 0 ||
            isSubmissionLoading ||
            isVerifyingZupass ||
            isComposerDisabled
          "
          :loading="isSubmissionLoading || isVerifyingZupass"
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

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="newOpinion"
      :requires-zupass-event-slug="props.requiresEventTicket"
      :login-required-to-participate="props.loginRequiredToParticipate"
    />

    <OpinionWritingGuidelinesDialog v-model="showGuidelinesDialog" />
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useWindowScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTicketVerificationFlow } from "src/composables/zupass/useTicketVerificationFlow";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import type { EventSlug, ExtendedConversation } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useUserStore } from "src/stores/user";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useInvalidateConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useNotify } from "src/utils/ui/notify";
import { computed, defineAsyncComponent, inject, nextTick, onMounted, type Ref, ref, useTemplateRef, watch } from "vue";
import type { RouteLocationNormalized } from "vue-router";

import {
  type CommentComposerTranslations,
  commentComposerTranslations,
} from "./CommentComposer.i18n";
import OpinionWritingGuidelinesDialog from "./OpinionWritingGuidelinesDialog.vue";

const props = defineProps<{
  postSlugId: string;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
}>();

const emit = defineEmits<{
  submittedComment: [
    data: {
      opinionSlugId: string;
      authStateChanged: boolean;
      needsCacheRefresh: boolean;
    },
  ];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

const Editor = defineAsyncComponent(() => import("src/components/editor/Editor.vue"));

const dummyInput = ref<HTMLInputElement>();

const { saveOpinionDraft, getOpinionDraft, deleteOpinionDraft } =
  useNewOpinionDraftsStore();
const authStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authStore);
const userStore = useUserStore();
const { verifiedEventTickets } = storeToRefs(userStore);

// Inject reactive conversation data from parent
const conversationData = inject<Ref<ExtendedConversation> | undefined>("conversationData");

// Compute if composer should be disabled (closed OR locked by moderator)
const isComposerDisabled = computed(() => {
  const data = conversationData?.value;
  if (!data) return false;

  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";

  const isClosed = data.metadata.isClosed;

  return isModeratedAndLocked || isClosed;
});

const { createNewOpinionIntention, clearNewOpinionIntention } =
  useLoginIntentionStore();

const { createNewComment } = useBackendCommentApi();

const { showNotifyMessage } = useNotify();

const { invalidateConversation } = useInvalidateConversationQuery();

// Zupass verification
const { verifyTicket } = useTicketVerificationFlow();
const { isVerifying: isVerifyingZupass } = useZupassVerification();

// Check if opinion submission is locked due to missing event ticket
const isOpinionLocked = computed(() => {
  if (props.requiresEventTicket === undefined) {
    return false;
  }
  const verifiedTicketsArray = Array.from(verifiedEventTickets.value);
  return !verifiedTicketsArray.includes(props.requiresEventTicket);
});

const characterCount = ref(0);

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

  if (coordinatingConjunctions && coordinatingConjunctions.length >= 2 && plainText.length > 50) {
    return t("validationWarningMultipleIdeas");
  }

  // Check 4: Complexity indicators (many clauses or transition words)
  const commaCount = (plainText.match(/,/g) || []).length;
  const clauseIndicators = plainText
    .toLowerCase()
    .match(/\b(however|moreover|furthermore|therefore|thus|consequently|although|whereas|while|because|since)\b/g);

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

const characterProgress = computed(() => {
  const progressPercentage = (characterCount.value / MAX_LENGTH_OPINION) * 100;
  if (progressPercentage < 1 && progressPercentage > 0) {
    return 1;
  } else {
    return progressPercentage;
  }
});

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

async function onLoginCallback() {
  // Save draft before any async operations
  saveOpinionDraft(props.postSlugId, opinionBody.value);

  // Don't unlock route yet - keep draft protected until verification completes
  createNewOpinionIntention(
    props.postSlugId,
    opinionBody.value,
    props.requiresEventTicket
  );

  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const hasZupassRequirement = props.requiresEventTicket !== undefined;

  // If user just needs Zupass verification (no login required), trigger it inline
  if (!needsLogin && hasZupassRequirement) {
    await handleZupassVerification();
  } else {
    // Otherwise, unlock route so user can navigate to login
    unlockRoute();
  }
}

function onBeforeRouteLeaveCallback(_to: RouteLocationNormalized): boolean {
  if (characterCount.value > 0 && isRouteLockedCheck()) {
    return false;
  } else {
    return true;
  }
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

async function handleZupassVerification() {
  if (props.requiresEventTicket === undefined) {
    return;
  }

  // Dialog will close when Zupass iframe is ready (via callback)
  const result = await verifyTicket({
    eventSlug: props.requiresEventTicket,
    onIframeReady: () => {
      // Close dialog as soon as Zupass iframe becomes visible
      showLoginDialog.value = false;
    },
  });

  if (result.success) {
    // Emit to parent so banner gets refreshed
    emit("ticketVerified", {
      userIdChanged: result.userIdChanged,
      needsCacheRefresh: result.needsCacheRefresh,
    });

    // Retry submitting the opinion
    await submitPostClicked();
  }
}

async function submitPostClicked() {
  // Check if user needs login or Zupass verification
  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const needsZupass = isOpinionLocked.value;

  if (needsLogin || needsZupass) {
    showLoginDialog.value = true;
  } else {
    isSubmissionLoading.value = true;

    try {
      const response = await createNewComment(
        opinionBody.value,
        props.postSlugId
      );

      if (response.success && response.opinionSlugId) {
        // Successfully created comment
        // Note: The backend automatically votes "agree" when creating an opinion
        // Wait 1.3 seconds for the vote buffer to flush (buffer flushes every 1 second)
        // This ensures the backend has processed the auto-agree vote before we refresh
        await new Promise((resolve) => setTimeout(resolve, 1300));

        // Emit to parent to refresh and highlight the opinion
        emit("submittedComment", {
          opinionSlugId: response.opinionSlugId,
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
          }
        }
      }
    } catch {
      // Technical errors (network, server errors, etc.) are handled by TanStack Query
      isSubmissionLoading.value = false;
      showNotifyMessage(t("createOpinionError"));
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  background-color: #ffffff;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
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
  justify-content: right;
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
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
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
