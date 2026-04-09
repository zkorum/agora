<template>
  <OnboardingLayout
    :back-callback="handleBackToWelcome"
    :close-callback="handleBackToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyHero
        v-if="conversationData !== undefined"
        :conversation-title="conversationData.payload.title"
        :author-username="conversationData.metadata.authorUsername"
        :organization-name="conversationData.metadata.organization?.name ?? ''"
        :organization-image-url="
          conversationData.metadata.organization?.imageUrl ?? ''
        "
      />
      <DefaultImageExample v-else />
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
            icon-name="mdi-account-check"
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

            <ZKGradientButton
              :label="t('verifyWithEmail')"
              gradient-background="#E7E7FF"
              label-color="#6b4eff"
              @click="goToEmail()"
            />
          </div>

          <p v-if="!isLoggedIn"><SignupAgreement variant="login" /></p>
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyHero from "src/components/onboarding/backgrounds/ConversationSurveyHero.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SignupAgreement from "src/components/onboarding/ui/SignupAgreement.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import {
  type VerifyHardTranslations,
  verifyHardTranslations,
} from "src/pages/verify/hard/index.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  getConversationPath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyVerifyPath,
} from "src/utils/survey/navigation";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationSurveyOnboardingTranslations,
  conversationSurveyOnboardingTranslations,
} from "../index.i18n";

const router = useRouter();
const route = useRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { safeNavigateBack } = useGoBackButtonHandler();
const { onboardingMode, credentialUpgradeTarget } = storeToRefs(
  onboardingFlowStore()
);
const { t } = useComponentI18n<VerifyHardTranslations>(verifyHardTranslations);
const { t: tCommon } =
  useComponentI18n<ConversationSurveyOnboardingTranslations>(
    conversationSurveyOnboardingTranslations
  );

const routeConversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.postSlugId);
});

if (
  conversationOnboardingStore.conversationSlugId !==
  routeConversationSlugId.value
) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
  });
}

const {
  conversationSlugId,
  conversationData,
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
    }),
  });
}

async function handleBackToConversation(): Promise<void> {
  credentialUpgradeTarget.value = null;
  conversationOnboardingStore.clearForConversation({
    conversationSlugId: conversationSlugId.value,
  });
  await router.push({
    path: getConversationPath({ conversationSlugId: conversationSlugId.value }),
  });
}

async function goToPassport(): Promise<void> {
  onboardingMode.value = "LOGIN";
  credentialUpgradeTarget.value = "hard";
  await router.push({
    name: "/conversation/[postSlugId].onboarding/verify/passport",
    params: { postSlugId: conversationSlugId.value },
  });
}

async function goToPhone(): Promise<void> {
  onboardingMode.value = "LOGIN";
  credentialUpgradeTarget.value = "hard";
  await router.push({
    name: "/conversation/[postSlugId].onboarding/verify/phone",
    params: { postSlugId: conversationSlugId.value },
  });
}

async function goToEmail(): Promise<void> {
  onboardingMode.value = "LOGIN";
  credentialUpgradeTarget.value = "hard";
  await router.push({
    name: "/conversation/[postSlugId].onboarding/verify/email",
    params: { postSlugId: conversationSlugId.value },
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
