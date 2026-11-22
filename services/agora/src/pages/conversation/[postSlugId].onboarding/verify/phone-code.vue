<template>
  <ConversationOnboardingLayout
    v-if="!skipPhoneRegistration"
    :sheet="sheet"
    :back-callback="changePhoneNumber"
    :close-callback="handleBackToConversation"
  >
    <form class="formStyle" @submit.prevent="onSubmit">
      <StepperLayout
        fixed-navigation
        :submit-call-back="onSubmit"
        :current-step="2.5"
        :total-steps="totalSteps"
        :enable-next-button="phoneOtpFormRef?.isCodeComplete?.() ?? false"
        :show-next-button="phoneOtpFormRef?.isAvailable ?? false"
        :show-loading-button="phoneOtpFormRef?.isSubmitButtonLoading ?? false"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            description=""
            icon-name="mdi-phone"
          />
        </template>

        <template #body>
          <PhoneOtpForm
            ref="phoneOtpFormRef"
            :recover-account="false"
            :purpose="phoneAuthPurpose"
            @change-identifier="changePhoneNumber"
          />
        </template>
      </StepperLayout>
    </form>
  </ConversationOnboardingLayout>
  <PageLoadingSpinner v-else />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import PhoneOtpForm from "src/components/verification/PhoneOtpForm.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationVerificationState } from "src/composables/conversation/useConversationVerificationState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useSkipUnavailablePhoneRegistration } from "src/composables/verification/useSkipUnavailablePhoneRegistration";
import ConversationOnboardingLayout from "src/layouts/ConversationOnboardingLayout.vue";
import {
  type VerifyPhoneCodeTranslations,
  verifyPhoneCodeTranslations,
} from "src/pages/verify/phone-code/index.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePhoneAuthAvailability } from "src/utils/auth/phoneAuthMode";
import {
  getConversationSurveyVerifyPath,
  getConversationSurveyVerifyPhonePath,
} from "src/utils/survey/navigation";
import type { DismissalController } from "src/utils/ui/dismissalController";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

defineProps<{ sheet: DismissalController }>();

const { t } = useComponentI18n<VerifyPhoneCodeTranslations>(
  verifyPhoneCodeTranslations
);

const router = useRouter();
const { routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { isAuthInitialized, isLoggedIn } = storeToRefs(useAuthenticationStore());
const phoneAuthPurpose = computed(() =>
  !isAuthInitialized.value || isLoggedIn.value ? "credential" : "login"
);
const { exitToConversation } = useConversationOnboardingExit();

const { conversationSlugId, totalSteps } = useConversationVerificationState({
  conversationSlugId: routeConversationSlugId,
  routeContext,
});
const skipPhoneRegistration = useSkipUnavailablePhoneRegistration({
  availability: usePhoneAuthAvailability(phoneAuthPurpose),
  ready: isAuthInitialized,
  redirect: () =>
    router.replace({
      path: getConversationSurveyVerifyPath({
        conversationSlugId: conversationSlugId.value,
        routeContext: routeContext.value,
      }),
    }),
});

const phoneOtpFormRef = ref<{
  nextButtonClicked: () => void;
  isSubmitButtonLoading: boolean;
  isAvailable: boolean;
  isCodeComplete: () => boolean;
} | null>(null);

function onSubmit() {
  phoneOtpFormRef.value?.nextButtonClicked();
}

async function changePhoneNumber() {
  await router.replace({
    path: getConversationSurveyVerifyPhonePath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}

async function handleBackToConversation(): Promise<void> {
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}
</script>

<style scoped lang="scss">
.formStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
