<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form class="formStyle" @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="3.5"
          :total-steps="5"
          :enable-next-button="phoneOtpFormRef?.isCodeComplete?.() ?? false"
          :show-next-button="true"
          :show-loading-button="phoneOtpFormRef?.isSubmitButtonLoading?.value ?? false"
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
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import PhoneOtpForm from "src/components/verification/PhoneOtpForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { ref } from "vue";
import { useRouter } from "vue-router";

import {
  type Step3Phone2Translations,
  step3Phone2Translations,
} from "./index.i18n";

const { t } = useComponentI18n<Step3Phone2Translations>(
  step3Phone2Translations
);

const router = useRouter();

const phoneOtpFormRef = ref<{
  nextButtonClicked: () => void;
  isSubmitButtonLoading: { value: boolean };
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
