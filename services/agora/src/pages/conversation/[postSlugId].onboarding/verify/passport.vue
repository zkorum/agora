<template>
  <ConversationOnboardingLayout
    :sheet="sheet"
    :back-callback="handleBackToAuthChoice"
    :close-callback="handleBackToConversation"
  >
    <WidthWrapper :enable="true">
      <StepperLayout
        fixed-navigation
        :submit-call-back="() => {}"
        :current-step="2"
        :total-steps="totalSteps"
        :enable-next-button="true"
        :show-next-button="false"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            :description="t('description')"
            icon-name="mdi-wallet"
          />
        </template>

        <template #body>
          <RarimoVerificationForm :recover-account="false" />

          <div class="alternativeLogins">
            <ZKButton
              v-if="phoneAuthAvailability.available"
              button-type="largeButton"
              :label="t('preferPhoneVerification')"
              text-color="primary"
              @click="goToPhoneVerification()"
            />
          </div>
        </template>
      </StepperLayout>
    </WidthWrapper>
  </ConversationOnboardingLayout>
</template>

<script setup lang="ts">
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import RarimoVerificationForm from "src/components/verification/RarimoVerificationForm.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationVerificationState } from "src/composables/conversation/useConversationVerificationState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import ConversationOnboardingLayout from "src/layouts/ConversationOnboardingLayout.vue";
import {
  type VerifyPassportTranslations,
  verifyPassportTranslations,
} from "src/pages/verify/passport/index.i18n";
import { usePhoneAuthAvailability } from "src/utils/auth/phoneAuthMode";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getConversationSurveyVerifyPhonePath } from "src/utils/survey/navigation";
import type { DismissalController } from "src/utils/ui/dismissalController";
import { useRouter } from "vue-router";

defineProps<{ sheet: DismissalController }>();

const { t } = useComponentI18n<VerifyPassportTranslations>(
  verifyPassportTranslations
);

const router = useRouter();
const { routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { safeNavigateBack } = useGoBackButtonHandler();
const { exitToConversation } = useConversationOnboardingExit();

const {
  conversationSlugId,
  phoneAuthPurpose,
  credentialChoicePath: backPath,
  totalSteps,
} = useConversationVerificationState({
  conversationSlugId: routeConversationSlugId,
  routeContext,
});
const phoneAuthAvailability = usePhoneAuthAvailability(phoneAuthPurpose);

async function handleBackToAuthChoice(): Promise<void> {
  await safeNavigateBack({ path: backPath.value });
}

async function goToPhoneVerification() {
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
.alternativeLogins {
  display: flex;
  flex-direction: column;
}
</style>
