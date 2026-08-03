import { defineStore } from "pinia";
import { ref } from "vue";

export const emailVerificationStore = defineStore("emailVerification", () => {
  const verificationEmail = ref("");
  const requestCodeThrottleUntil = ref<Date | null>(null);
  const pendingOtpData = ref<{
    codeExpiry: Date;
    nextCodeSoonestTime: Date;
  } | null>(null);

  function reset(): void {
    verificationEmail.value = "";
    requestCodeThrottleUntil.value = null;
    pendingOtpData.value = null;
  }

  return { verificationEmail, requestCodeThrottleUntil, pendingOtpData, reset };
});
