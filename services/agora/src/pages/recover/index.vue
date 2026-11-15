<template>
  <div class="recovery-page">
    <h1>{{ t("title") }}</h1>
    <p>{{ t("instructions") }}</p>
    <p v-if="auth.isGuestOrLoggedIn && mode === undefined">
      {{ t("activeAccount") }}
    </p>
    <template v-else>
      <template v-if="mode === undefined">
        <q-checkbox v-model="confirmed" :label="t('confirm')" />
        <q-btn
          :disable="!auth.isAuthInitialized || !confirmed || busy"
          :label="t('email')"
          @click="start('email')"
        />
        <q-btn
          :disable="!auth.isAuthInitialized || !confirmed || busy"
          :label="t('phone')"
          @click="start('phone')"
        />
        <q-btn
          :disable="!auth.isAuthInitialized || !confirmed || busy"
          :label="t('passport')"
          @click="start('passport')"
        />
        <q-btn
          v-if="guestKeyAvailable"
          :disable="!auth.isAuthInitialized || !confirmed || busy"
          :label="t('guest')"
          @click="start('guest')"
        />
        <p>{{ t("guestHelp") }}</p>
      </template>
      <template v-else-if="mode === 'email'">
        <AccountRecoveryEmailInput v-if="!otp" @code-sent="otp = true" />
        <template v-else>
          <EmailOtpForm
            ref="emailOtp"
            :recover-account="true"
            @change-identifier="otp = false"
          />
          <q-btn
            :loading="emailOtp?.isSubmitButtonLoading"
            :label="t('confirm')"
            @click="emailOtp?.nextButtonClicked()"
          />
        </template>
      </template>
      <template v-else-if="mode === 'phone'">
        <AccountRecoveryPhoneInput v-if="!otp" @code-sent="otp = true" />
        <template v-else>
          <PhoneOtpForm
            ref="phoneOtp"
            purpose="login"
            :recover-account="true"
            @change-identifier="otp = false"
          />
          <q-btn
            :loading="phoneOtp?.isSubmitButtonLoading"
            :label="t('confirm')"
            @click="phoneOtp?.nextButtonClicked()"
          />
        </template>
      </template>
      <RarimoVerificationForm
        v-else-if="mode === 'passport'"
        :recover-account="true"
      />
      <q-btn
        v-else-if="mode === 'guest'"
        :loading="busy"
        :label="t('confirm')"
        @click="restoreGuest"
      />
      <p v-if="failed" role="alert">{{ t("unavailable") }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { accountRecoveryTranslations } from "src/components/verification/AccountRecovery.i18n";
import AccountRecoveryEmailInput from "src/components/verification/AccountRecoveryEmailInput.vue";
import AccountRecoveryPhoneInput from "src/components/verification/AccountRecoveryPhoneInput.vue";
import EmailOtpForm from "src/components/verification/EmailOtpForm.vue";
import PhoneOtpForm from "src/components/verification/PhoneOtpForm.vue";
import RarimoVerificationForm from "src/components/verification/RarimoVerificationForm.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import { useAuthenticationStore } from "src/stores/authentication";
import { useAccountRecoveryApi } from "src/utils/api/accountRecovery";
import { hasGuestRecoveryKey } from "src/utils/auth/guestRecoveryKey";
import { buildUcanForRequest } from "src/utils/crypto/ucan/operation";
import { onMounted, ref } from "vue";

usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});
const { t } = useComponentI18n(accountRecoveryTranslations);
const auth = useAuthenticationStore();
const confirmed = ref(false);
const mode = ref<"email" | "phone" | "passport" | "guest">();
const otp = ref(false);
const busy = ref(false);
const failed = ref(false);
const guestKeyAvailable = ref(false);
const emailOtp = ref<InstanceType<typeof EmailOtpForm>>();
const phoneOtp = ref<InstanceType<typeof PhoneOtpForm>>();
const { completeVerification } = useVerificationComplete();
const { recoverGuestAccount } = useAccountRecoveryApi();
onMounted(async () => {
  try {
    guestKeyAvailable.value = await hasGuestRecoveryKey();
  } catch {
    // Registered credential recovery does not depend on local guest-key storage.
    guestKeyAvailable.value = false;
  }
});

async function start(selected: NonNullable<typeof mode.value>) {
  if (
    !auth.isAuthInitialized ||
    !confirmed.value ||
    auth.isGuestOrLoggedIn ||
    busy.value
  )
    return;
  busy.value = true;
  try {
    await buildUcanForRequest({
      pathname: "/api/v1/auth/check-login-status",
      method: "POST",
      keyAction: "overwrite",
    });
    mode.value = selected;
  } catch {
    failed.value = true;
  } finally {
    busy.value = false;
  }
}
async function restoreGuest() {
  if (busy.value) return;
  busy.value = true;
  try {
    const result = await recoverGuestAccount();
    if (result.success) await completeVerification();
    else failed.value = true;
  } catch {
    failed.value = true;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.recovery-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}
h1 {
  font-size: 1.5rem;
  line-height: 1.3;
}
</style>
