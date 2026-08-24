<template>
  <OnboardingLayout
    :back-callback="handleBackToConversation"
    :close-callback="handleBackToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyOnboardingHero
        :conversation-data="conversationData"
        :initial-display-content="conversationDisplayContent"
      />
    </template>

    <template #footer>
      <ErrorRetryBlock
        v-if="summaryLoadState === 'transient_error'"
        compact
        :title="t('emailUpdateSummaryLoadError')"
        :retry-label="t('retryLabel')"
        @retry="loadConversationUpdateSummary"
      />
      <ConversationOnboardingCompleteStep
        v-model:conversation-updates-checked="conversationUpdatesChecked"
        :title="t('title')"
        :description="t('description')"
        :review-answers-label="t('reviewAnswersLabel')"
        :continue-without-saving-label="continueWithoutSavingLabel"
        :show-conversation-updates-preference="
          onboardingPreferenceAction !== undefined
        "
        :scope-kind="conversationUpdateScopeKind"
        :is-saving="isBusy"
        @continue="handleBackToConversation"
        @continue-without-saving="continueWithoutSaving"
        @review-answers="handleReviewAnswers"
      />
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyOnboardingHero from "src/components/onboarding/backgrounds/ConversationSurveyOnboardingHero.vue";
import ConversationOnboardingCompleteStep from "src/components/onboarding/ConversationOnboardingCompleteStep.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import type { ConversationEmailUpdateConversationSummaryResponse } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { getConversationSurveySummaryPath } from "src/utils/survey/navigation";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyCompleteTranslations,
  conversationSurveyCompleteTranslations,
} from "./complete.i18n";

const { t } = useComponentI18n<ConversationSurveyCompleteTranslations>(
  conversationSurveyCompleteTranslations
);
const router = useRouter();
const { exitToConversation } = useConversationOnboardingExit();
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
const conversationEmailUpdatesApi = useBackendConversationEmailUpdatesApi();
const { showNotifyMessage } = useNotify();
const { routeConversationSlugId: conversationSlugId, routeContext } =
  useConversationOnboardingRoute();

const conversationQuery = useConversationQuery({
  conversationSlugId,
  enabled: computed(() => isAuthInitialized.value),
});

const conversationData = computed(
  () => conversationQuery.data.value?.conversationData
);
const conversationDisplayContent = computed(
  () => conversationQuery.data.value?.displayContent
);
const conversationUpdatesChecked = ref(true);
type ConversationEmailUpdateSummarySuccess = Extract<
  ConversationEmailUpdateConversationSummaryResponse,
  { success: true }
>;
type ConversationEmailUpdateOnboardingAction = NonNullable<
  NonNullable<
    ConversationEmailUpdateSummarySuccess["participantPreference"]
  >["onboardingAction"]
>;
const onboardingPreferenceAction = ref<
  ConversationEmailUpdateOnboardingAction | undefined
>(undefined);
const summaryLoadState = ref<
  "loading" | "ready" | "unavailable" | "transient_error"
>("loading");
const isSavingConversationUpdatePreference = ref(false);
const canContinueWithoutSaving = ref(false);
const conversationUpdateScopeKind = computed(() =>
  onboardingPreferenceAction.value?.operation === "set_project_preference"
    ? "project"
    : "no-project"
);
const isBusy = computed(
  () =>
    summaryLoadState.value === "loading" ||
    summaryLoadState.value === "transient_error" ||
    isSavingConversationUpdatePreference.value
);
const continueWithoutSavingLabel = computed(() =>
  summaryLoadState.value === "transient_error" || canContinueWithoutSaving.value
    ? t("continueWithoutSavingLabel")
    : undefined
);
let summaryRequestId = 0;

watch(
  [isAuthInitialized, conversationSlugId],
  ([authInitialized]) => {
    if (authInitialized) {
      void loadConversationUpdateSummary();
    }
  },
  { immediate: true }
);

async function loadConversationUpdateSummary(): Promise<void> {
  const requestId = ++summaryRequestId;
  summaryLoadState.value = "loading";
  onboardingPreferenceAction.value = undefined;
  canContinueWithoutSaving.value = false;

  try {
    const response = await conversationEmailUpdatesApi.getConversationSummary({
      conversationSlugId: conversationSlugId.value,
    });
    if (requestId !== summaryRequestId) {
      return;
    }

    if (response.success) {
      const action = response.participantPreference?.onboardingAction;
      onboardingPreferenceAction.value = action;
      conversationUpdatesChecked.value = action?.initialEnabled ?? true;
      summaryLoadState.value = "ready";
    } else {
      summaryLoadState.value = "unavailable";
    }
  } catch (error) {
    console.error("Failed to load Email Update onboarding summary", error);
    if (requestId === summaryRequestId) {
      summaryLoadState.value = "transient_error";
    }
  }
}

async function handleBackToConversation(): Promise<void> {
  if (isBusy.value) {
    return;
  }

  isSavingConversationUpdatePreference.value = true;
  try {
    if (!(await saveConversationUpdatePreference())) {
      canContinueWithoutSaving.value = true;
      showPreferenceSaveError();
      return;
    }

    await exitToConversation({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    });
  } catch (error) {
    console.error("Failed to save Email Update onboarding preference", error);
    canContinueWithoutSaving.value = true;
    showPreferenceSaveError();
  } finally {
    isSavingConversationUpdatePreference.value = false;
  }
}

async function saveConversationUpdatePreference(): Promise<boolean> {
  const action = onboardingPreferenceAction.value;
  if (action === undefined) {
    return true;
  }

  if (action.operation === "set_project_preference") {
    const response = await conversationEmailUpdatesApi.updatePreference({
      operation: action.operation,
      projectSlug: action.projectSlug,
      enabled: conversationUpdatesChecked.value,
      source: "onboarding",
    });
    return (
      response.success && response.result.operation === "set_project_preference"
    );
  }

  const response = await conversationEmailUpdatesApi.updatePreference({
    operation: action.operation,
    conversationSlugId: action.conversationSlugId,
    enabled: conversationUpdatesChecked.value,
    source: "onboarding",
  });
  return (
    response.success &&
    response.result.operation === "set_conversation_preference"
  );
}

function showPreferenceSaveError(): void {
  showNotifyMessage({
    message: t("emailUpdatePreferenceSaveError"),
    force: true,
  });
}

async function continueWithoutSaving(): Promise<void> {
  if (isSavingConversationUpdatePreference.value) {
    return;
  }
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

async function handleReviewAnswers(): Promise<void> {
  await router.replace({
    path: getConversationSurveySummaryPath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}
</script>
