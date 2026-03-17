<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="(emailInputFormRef?.getIsValid() ?? true) && !isLoading"
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
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import EmailInputForm from "src/components/verification/EmailInputForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useEmailSubmit } from "src/composables/verification/useEmailSubmit";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useNotify } from "src/utils/ui/notify";
import { ref } from "vue";
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

const { isLoading, submitEmail } = useEmailSubmit({
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
    credentialAlreadyLinked: t("credentialAlreadyLinked"),
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
