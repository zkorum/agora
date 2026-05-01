<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive && !isNavigatingAway" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left>
          <BackButton :fallback-route="{ name: '/conversation/new/seed/' }" @click="handleBack" />
        </template>
        <template #right>
          <PrimeButton
            :label="t('publishButton')"
            :loading="isSubmitButtonLoading"
            @click="publishConversation"
          />
        </template>
      </DefaultMenuBar>
    </Teleport>

    <div class="container">
      <SurveyConfigEditor
        v-model:survey-config="surveyConfig"
        :texts="surveyEditorTexts"
        :display-language="locale"
        :show-actions="isSurveyAllowed"
        :show-validation-errors="surveyValidationErrorMessage !== null"
        @clear-validation-error="clearSurveyValidationError"
      />
    </div>

    <NewConversationRouteGuard
      ref="routeGuard"
      :allowed-routes="['/conversation/new/create/', '/conversation/new/seed/', '/welcome/']"
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
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import SurveyConfigEditor from "src/components/survey/SurveyConfigEditor.vue";
import { useConversationDraft } from "src/composables/conversation/draft";
import { usePublishConversationDraft } from "src/composables/conversation/usePublishConversationDraft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  checkFeatureAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import {
  isHistoryBackToPath,
  navigateBackOrReplace,
} from "src/utils/nav/historyBack";
import { processEnv } from "src/utils/processEnv";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyStepTranslations,
  conversationSurveyStepTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const router = useRouter();
const { isLoggedIn, userId } = storeToRefs(useAuthenticationStore());
const { t, locale } = useComponentI18n<ConversationSurveyStepTranslations>(
  conversationSurveyStepTranslations
);

const { validateForReview, isDraftModified, resetDraft, surveyConfig } =
  useConversationDraft({ syncToStore: true });
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());
const { publishConversationDraft } = usePublishConversationDraft();
const { createNewConversationIntention } = useLoginIntentionStore();

const routeGuard = ref<{ unlockRoute: () => void } | undefined>(undefined);
const showLoginDialog = ref(false);
const isSubmitButtonLoading = ref(false);
const isNavigatingAway = ref(false);
const surveyValidationErrorMessage = ref<string | null>(null);

const isSurveyAllowed = computed(() => {
  const result = checkFeatureAccess({
    featureEnabled: processEnv.VITE_SURVEY_ENABLED === "true",
    isOrgOnly: processEnv.VITE_IS_SURVEY_ORG_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_SURVEY_ALLOWED_ORGS ?? DEFAULT_FEATURE_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_SURVEY_ALLOWED_USERS ?? DEFAULT_FEATURE_ALLOWED_USERS,
    postAsOrganization: conversationDraft.value.postAs.postAsOrganization,
    organizationName: conversationDraft.value.postAs.organizationName,
    userId: userId.value ?? "",
  });

  return result.allowed;
});
const surveyEditorTexts = computed(() => ({
  title: t("pageTitle"),
  description: t("pageDescription"),
  requiredSurveyToggleHint: t("requiredSurveyToggleHint"),
  noQuestionsTitle: t("noQuestionsTitle"),
  noQuestionsDescription: t("noQuestionsDescription"),
  questionTitle: ({ number }: { number: number }) =>
    t("questionLabel", { number }),
  optionalLabel: t("optionalLabel"),
  requiredLabel: t("requiredLabel"),
  removeQuestionLabel: t("removeQuestionLabel"),
  questionTypeLabel: t("questionTypeLabel"),
  typeChoice: t("typeChoice"),
  typeFreeText: t("typeFreeText"),
  choiceDisplayLabel: t("choiceDisplayLabel"),
  choiceDisplayAuto: t("choiceDisplayAuto"),
  choiceDisplayList: t("choiceDisplayList"),
  choiceDisplayDropdown: t("choiceDisplayDropdown"),
  questionPromptLabel: t("questionPromptLabel"),
  minSelectionsLabel: t("minSelectionsLabel"),
  maxSelectionsLabel: t("maxSelectionsLabel"),
  minTextLengthLabel: t("minTextLengthLabel"),
  maxTextLengthLabel: t("maxTextLengthLabel"),
  freeTextHelp: t("freeTextHelp"),
  optionLabel: ({ number }: { number: number }) => t("optionLabel", { number }),
  addOptionLabel: t("addOptionLabel"),
  addQuestionLabel: t("addQuestionButton"),
  cancelLabel: t("cancelLabel"),
  confirmRemoveQuestionMessage: t("confirmRemoveQuestionMessage"),
  confirmRemoveOptionMessage: t("confirmRemoveOptionMessage"),
  confirmRemoveQuestionButtonLabel: t("confirmRemoveQuestionButtonLabel"),
  confirmRemoveOptionButtonLabel: t("confirmRemoveOptionButtonLabel"),
  largeOptionCountWarning: ({
    count,
    threshold,
  }: {
    count: number;
    threshold: number;
  }) => t("largeOptionCountWarning", { count, threshold }),
}));

onMounted(async () => {
  if (!isSurveyAllowed.value) {
    routeGuard.value?.unlockRoute();
    isNavigatingAway.value = true;
    await router.replace({ name: "/conversation/new/seed/" });
  }
});

function clearSurveyValidationError(): void {
  surveyValidationErrorMessage.value = null;
}

function showSurveyValidationError(): void {
  surveyValidationErrorMessage.value = t("surveyValidationError");
}

function onLoginCallback() {
  createNewConversationIntention();
}

async function handleBack(event: MouseEvent): Promise<void> {
  event.preventDefault();
  isNavigatingAway.value = true;

  const fallbackRoute = { name: "/conversation/new/seed/" } as const;
  await navigateBackOrReplace({
    router,
    fallbackRoute,
    shouldNavigateBack: isHistoryBackToPath({
      historyBack: window.history.state?.back,
      expectedPath: "/conversation/new/seed/",
    }),
  });
}

async function publishConversation(): Promise<void> {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  const validation = validateForReview();
  if (!validation.isValid) {
    routeGuard.value?.unlockRoute();
    isNavigatingAway.value = true;
    await router.replace({ name: "/conversation/new/create/" });
    return;
  }

  isSubmitButtonLoading.value = true;

  const wasPublished = await publishConversationDraft({
    conversationDraft: conversationDraft.value,
    surveyConfig: surveyConfig.value,
    invalidSurveyMessage: t("surveyValidationError"),
    defaultErrorMessage: t("publishError"),
    onInvalidSurvey: showSurveyValidationError,
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
  padding-top: 0.5rem;
}
</style>
