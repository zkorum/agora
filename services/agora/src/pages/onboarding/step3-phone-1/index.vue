<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="true"
          :show-next-button="true"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('pageTitle')"
              description=""
              icon-name="mdi-phone"
            />
          </template>

          <template #body>
            <PhoneInputForm ref="phoneInputFormRef" @submit="goToOtpPage" />

            <div class="alternativeLogins">
              <ZKGradientButton
                :label="t('preferPrivateLogin')"
                variant="text"
                label-color="#6B4EFF"
                @click="goToPassportVerification()"
              />

              <ZKGradientButton
                v-if="credentialUpgradeTarget !== 'strong'"
                :label="t('preferEmailLogin')"
                variant="text"
                label-color="#6B4EFF"
                @click="goToEmailLogin()"
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
import PhoneInputForm from "src/components/verification/PhoneInputForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { ref } from "vue";
import { useRouter } from "vue-router";

import {
  type PhoneOnboardingTranslations,
  phoneOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<PhoneOnboardingTranslations>(
  phoneOnboardingTranslations
);

const router = useRouter();

const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());

const phoneInputFormRef = ref<{
  submit: () => boolean;
} | null>(null);

function onSubmit() {
  phoneInputFormRef.value?.submit();
}

async function goToOtpPage() {
  await router.push({ name: "/onboarding/step3-phone-2/" });
}

async function goToPassportVerification() {
  await router.replace({ name: "/onboarding/step3-passport/" });
}

async function goToEmailLogin() {
  await router.replace({ name: "/onboarding/step3-email-1/" });
}
</script>

<style scoped lang="scss">
.alternativeLogins {
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
}
</style>
