<template>
  <div class="container">
    <div>{{ t("emailDescription") }}</div>

    <q-input
      v-model="emailData.email"
      type="email"
      name="email"
      autocomplete="email"
      outlined
      autofocus
      :placeholder="t('emailPlaceholder')"
      @update:model-value="onEmailUpdate"
      @blur="onEmailBlur"
    />

    <div
      v-if="
        emailData.hasBeenBlurred && emailData.hasError && emailData.errorMessage
      "
      class="error-text"
      role="alert"
      aria-live="polite"
    >
      {{ emailData.errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { normalizeEmail, zodEmail } from "src/shared/types/zod-email";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { reactive } from "vue";

import {
  type EmailInputFormTranslations,
  emailInputFormTranslations,
} from "./EmailInputForm.i18n";

const emit = defineEmits<{
  submit: [];
}>();

const { t } = useComponentI18n<EmailInputFormTranslations>(
  emailInputFormTranslations
);

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

function clearErrors() {
  emailData.hasError = false;
  emailData.errorMessage = "";
}

function setError(message: string) {
  emailData.hasError = true;
  emailData.errorMessage = message;
}

function validateAndSetErrors() {
  const email = normalizeEmail(String(emailData.email ?? ""));

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

function onEmailUpdate(value: string | number | null) {
  const email = normalizeEmail(String(value ?? ""));
  emailData.email = email;
  emailData.isValid = email !== "" && isValidEmail(email);

  if (emailData.hasBeenBlurred) {
    validateAndSetErrors();
  }
}

function onEmailBlur() {
  emailData.hasBeenBlurred = true;
  validateAndSetErrors();
}

function getIsValid(): boolean {
  return !emailData.hasBeenBlurred || emailData.isValid;
}

function submit(): boolean {
  emailData.hasBeenBlurred = true;
  validateAndSetErrors();

  if (!emailData.isValid) {
    return false;
  }

  const email = normalizeEmail(String(emailData.email ?? ""));
  emailData.email = email;
  verificationEmail.value = email;
  emit("submit");
  return true;
}

defineExpose({ submit, getIsValid });
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
</style>
