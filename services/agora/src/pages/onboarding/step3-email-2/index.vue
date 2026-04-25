<template>
  <OnboardingLayout body-behind-footer>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form class="formStyle" @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="3.5"
          :total-steps="5"
          :enable-next-button="emailOtpFormRef?.isCodeComplete?.() ?? false"
          :show-next-button="true"
          :show-loading-button="emailOtpFormRef?.isSubmitButtonLoading?.value ?? false"
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
              @change-identifier="changeEmail"
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
import EmailOtpForm from "src/components/verification/EmailOtpForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { ref } from "vue";
import { useRouter } from "vue-router";

import {
  type Step3Email2Translations,
  step3Email2Translations,
} from "./index.i18n";

const { t } = useComponentI18n<Step3Email2Translations>(
  step3Email2Translations
);

const router = useRouter();

const emailOtpFormRef = ref<{
  nextButtonClicked: () => void;
  isSubmitButtonLoading: { value: boolean };
  isCodeComplete: () => boolean;
} | null>(null);

function onSubmit() {
  emailOtpFormRef.value?.nextButtonClicked();
}

async function changeEmail() {
  await router.replace({ name: "/onboarding/step3-email-1/" });
}
</script>

<style scoped lang="scss">
.formStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
