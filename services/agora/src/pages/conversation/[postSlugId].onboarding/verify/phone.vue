<template>
  <OnboardingLayout
    :back-callback="handleBackToAuthChoice"
    :close-callback="handleBackToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyOnboardingHero :conversation-data="conversationData" />
    </template>

    <template #footer>
      <PageLoadingSpinner v-if="isInitialLoading" />

      <ErrorRetryBlock
        v-else-if="hasLoadError"
        :title="tCommon('failedToLoadSurveyTitle')"
        :retry-label="tCommon('tryAgainLabel')"
        @retry="refetchAll"
      />

      <form v-else @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="2"
          :total-steps="surveyStepTotal"
          :enable-next-button="!isLoading && nextCodeWaitSeconds === 0"
          :show-next-button="true"
          :show-loading-button="isLoading"
        >
          <template #header>
            <InfoHeader
              :title="t('title')"
              description=""
              icon-name="mdi-phone"
            />
          </template>

          <template #body>
            <PhoneInputForm ref="phoneInputFormRef" @submit="submitPhone" />
            <p v-if="!isLoggedIn"><SignupAgreement variant="verify" /></p>
          </template>
        </StepperLayout>
      </form>
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
import PhoneInputForm from "src/components/verification/PhoneInputForm.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { usePhoneSubmit } from "src/composables/verification/usePhoneSubmit";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import {
  type VerifyPhoneTranslations,
  verifyPhoneTranslations,
} from "src/pages/verify/phone/index.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  getConversationSurveyOnboardingPath,
  getConversationSurveyVerifyHardPath,
  getConversationSurveyVerifyIdentityPath,
  getConversationSurveyVerifyPath,
} from "src/utils/survey/navigation";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationSurveyOnboardingTranslations,
  conversationSurveyOnboardingTranslations,
} from "../index.i18n";

const router = useRouter();
const route = useRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { isLoggedIn, isAuthInitialized, credentials } = storeToRefs(
  useAuthenticationStore()
);
const { safeNavigateBack } = useGoBackButtonHandler();
const { exitToConversation } = useConversationOnboardingExit();
const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());
const { completeVerification } = useVerificationComplete();
const { showNotifyMessage } = useNotify();
const { t } = useComponentI18n<VerifyPhoneTranslations>(
  verifyPhoneTranslations
);
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

const backPath = computed(() => {
  if (
    credentialUpgradeTarget.value === "strong" ||
    conversationData.value?.metadata.participationMode === "strong_verification"
  ) {
    return getConversationSurveyVerifyIdentityPath({
      conversationSlugId: conversationSlugId.value,
    });
  }

  if (
    credentialUpgradeTarget.value === "hard" ||
    conversationData.value?.metadata.participationMode === "account_required"
  ) {
    return getConversationSurveyVerifyHardPath({
      conversationSlugId: conversationSlugId.value,
    });
  }

  return getConversationSurveyOnboardingPath({
    conversationSlugId: conversationSlugId.value,
  });
});

const { isLoading, submitPhone, nextCodeWaitSeconds } = usePhoneSubmit({
  onNavigateToOtp: () =>
    router.replace({
      name: "/conversation/[postSlugId].onboarding/verify/phone-code",
      params: { postSlugId: conversationSlugId.value },
    }),
  onAlreadyHasCredential: () => {
    showNotifyMessage(t("alreadyHasPhone"));
    void completeVerification();
  },
  showNotifyMessage,
  translations: {
    throttled: t("throttled"),
    invalidPhoneNumber: t("invalidPhoneNumber"),
    restrictedPhoneType: t("restrictedPhoneType"),
    credentialAlreadyLinked: t("credentialAlreadyLinked"),
    somethingWrong: t("somethingWrong"),
  },
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

onMounted(() => {
  checkExistingCredential();
});

watch(isAuthInitialized, () => {
  checkExistingCredential();
});

function checkExistingCredential() {
  if (!isAuthInitialized.value) {
    return;
  }

  if (credentials.value.phone !== null) {
    showNotifyMessage(t("alreadyHasPhone"));
    void completeVerification();
  }
}

const phoneInputFormRef = ref<{
  submit: () => boolean;
} | null>(null);

function onSubmit() {
  phoneInputFormRef.value?.submit();
}

async function handleBackToAuthChoice(): Promise<void> {
  await safeNavigateBack({ path: backPath.value });
}

async function handleBackToConversation(): Promise<void> {
  credentialUpgradeTarget.value = null;
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
  });
}
</script>
