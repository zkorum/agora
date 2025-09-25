<template>
  <div ref="target">
    <div class="container borderStyle">
      <ZKEditor
        v-model="opinionBody"
        :placeholder="t('placeholder')"
        :min-height="innerFocus ? '6rem' : '2rem'"
        :show-toolbar="innerFocus"
        :add-background-color="true"
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

        <q-separator vertical inset />

        <ZKButton
          button-type="largeButton"
          :label="t('postButton')"
          color="primary"
          :disable="
            characterProgress > 100 ||
            characterProgress == 0 ||
            isSubmissionLoading
          "
          :loading="isSubmissionLoading"
          @click="submitPostClicked()"
        />
      </div>
    </div>

    <ExitRoutePrompt
      v-model="showExitDialog"
      title="Save opinion as draft?"
      description="Your draft opinion will be here when you return."
      :save-draft="saveDraft"
      :no-save-draft="noSaveDraft"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newOpinion'"
    />
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useWindowScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import type { RouteLocationNormalized } from "vue-router";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  commentComposerTranslations,
  type CommentComposerTranslations,
} from "./CommentComposer.i18n";

const emit = defineEmits<{
  (e: "submittedComment", conversationSlugId: string): void;
}>();

const props = defineProps<{
  postSlugId: string;
  loginRequiredToParticipate: boolean;
}>();

const dummyInput = ref<HTMLInputElement>();

const { saveOpinionDraft, getOpinionDraft, deleteOpinionDraft } =
  useNewOpinionDraftsStore();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const { createNewOpinionIntention, clearNewOpinionIntention } =
  useLoginIntentionStore();

const { createNewComment } = useBackendCommentApi();

const { showNotifyMessage } = useNotify();

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
  return (characterCount.value / MAX_LENGTH_OPINION) * 100;
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

function onLoginCallback() {
  unlockRoute();
  createNewOpinionIntention(props.postSlugId, opinionBody.value);
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

async function submitPostClicked() {
  if (!isLoggedIn.value && props.loginRequiredToParticipate) {
    showLoginDialog.value = true;
  } else {
    isSubmissionLoading.value = true;

    try {
      const response = await createNewComment(
        opinionBody.value,
        props.postSlugId
      );

      isSubmissionLoading.value = false;

      if (response.success && response.opinionSlugId) {
        // Successfully created comment
        emit("submittedComment", response.opinionSlugId);
        innerFocus.value = false;
        opinionBody.value = "";
        characterCount.value = 0;
        unlockRoute(); // Clear the draft since we successfully submitted
        deleteOpinionDraft(props.postSlugId);
      } else {
        // Business logic failure (e.g., conversation_locked)
        if (response.reason === "conversation_locked") {
          showNotifyMessage(t("conversationLockedError"));
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
  background-color: #e5e5e5;
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
  border-radius: 15px;
  padding: 0.5rem;
  border-color: rgb(222, 222, 222);
  border-style: solid;
  border-width: 1px;
}

.dummyInputStyle {
  border: none;
  background-color: transparent;
  width: 1px;
  height: 1px;
}
</style>
