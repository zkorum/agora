<template>
  <ConversationOnboardingLayout
    :sheet="sheet"
    :back-callback="changeEmail"
    :close-callback="handleBackToConversation"
  >
    <form class="formStyle" @submit.prevent="onSubmit">
      <StepperLayout
        fixed-navigation
        :submit-call-back="onSubmit"
        :current-step="2.5"
        :total-steps="totalSteps"
        :enable-next-button="emailOtpFormRef?.isCodeComplete?.() ?? false"
        :show-next-button="true"
        :show-loading-button="emailOtpFormRef?.isSubmitButtonLoading ?? false"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            description=""
            icon-name="mdi-email"
          />
        </template>

        <template #body>
          <EmailOtpForm
            ref="emailOtpFormRef"
            :recover-account="false"
            @change-identifier="changeEmail"
          />
        </template>
      </StepperLayout>
    </form>
  </ConversationOnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import EmailOtpForm from "src/components/verification/EmailOtpForm.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationVerificationState } from "src/composables/conversation/useConversationVerificationState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import ConversationOnboardingLayout from "src/layouts/ConversationOnboardingLayout.vue";
import {
  type VerifyEmailCodeTranslations,
  verifyEmailCodeTranslations,
} from "src/pages/verify/email-code/index.i18n";
import { getConversationSurveyVerifyEmailPath } from "src/utils/survey/navigation";
import type { DismissalController } from "src/utils/ui/dismissalController";
import { ref } from "vue";
import { useRouter } from "vue-router";

defineProps<{ sheet: DismissalController }>();

const { t } = useComponentI18n<VerifyEmailCodeTranslations>(
  verifyEmailCodeTranslations
);

const router = useRouter();
const { routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { exitToConversation } = useConversationOnboardingExit();

const { conversationSlugId, totalSteps } = useConversationVerificationState({
  conversationSlugId: routeConversationSlugId,
  routeContext,
});

const emailOtpFormRef = ref<{
  nextButtonClicked: () => void;
  isSubmitButtonLoading: boolean;
  isCodeComplete: () => boolean;
} | null>(null);

function onSubmit() {
  emailOtpFormRef.value?.nextButtonClicked();
}

async function changeEmail() {
  await router.replace({
    path: getConversationSurveyVerifyEmailPath({
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
