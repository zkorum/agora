<template>
  <OnboardingLayout
    :back-callback="handleBackToWelcome"
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
      <PageLoadingSpinner v-if="isInitialLoading" />

      <ErrorRetryBlock
        v-else-if="hasLoadError"
        :title="tCommon('failedToLoadSurveyTitle')"
        :retry-label="tCommon('tryAgainLabel')"
        @retry="refetchAll"
      />

      <StepperLayout
        v-else
        :submit-call-back="() => {}"
        :current-step="2"
        :total-steps="surveyStepTotal"
        :enable-next-button="true"
        :show-next-button="false"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            :description="t('description')"
            icon-name="mdi-shield-check"
          />
        </template>

        <template #body>
          <div class="buttons">
            <ZKGradientButton
              :label="t('verifyWithRarimo')"
              @click="goToPassport()"
            />

            <ZKGradientButton
              :label="t('verifyWithPhone')"
              gradient-background="#E7E7FF"
              label-color="#6b4eff"
              @click="goToPhone()"
            />
          </div>

          <p v-if="!isLoggedIn"><SignupAgreement variant="verify" /></p>
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyOnboardingHero from "src/components/onboarding/backgrounds/ConversationSurveyOnboardingHero.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SignupAgreement from "src/components/onboarding/ui/SignupAgreement.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import {
  type VerifyIdentityTranslations,
  verifyIdentityTranslations,
} from "src/pages/verify/identity/index.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import {
  getConversationSurveyOnboardingPath,
  getConversationSurveyVerifyPassportPath,
  getConversationSurveyVerifyPath,
  getConversationSurveyVerifyPhonePath,
} from "src/utils/survey/navigation";
import { computed, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyOnboardingTranslations,
  conversationSurveyOnboardingTranslations,
} from "../index.i18n";

const router = useRouter();
const { routeConversationSlugId, routeContext } = useConversationOnboardingRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { safeNavigateBack } = useGoBackButtonHandler();
const { exitToConversation } = useConversationOnboardingExit();
const { onboardingMode, credentialUpgradeTarget } = storeToRefs(
  onboardingFlowStore()
);
const { t } = useComponentI18n<VerifyIdentityTranslations>(
  verifyIdentityTranslations
);
const { t: tCommon } =
  useComponentI18n<ConversationSurveyOnboardingTranslations>(
    conversationSurveyOnboardingTranslations
  );

if (
  conversationOnboardingStore.conversationSlugId !==
  routeConversationSlugId.value
) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
    routeContext: routeContext.value,
  });
}

const {
  conversationSlugId,
  conversationData,
  conversationDisplayContent,
  surveyForm,
  requirementState,
  isInitialLoading,
  hasLoadError,
  refetchAll,
} = useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

watch(
  [isInitialLoading, requirementState],
  ([loading, requirements]) => {
    if (!loading && !requirements.needsAuth) {
      void router.replace({
        path: getConversationSurveyVerifyPath({
          conversationSlugId: conversationSlugId.value,
          routeContext: routeContext.value,
        }),
      });
    }
  },
  { immediate: true, deep: true }
);

async function handleBackToWelcome(): Promise<void> {
  credentialUpgradeTarget.value = null;
  await safeNavigateBack({
    path: getConversationSurveyOnboardingPath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}

async function handleBackToConversation(): Promise<void> {
  credentialUpgradeTarget.value = null;
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

async function goToPassport(): Promise<void> {
  onboardingMode.value = "LOGIN";
  credentialUpgradeTarget.value = "strong";
  await router.push({
    path: getConversationSurveyVerifyPassportPath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}

async function goToPhone(): Promise<void> {
  onboardingMode.value = "LOGIN";
  credentialUpgradeTarget.value = "strong";
  await router.push({
    path: getConversationSurveyVerifyPhonePath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}
</script>

<style scoped lang="scss">
.buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
