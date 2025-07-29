<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="validateNumber">
        <StepperLayout
          :submit-call-back="validateNumber"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="
            phoneData.phoneNumber !== null &&
            phoneData.phoneNumber?.length > 0 &&
            !phoneData.hasError &&
            phoneData.isValid
          "
          :show-next-button="true"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              title="Verify with phone number"
              :description="''"
              icon-name="mdi-phone"
            />
          </template>

          <template #body>
            <div class="container">
              <div>You will receive a 6-digit one-time code by SMS</div>

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
                :only-countries="supportedCountries"
                placeholder="Phone number"
                required
                aria-describedby="phone-error"
                @update="onPhoneUpdate"
                @country-code="onCountryCodeUpdate"
              />

              <div
                v-if="phoneData.hasError && phoneData.errorMessage"
                id="phone-error"
                class="error-message"
                role="alert"
                aria-live="polite"
              >
                <q-icon name="mdi-alert-circle" class="error-icon" />
                <span>{{ phoneData.errorMessage }}</span>
              </div>

              <ZKButton
                button-type="largeButton"
                label="I'd prefer to login with complete privacy"
                text-color="primary"
                @click="goToPassportVerification()"
              />

              <div v-if="devAuthorizedNumbers.length > 0">
                <div class="developmentSection">
                  <div>Development Numbers:</div>

                  <div
                    v-for="authorizedNumber in devAuthorizedNumbers"
                    :key="authorizedNumber.fullNumber"
                  >
                    <ZKButton
                      button-type="largeButton"
                      color="blue"
                      :label="authorizedNumber.fullNumber"
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
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { reactive } from "vue";
import {
  parsePhoneNumberFromString,
  getCountries,
  type CountryCode,
  type PhoneNumber as LibPhoneNumber,
} from "libphonenumber-js/mobile";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import {
  zodSupportedCountryCallingCode,
  type SupportedCountryCallingCode,
} from "src/shared/types/zod";
import { isPhoneNumberTypeSupported } from "src/shared/shared";
import type { Results } from "maz-ui/components/MazPhoneNumberInput";
import MazPhoneNumberInput from "maz-ui/components/MazPhoneNumberInput";

const router = useRouter();

const phoneData = reactive({
  phoneNumber: null as string | null,
  countryCode: null as CountryCode | null,
  isValid: false,
  hasError: false,
  errorMessage: "" as string,
});

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

const supportedCountries: CountryCode[] = getCountries();

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
  if (process.env.VITE_DEV_AUTHORIZED_PHONES) {
    const phoneList = process.env.VITE_DEV_AUTHORIZED_PHONES.split(",");
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
    return { isValid: false, error: "Please enter a valid phone number" };
  }

  // First: Check if country code is supported
  const callingCode = zodSupportedCountryCallingCode.safeParse(
    parsedNumber.countryCallingCode
  );
  if (!callingCode.success) {
    return { isValid: false, error: "This country is not supported yet" };
  }

  // Second: Check if phone number format is valid
  if (!parsedNumber.isValid()) {
    return { isValid: false, error: "Please enter a valid phone number" };
  }

  // Third: Check if phone type is supported
  const isPhoneTypeNotSupported = !isPhoneNumberTypeSupported(
    parsedNumber.getType()
  );
  if (isPhoneTypeNotSupported) {
    return {
      isValid: false,
      error: "This phone number type is not supported for security reasons",
    };
  }

  return { isValid: true, parsedNumber, callingCode: callingCode.data };
}

function onPhoneUpdate(results: Results) {
  phoneData.phoneNumber = results.phoneNumber ?? "";
  phoneData.countryCode = results.countryCode ?? null;

  clearErrors();

  // Validate in real-time
  if (phoneData.countryCode && phoneData.phoneNumber) {
    validatePhoneInRealTime();
  }
}

function onCountryCodeUpdate(countryCode: CountryCode | null | undefined) {
  phoneData.countryCode = countryCode || null;

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
      setError(result.error);
      phoneData.isValid = false;
      return;
    }

    phoneData.isValid = true;
  } catch {
    setError("Please enter a valid phone number");
    phoneData.isValid = false;
  }
}

async function validateNumber(): Promise<boolean> {
  try {
    if (
      phoneData.hasError ||
      !phoneData.phoneNumber ||
      !phoneData.countryCode
    ) {
      return false;
    }

    const result = validatePhoneNumber(
      phoneData.phoneNumber,
      phoneData.countryCode
    );

    if (!result.isValid) {
      console.error("Unexpected: phone number validation failed");
      setError(result.error);
      return false;
    }

    verificationPhoneNumber.value = {
      defaultCallingCode: result.callingCode,
      phoneNumber: result.parsedNumber.number,
    };
    await router.push({ name: "/onboarding/step3-phone-2/" });
    return true;
  } catch (e) {
    console.error("Unexpected error during phone validation", e);
    setError("Please enter a valid phone number");
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
