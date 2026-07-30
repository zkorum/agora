<template>
  <OnboardingLayout body-behind-footer>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="
            (emailInputFormRef?.getIsValid() ?? true) &&
            !isLoading &&
            nextCodeWaitSeconds === 0
          "
          :show-next-button="true"
          :show-loading-button="isLoading"
        >
          <template #header>
            <InfoHeader
              :title="t('pageTitle')"
              description=""
              icon-name="mdi-email"
            />
          </template>

          <template #body>
            <EmailInputForm ref="emailInputFormRef" @submit="submitEmail" />

            <div class="alternativeLogins">
              <ZKGradientButton
                :label="t('preferPrivateLogin')"
                variant="text"
                label-color="#6B4EFF"
                @click="goToPassportVerification()"
              />

              <ZKGradientButton
                v-if="phoneAuthAvailability.available"
                :label="t('preferPhoneLogin')"
                variant="text"
                label-color="#6B4EFF"
                @click="goToPhoneVerification()"
              />
            </div>
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import EmailInputForm from "src/components/verification/EmailInputForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useEmailSubmit } from "src/composables/verification/useEmailSubmit";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import {
  usePhoneAuthAvailability,
} from "src/utils/auth/phoneAuthMode";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type EmailOnboardingTranslations,
  emailOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<EmailOnboardingTranslations>(
  emailOnboardingTranslations
);

const router = useRouter();
const { showNotifyMessage } = useNotify();
const { completeVerification } = useVerificationComplete();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { onboardingMode } = storeToRefs(onboardingFlowStore());
const phoneAuthPurpose = computed(() =>
  isLoggedIn.value
    ? "credential"
    : onboardingMode.value === "SIGNUP"
      ? "registration"
      : "login"
);
const phoneAuthAvailability = usePhoneAuthAvailability(phoneAuthPurpose);

const { isLoading, submitEmail, nextCodeWaitSeconds } = useEmailSubmit({
  onNavigateToOtp: () => router.replace({ name: "/onboarding/step3-email-2/" }),
  onAlreadyHasCredential: () => {
    showNotifyMessage(t("alreadyHasEmail"));
    void completeVerification();
  },
  showNotifyMessage,
  translations: {
    throttled: t("throttled"),
    unreachable: t("unreachable"),
    disposable: t("disposable"),
    somethingWrong: t("somethingWrong"),
  },
});

const emailInputFormRef = ref<{
  submit: () => boolean;
  getIsValid: () => boolean;
} | null>(null);

function onSubmit() {
  emailInputFormRef.value?.submit();
}

async function goToPassportVerification() {
  await router.replace({ name: "/onboarding/step3-passport/" });
}

async function goToPhoneVerification() {
  await router.replace({ name: "/onboarding/step3-phone-1/" });
}
</script>

<style scoped lang="scss">
.alternativeLogins {
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
}
</style>
