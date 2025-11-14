<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="validateNumber">
        <StepperLayout
          :submit-call-back="validateNumber"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="true"
          :show-next-button="true"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('pageTitle')"
              :description="''"
              icon-name="mdi-phone"
            />
          </template>

          <template #body>
            <div class="container">
              <div>{{ t("smsDescription") }}</div>

              <!--
                This component has some form of VNode bug that can cause Vite's dev server
                to lose its rendering instance upon load. It only affects the development server.
                There are no solution to fix the issue but since it doesn't affect production
                it can be safely ignored.
              -->
              <MazPhoneNumberInput
                v-model="phoneData.phoneNumber"
                v-model:country-code="phoneData.countryCode"
                :success="phoneData.isValid"
                :error="phoneData.hasError"
                show-code-on-list
                :placeholder="t('phoneNumberPlaceholder')"
                required
                :auto-format="false"
                no-validation-error
                aria-describedby="phone-error"
                @update="onPhoneUpdate"
                @country-code="onCountryCodeUpdate"
                @blur="onPhoneBlur"
              />

              <div
                v-if="
                  phoneData.hasError &&
                  phoneData.errorMessage &&
                  phoneData.hasAttemptedSubmission
                "
                id="phone-error"
                class="error-message"
                role="alert"
                aria-live="polite"
              >
                <q-icon name="mdi-alert-circle" class="error-icon" />
                <span>{{ phoneData.errorMessage }}</span>
              </div>

              <ZKGradientButton
                :label="t('preferPrivateLogin')"
                variant="text"
                label-color="#6B4EFF"
                @click="goToPassportVerification()"
              />

              <div v-if="devAuthorizedNumbers.length > 0">
                <div class="developmentSection">
                  <div>{{ t("developmentNumbers") }}</div>

                  <div
                    v-for="authorizedNumber in devAuthorizedNumbers"
                    :key="authorizedNumber.fullNumber"
                  >
                    <ZKGradientButton
                      :label="authorizedNumber.fullNumber"
                      label-color="#FFFFFF"
                      :style="{ width: '100%' }"
                      @click="injectDevelopmentNumber(authorizedNumber)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import { reactive } from "vue";
import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber as LibPhoneNumber,
} from "libphonenumber-js/max";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import { processEnv } from "src/utils/processEnv";
import {
  zodSupportedCountryCallingCode,
  type SupportedCountryCallingCode,
} from "src/shared/types/zod";
import type { Results } from "maz-ui/components/MazPhoneNumberInput";
import MazPhoneNumberInput from "maz-ui/components/MazPhoneNumberInput";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  phoneOnboardingTranslations,
  type PhoneOnboardingTranslations,
} from "./index.i18n";
import { isPhoneNumberTypeSupported } from "src/shared-app-api/phone";

const { t } = useComponentI18n<PhoneOnboardingTranslations>(
  phoneOnboardingTranslations
);

const router = useRouter();

const phoneData = reactive({
  phoneNumber: null as string | null,
  countryCode: null as CountryCode | null,
  isValid: false,
  hasError: false,
  errorMessage: "" as string,
  hasAttemptedSubmission: false,
});

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

interface PhoneNumber {
  fullNumber: string;
  countryCallingCode: string;
}

const devAuthorizedNumbers: PhoneNumber[] = [];
loadDevAuthorizedNumbers();

async function goToPassportVerification() {
  await router.replace({ name: "/onboarding/step3-passport/" });
}

async function injectDevelopmentNumber(phoneItem: PhoneNumber) {
  const parsedNumber = parsePhoneNumberFromString(phoneItem.fullNumber);
  if (parsedNumber) {
    phoneData.phoneNumber = parsedNumber.nationalNumber;
    phoneData.countryCode = parsedNumber.country || null;
    await validateNumber();
  }
}

function loadDevAuthorizedNumbers() {
  if (processEnv.VITE_DEV_AUTHORIZED_PHONES) {
    const phoneList = processEnv.VITE_DEV_AUTHORIZED_PHONES.split(",");
    phoneList.forEach((number) => {
      const parsedNumber = parsePhoneNumberFromString(number);
      if (parsedNumber) {
        devAuthorizedNumbers.push({
          fullNumber: parsedNumber.number,
          countryCallingCode: parsedNumber.countryCallingCode,
        });
      } else {
        console.warn(
          "Failed to parse development number from string: " + number
        );
      }
    });
  }
}

function clearErrors() {
  phoneData.hasError = false;
  phoneData.errorMessage = "";
}

function setError(message: string) {
  phoneData.hasError = true;
  phoneData.errorMessage = message;
}

function validatePhoneNumber(
  phoneNumber: string,
  countryCode: CountryCode
):
  | { isValid: false; error: string }
  | {
      isValid: true;
      parsedNumber: LibPhoneNumber;
      callingCode: SupportedCountryCallingCode;
    } {
  const parsedNumber = parsePhoneNumberFromString(phoneNumber, countryCode);

  if (!parsedNumber) {
    return { isValid: false, error: t("pleaseEnterValidPhone") };
  }

  // First: Check if country code is supported
  const callingCode = zodSupportedCountryCallingCode.safeParse(
    parsedNumber.countryCallingCode
  );
  if (!callingCode.success) {
    return { isValid: false, error: t("countryNotSupported") };
  }

  // Second: Check if phone number format is valid
  if (!parsedNumber.isValid()) {
    return { isValid: false, error: t("pleaseEnterValidPhone") };
  }

  // Third: Check if phone type is supported
  const isPhoneTypeNotSupported = !isPhoneNumberTypeSupported(
    parsedNumber.getType()
  );
  if (isPhoneTypeNotSupported) {
    return {
      isValid: false,
      error: t("phoneTypeNotSupported"),
    };
  }

  return { isValid: true, parsedNumber, callingCode: callingCode.data };
}

function onPhoneUpdate(_results: Results) {
  phoneData.hasAttemptedSubmission = false;
  clearErrors();

  if (phoneData.countryCode && phoneData.phoneNumber) {
    validatePhoneInRealTime();
  }
}

function onCountryCodeUpdate(_countryCode: CountryCode | null | undefined) {
  phoneData.hasAttemptedSubmission = false;
  clearErrors();

  if (phoneData.phoneNumber) {
    validatePhoneInRealTime();
  }
}

function validatePhoneInRealTime() {
  if (!phoneData.phoneNumber || !phoneData.countryCode) {
    phoneData.isValid = false;
    return;
  }

  try {
    const result = validatePhoneNumber(
      phoneData.phoneNumber,
      phoneData.countryCode
    );

    if (!result.isValid) {
      phoneData.errorMessage = result.error;
      phoneData.hasError = true;
      phoneData.isValid = false;
      return;
    }

    clearErrors();
    phoneData.isValid = true;
  } catch {
    phoneData.errorMessage = t("pleaseEnterValidPhone");
    phoneData.hasError = true;
    phoneData.isValid = false;
  }
}

function onPhoneBlur() {
  if (!phoneData.phoneNumber || !phoneData.countryCode || !phoneData.isValid) {
    return;
  }

  try {
    const parsedNumber = parsePhoneNumberFromString(
      phoneData.phoneNumber,
      phoneData.countryCode
    );

    if (parsedNumber && parsedNumber.isValid()) {
      phoneData.phoneNumber = parsedNumber.formatNational();
    }
  } catch (error) {
    console.warn("Failed to format phone number on blur:", error);
  }
}

async function validateNumber(): Promise<boolean> {
  try {
    phoneData.hasAttemptedSubmission = true;

    if (!phoneData.phoneNumber || !phoneData.countryCode) {
      setError(t("pleaseEnterPhoneNumber"));
      return false;
    }

    const result = validatePhoneNumber(
      phoneData.phoneNumber,
      phoneData.countryCode
    );

    if (!result.isValid) {
      setError(result.error);
      return false;
    }

    verificationPhoneNumber.value = {
      countryCallingCode: result.callingCode,
      internationalPhoneNumber: result.parsedNumber.number,
    };
    await router.push({ name: "/onboarding/step3-phone-2/" });
    return true;
  } catch (e) {
    console.error("Unexpected error during phone validation", e);
    setError(t("pleaseEnterValidPhone"));
    return false;
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.developmentSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 15px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;
}

.error-icon {
  font-size: 1rem;
  color: #dc2626;
}
</style>
