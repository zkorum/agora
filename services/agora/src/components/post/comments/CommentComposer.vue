<template>
  <div ref="target">
    <div class="container borderStyle" :class="{ focused: innerFocus }">
      <Editor
        v-model="opinionBody"
        :placeholder="t('placeholder')"
        :min-height="innerFocus ? '6rem' : '2rem'"
        :show-toolbar="innerFocus"
        :disabled="isPostLocked"
        @update:model-value="checkWordCount()"
        @manually-focused="editorFocused()"
      />

      <div v-if="innerFocus" class="actionButtonCluster">
        <input ref="dummyInput" type="button" class="dummyInputStyle" />

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
            isVerifyingZupass
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
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useWindowScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import Editor from "src/components/editor/Editor.vue";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import type { EventSlug } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useUserStore } from "src/stores/user";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import type { RouteLocationNormalized } from "vue-router";

import {
  type CommentComposerTranslations,
  commentComposerTranslations,
} from "./CommentComposer.i18n";

const props = defineProps<{
  postSlugId: string;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
  isPostLocked: boolean;
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

const dummyInput = ref<HTMLInputElement>();

const { saveOpinionDraft, getOpinionDraft, deleteOpinionDraft } =
  useNewOpinionDraftsStore();
const authStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authStore);
const userStore = useUserStore();
const { verifiedEventTickets } = storeToRefs(userStore);

const { createNewOpinionIntention, clearNewOpinionIntention } =
  useLoginIntentionStore();

const { createNewComment } = useBackendCommentApi();

const { showNotifyMessage } = useNotify();

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
  if (disableAutocollapse == false) {
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

  console.log("[CommentComposer] onLoginCallback", {
    needsLogin,
    hasZupassRequirement,
    isLoggedIn: isLoggedIn.value,
  });

  // If user just needs Zupass verification (no login required), trigger it inline
  if (!needsLogin && hasZupassRequirement) {
    console.log("[CommentComposer] Triggering inline Zupass verification");
    await handleZupassVerification();
  } else {
    // Otherwise, unlock route so user can navigate to login
    console.log("[CommentComposer] Unlocking route for login navigation");
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
  // Disable the auto collapge for a few seconds for mobile
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
  console.log("[CommentComposer] handleZupassVerification called", {
    requiresEventTicket: props.requiresEventTicket,
  });

  if (props.requiresEventTicket === undefined) {
    console.log("[CommentComposer] No event ticket required, returning");
    return;
  }

  console.log("[CommentComposer] Starting verifyTicket call");
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
    console.log("[CommentComposer] Emitting ticketVerified event", {
      userIdChanged: result.userIdChanged,
      needsCacheRefresh: result.needsCacheRefresh,
    });
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
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
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
</style>
