<template>
  <div class="container">
    <div>{{ t("smsDescription") }}</div>

    <ZKPhoneNumberInput
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

<script setup lang="ts">
import type { CountryCode } from "libphonenumber-js/max";
import {
  parsePhoneNumberFromString,
  type PhoneNumber as LibPhoneNumber,
} from "libphonenumber-js/max";
import type { MazInputPhoneNumberData } from "maz-ui/components/MazInputPhoneNumber";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type SupportedCountryCallingCode,
  zodSupportedCountryCallingCode,
} from "src/shared/types/zod";
import { isPhoneNumberTypeSupported } from "src/shared-app-api/phone";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { processEnv } from "src/utils/processEnv";
import { reactive } from "vue";

import ZKGradientButton from "../ui-library/ZKGradientButton.vue";
import ZKPhoneNumberInput from "../ui-library/ZKPhoneNumberInput.vue";
import {
  type PhoneInputFormTranslations,
  phoneInputFormTranslations,
} from "./PhoneInputForm.i18n";

const emit = defineEmits<{
  submit: [];
}>();

const { t } = useComponentI18n<PhoneInputFormTranslations>(
  phoneInputFormTranslations
);

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

  const callingCode = zodSupportedCountryCallingCode.safeParse(
    parsedNumber.countryCallingCode
  );
  if (!callingCode.success) {
    return { isValid: false, error: t("countryNotSupported") };
  }

  if (!parsedNumber.isValid()) {
    return { isValid: false, error: t("pleaseEnterValidPhone") };
  }

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

function onPhoneUpdate(_results: MazInputPhoneNumberData) {
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

function injectDevelopmentNumber(phoneItem: PhoneNumber) {
  const parsedNumber = parsePhoneNumberFromString(phoneItem.fullNumber);
  if (parsedNumber) {
    phoneData.phoneNumber = parsedNumber.nationalNumber;
    phoneData.countryCode = parsedNumber.country || null;
    submit();
  }
}

function submit(): boolean {
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
    emit("submit");
    return true;
  } catch (e) {
    console.error("Unexpected error during phone validation", e);
    setError(t("pleaseEnterValidPhone"));
    return false;
  }
}

defineExpose({ submit });
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
