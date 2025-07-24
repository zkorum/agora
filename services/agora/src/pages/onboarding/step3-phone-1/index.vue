<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="">
        <StepperLayout
          :submit-call-back="validateNumber"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="
            phoneData.phoneNumber ? phoneData.phoneNumber.length > 0 : false
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

              <MazPhoneNumberInput
                v-model="phoneData.phoneNumber"
                v-model:country-code="phoneData.countryCode"
                :success="phoneData.isValid"
                :error="phoneData.hasError"
                show-code-on-list
                :preferred-countries="
                  ['US', 'CA', 'GB', 'FR', 'DE'] as CountryCode[]
                "
                :only-countries="supportedCountries"
                placeholder="Phone number"
                @update="onPhoneUpdate"
                @country-code="onCountryCodeUpdate"
              />

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
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js/mobile";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useNotify } from "src/utils/ui/notify";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import { zodSupportedCountryCallingCode } from "src/shared/types/zod";
import { isPhoneNumberTypeSupported } from "src/shared/shared";
import type { Results } from "maz-ui/components/MazPhoneNumberInput";
import MazPhoneNumberInput from "maz-ui/components/MazPhoneNumberInput";

const router = useRouter();

const phoneData = reactive({
  phoneNumber: "" as string | null,
  countryCode: null as CountryCode | null,
  isValid: false,
  hasError: false,
});

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

const { showNotifyMessage } = useNotify();

// Generate supported countries list for maz-ui
const supportedCountries: CountryCode[] = [];
const countryList = getCountries();
for (let i = 0; i < countryList.length; i++) {
  const country = countryList[i];
  const countryCode = getCountryCallingCode(country);
  const isSupported =
    zodSupportedCountryCallingCode.safeParse(countryCode).success;
  if (isSupported) {
    supportedCountries.push(country);
  }
}

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
        console.log(parsedNumber.number);
        devAuthorizedNumbers.push({
          fullNumber: parsedNumber.number,
          countryCallingCode: parsedNumber.countryCallingCode,
        });
      } else {
        console.log(
          "Failed to parse development number from string: " + number
        );
      }
    });
  }
}

function onPhoneUpdate(results: Results) {
  phoneData.phoneNumber = results.phoneNumber || "";
  phoneData.countryCode = results.countryCode || null;
  phoneData.isValid = results.isValid || false;
  phoneData.hasError = false;
}

function onCountryCodeUpdate(countryCode: CountryCode | null | undefined) {
  phoneData.countryCode = countryCode || null;
  validatePhoneInRealTime();
}

function validatePhoneInRealTime() {
  if (!phoneData.phoneNumber || !phoneData.countryCode) {
    phoneData.isValid = false;
    return;
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(
      phoneData.phoneNumber,
      phoneData.countryCode
    );
    phoneData.isValid = phoneNumber?.isValid() || false;
  } catch {
    phoneData.isValid = false;
  }
}

async function validateNumber() {
  try {
    phoneData.hasError = false;

    if (!phoneData.phoneNumber) {
      return false;
    }

    const phoneNumber = parsePhoneNumberFromString(
      phoneData.phoneNumber,
      phoneData.countryCode || undefined
    );

    if (!phoneNumber?.isValid()) {
      phoneData.hasError = true;
      showNotifyMessage(
        "Sorry, this phone number is invalid. Please check and try again."
      );
      return;
    }

    const callingCode = zodSupportedCountryCallingCode.safeParse(
      phoneNumber.countryCallingCode
    );
    if (!callingCode.success) {
      phoneData.hasError = true;
      showNotifyMessage("Sorry, this country code is not supported.");
      return;
    }

    const isPhoneTypeNotSupported = !isPhoneNumberTypeSupported(
      phoneNumber.getType()
    );
    if (isPhoneTypeNotSupported) {
      phoneData.hasError = true;
      showNotifyMessage(
        "Sorry, this phone number is not supported for security reasons. Please try another."
      );
      return;
    }

    // success
    verificationPhoneNumber.value = {
      defaultCallingCode: callingCode.data,
      phoneNumber: phoneNumber.number,
    };
    await router.push({ name: "/onboarding/step3-phone-2/" });
  } catch (e) {
    phoneData.hasError = true;
    console.error("Failed to parse phone number", e);
    showNotifyMessage(
      "Sorry, this phone number is invalid. Please check and try again."
    );
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
</style>
