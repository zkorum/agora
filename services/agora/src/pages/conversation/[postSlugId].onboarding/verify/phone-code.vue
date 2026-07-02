<template>
  <OnboardingLayout
    :back-callback="changePhoneNumber"
    :close-callback="handleBackToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyOnboardingHero :conversation-data="conversationData" />
    </template>

    <template #footer>
      <form class="formStyle" @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="2.5"
          :total-steps="surveyStepTotal"
          :enable-next-button="phoneOtpFormRef?.isCodeComplete?.() ?? false"
          :show-next-button="true"
          :show-loading-button="
            phoneOtpFormRef?.isSubmitButtonLoading?.value ?? false
          "
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
              @change-identifier="changePhoneNumber"
            />
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
import PhoneOtpForm from "src/components/verification/PhoneOtpForm.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import {
  type VerifyPhoneCodeTranslations,
  verifyPhoneCodeTranslations,
} from "src/pages/verify/phone-code/index.i18n";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { getConversationSurveyVerifyPhonePath } from "src/utils/survey/navigation";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const { t } = useComponentI18n<VerifyPhoneCodeTranslations>(
  verifyPhoneCodeTranslations
);

const router = useRouter();
const { routeConversationSlugId, routeContext } = useConversationOnboardingRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());
const { exitToConversation } = useConversationOnboardingExit();

if (
  conversationOnboardingStore.conversationSlugId !==
  routeConversationSlugId.value
) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
    routeContext: routeContext.value,
  });
}

const { conversationSlugId, conversationData, surveyForm } =
  useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

const phoneOtpFormRef = ref<{
  nextButtonClicked: () => void;
  isSubmitButtonLoading: { value: boolean };
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
  credentialUpgradeTarget.value = null;
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
