<template>
  <OnboardingLayout>
    <template #body>
      <ClusterImageExample />
    </template>
    <template #footer>
      <StepperLayout
        :submit-call-back="() => {}"
        :current-step="1"
        :total-steps="5"
        :enable-next-button="true"
        :show-next-button="false"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            :title="t('pageTitle')"
            :description="t('description')"
            icon-name="mdi-login"
          />
        </template>

        <template #body>
          <ZKGradientButton
            :label="t('connectWallet')"
            @click="goToWalletLogin()"
          />

          <ZKGradientButton
            :label="t('loginWithPhone')"
            gradient-background="#E7E7FF"
            label-color="#6B4EFF"
            @click="goToPhoneLogin()"
          />

          <p><SignupAgreement /></p>
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import ClusterImageExample from "src/components/onboarding/backgrounds/ClusterImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SignupAgreement from "src/components/onboarding/ui/SignupAgreement.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useRouter } from "vue-router";

import {
  type LoginOnboardingTranslations,
  loginOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<LoginOnboardingTranslations>(
  loginOnboardingTranslations
);

const router = useRouter();

async function goToWalletLogin() {
  await router.push({ name: "/onboarding/step3-wallet/" });
}

async function goToPhoneLogin() {
  await router.replace({ name: "/onboarding/step3-phone-1/" });
}
</script>
