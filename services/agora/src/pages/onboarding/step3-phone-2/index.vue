<template>
  <OnboardingLayout v-if="!skipPhoneRegistration" body-behind-footer>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form class="formStyle" @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="3.5"
          :total-steps="5"
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
              :purpose="phoneAuthPurpose"
              @change-identifier="changePhoneNumber"
            />
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
  <PageLoadingSpinner v-else />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import PhoneOtpForm from "src/components/verification/PhoneOtpForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useSkipUnavailablePhoneRegistration } from "src/composables/verification/useSkipUnavailablePhoneRegistration";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { usePhoneAuthAvailability } from "src/utils/auth/phoneAuthMode";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type Step3Phone2Translations,
  step3Phone2Translations,
} from "./index.i18n";

const { t } = useComponentI18n<Step3Phone2Translations>(
  step3Phone2Translations
);

const router = useRouter();
const { onboardingMode } = storeToRefs(onboardingFlowStore());
const phoneAuthPurpose = computed(() =>
  onboardingMode.value === "SIGNUP" ? "registration" : "login"
);
const skipPhoneRegistration = useSkipUnavailablePhoneRegistration({
  availability: usePhoneAuthAvailability(phoneAuthPurpose),
  redirect: () => router.replace({ name: "/onboarding/step2-signup/" }),
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
  await router.replace({ name: "/onboarding/step3-phone-1/" });
}
</script>

<style scoped lang="scss">
.formStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
