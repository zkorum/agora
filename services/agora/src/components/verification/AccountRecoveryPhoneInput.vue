<template>
  <PhoneInputForm
    ref="input"
    purpose="login"
    :is-loading="isLoading"
    :disabled="!phoneAuthAvailability.available || nextCodeWaitSeconds > 0"
    @submit="submitPhone"
  />
  <q-btn
    :loading="isLoading"
    :disable="!phoneAuthAvailability.available || nextCodeWaitSeconds > 0"
    :label="t('continue')"
    @click="input?.submit()"
  />
  <p v-if="failed || !phoneAuthAvailability.available" role="alert">
    {{ t("unavailable") }}
  </p>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { usePhoneSubmit } from "src/composables/verification/usePhoneSubmit";
import { nextTick, ref } from "vue";

import { accountRecoveryTranslations } from "./AccountRecovery.i18n";
import PhoneInputForm from "./PhoneInputForm.vue";

const emit = defineEmits<{ codeSent: [] }>();
const { t } = useComponentI18n(accountRecoveryTranslations);
const input = ref<InstanceType<typeof PhoneInputForm>>();
const failed = ref(false);
const fail = () => {
  failed.value = true;
};
const { submitPhone, isLoading, nextCodeWaitSeconds, phoneAuthAvailability } =
  usePhoneSubmit({
    purpose: "login",
    takeTurnstileToken: () => input.value?.takeTurnstileToken(),
    onNavigateToOtp: async () => {
      emit("codeSent");
      await nextTick();
    },
    onAlreadyHasCredential: fail,
    showNotifyMessage: fail,
    translations: {
      throttled: t("unavailable"),
      invalidPhoneNumber: t("unavailable"),
      restrictedPhoneType: t("unavailable"),
      somethingWrong: t("unavailable"),
    },
  });
</script>
