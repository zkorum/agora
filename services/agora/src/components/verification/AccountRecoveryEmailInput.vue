<template>
  <EmailInputForm ref="input" @submit="submitEmail" />
  <q-btn
    :loading="isLoading"
    :disable="nextCodeWaitSeconds > 0"
    :label="t('continue')"
    @click="input?.submit()"
  />
  <p v-if="failed" role="alert">{{ t("unavailable") }}</p>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useEmailSubmit } from "src/composables/verification/useEmailSubmit";
import { nextTick, ref } from "vue";

import { accountRecoveryTranslations } from "./AccountRecovery.i18n";
import EmailInputForm from "./EmailInputForm.vue";

const emit = defineEmits<{ codeSent: [] }>();
const { t } = useComponentI18n(accountRecoveryTranslations);
const input = ref<InstanceType<typeof EmailInputForm>>();
const failed = ref(false);
const fail = () => {
  failed.value = true;
};
const { submitEmail, isLoading, nextCodeWaitSeconds } = useEmailSubmit({
  onNavigateToOtp: async () => {
    emit("codeSent");
    await nextTick();
  },
  onAlreadyHasCredential: fail,
  showNotifyMessage: fail,
  translations: {
    throttled: t("unavailable"),
    unreachable: t("unavailable"),
    disposable: t("unavailable"),
    somethingWrong: t("unavailable"),
  },
});
</script>
