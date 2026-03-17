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
      auto-format="blur"
      no-validation-error
      aria-describedby="phone-error"
      @update="onPhoneUpdate"
      @country-code="onCountryCodeUpdate"
      @keydown.enter="submit"
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
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import type { MazInputPhoneNumberData } from "maz-ui/components/MazInputPhoneNumber";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { zodSupportedCountryCallingCode } from "src/shared/types/zod";
import { isPhoneNumberTypeSupported } from "src/shared-app-api/phone";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { processEnv } from "src/utils/processEnv";
import { reactive, ref } from "vue";

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

const lastMazResults = ref<MazInputPhoneNumberData | null>(null);

function clearErrors() {
  phoneData.hasError = false;
  phoneData.errorMessage = "";
}

function setError(message: string) {
  phoneData.hasError = true;
  phoneData.errorMessage = message;
}

function validateFromMazResults(results: MazInputPhoneNumberData) {
  if (!results.isValid || !results.countryCallingCode) {
    phoneData.isValid = false;
    return;
  }

  const callingCode = zodSupportedCountryCallingCode.safeParse(
    results.countryCallingCode
  );
  if (!callingCode.success) {
    phoneData.isValid = false;
    phoneData.hasError = true;
    phoneData.errorMessage = t("countryNotSupported");
    return;
  }

  if (!isPhoneNumberTypeSupported(results.type)) {
    phoneData.isValid = false;
    phoneData.hasError = true;
    phoneData.errorMessage = t("phoneTypeNotSupported");
    return;
  }

  clearErrors();
  phoneData.isValid = true;
}

function onPhoneUpdate(results: MazInputPhoneNumberData) {
  lastMazResults.value = results;
  phoneData.hasAttemptedSubmission = false;
  clearErrors();
  validateFromMazResults(results);
}

function onCountryCodeUpdate(_countryCode: CountryCode | null | undefined) {
  phoneData.hasAttemptedSubmission = false;
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
  phoneData.hasAttemptedSubmission = true;

  if (!lastMazResults.value || !phoneData.phoneNumber) {
    setError(t("pleaseEnterPhoneNumber"));
    return false;
  }

  const results = lastMazResults.value;

  if (!results.isValid || !results.e164 || !results.countryCallingCode) {
    setError(t("pleaseEnterValidPhone"));
    return false;
  }

  const callingCode = zodSupportedCountryCallingCode.safeParse(
    results.countryCallingCode
  );
  if (!callingCode.success) {
    setError(t("countryNotSupported"));
    return false;
  }

  if (!isPhoneNumberTypeSupported(results.type)) {
    setError(t("phoneTypeNotSupported"));
    return false;
  }

  verificationPhoneNumber.value = {
    countryCallingCode: callingCode.data,
    internationalPhoneNumber: results.e164,
  };
  emit("submit");
  return true;
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
