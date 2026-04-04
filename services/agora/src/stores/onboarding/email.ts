import { defineStore } from "pinia";
import { ref } from "vue";

export const emailVerificationStore = defineStore("emailVerification", () => {
  const verificationEmail = ref("");
  const requestCodeThrottleUntil = ref<Date | null>(null);
  const pendingOtpData = ref<{
    codeExpiry: Date;
    nextCodeSoonestTime: Date;
  } | null>(null);

  return { verificationEmail, requestCodeThrottleUntil, pendingOtpData };
});
