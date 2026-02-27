<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="validateEmail">
        <StepperLayout
          :submit-call-back="validateEmail"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="!emailData.hasBeenBlurred || emailData.isValid"
          :show-next-button="true"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('pageTitle')"
              description=""
              icon-name="mdi-email"
            />
          </template>

          <template #body>
            <div class="container">
              <div>{{ t("emailDescription") }}</div>

              <q-input
                v-model="emailData.email"
                type="email"
                outlined
                :placeholder="t('emailPlaceholder')"
                @update:model-value="onEmailUpdate"
                @blur="onEmailBlur"
              />

              <div
                v-if="
                  emailData.hasBeenBlurred &&
                  emailData.hasError &&
                  emailData.errorMessage
                "
                class="error-text"
                role="alert"
                aria-live="polite"
              >
                {{ emailData.errorMessage }}
              </div>

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
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { zodEmail } from "src/shared/types/zod-email";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { reactive } from "vue";
import { useRouter } from "vue-router";

import {
  type EmailOnboardingTranslations,
  emailOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<EmailOnboardingTranslations>(
  emailOnboardingTranslations
);

const router = useRouter();

const emailData = reactive({
  email: "" as string | number | null,
  isValid: false,
  hasError: false,
  errorMessage: "",
  hasBeenBlurred: false,
});

const { verificationEmail } = storeToRefs(emailVerificationStore());

function isValidEmail(email: string): boolean {
  return zodEmail.safeParse(email).success;
}

async function goToPassportVerification() {
  await router.replace({ name: "/onboarding/step3-passport/" });
}

async function goToPhoneVerification() {
  await router.replace({ name: "/onboarding/step3-phone-1/" });
}

function clearErrors() {
  emailData.hasError = false;
  emailData.errorMessage = "";
}

function setError(message: string) {
  emailData.hasError = true;
  emailData.errorMessage = message;
}

function validateAndSetErrors() {
  const email = String(emailData.email ?? "").trim();

  if (!email) {
    emailData.isValid = false;
    setError(t("pleaseEnterEmail"));
    return;
  }

  if (!isValidEmail(email)) {
    emailData.isValid = false;
    setError(t("pleaseEnterValidEmail"));
    return;
  }

  emailData.isValid = true;
  clearErrors();
}

function onEmailUpdate() {
  const email = String(emailData.email ?? "");
  emailData.isValid = email !== "" && isValidEmail(email);

  if (emailData.hasBeenBlurred) {
    validateAndSetErrors();
  }
}

function onEmailBlur() {
  emailData.hasBeenBlurred = true;
  validateAndSetErrors();
}

async function validateEmail(): Promise<boolean> {
  emailData.hasBeenBlurred = true;
  validateAndSetErrors();

  if (!emailData.isValid) {
    return false;
  }

  const email = String(emailData.email ?? "").trim();
  verificationEmail.value = email;
  await router.push({ name: "/onboarding/step3-email-2/" });
  return true;
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-text {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: -0.75rem;
}

.alternativeLogins {
  display: flex;
  flex-direction: column;
}
</style>
