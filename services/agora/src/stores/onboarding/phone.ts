import { defineStore } from "pinia";
import type { SupportedCountryCallingCode } from "src/shared/types/zod";
import { ref } from "vue";

export const phoneVerificationStore = defineStore("phoneVerification", () => {
  interface PhoneVerificationData {
    internationalPhoneNumber: string;
    countryCallingCode: SupportedCountryCallingCode;
  }

  const EMPTY_NUMBER: PhoneVerificationData = {
    internationalPhoneNumber: "",
    countryCallingCode: "33",
  };

  const verificationPhoneNumber = ref(EMPTY_NUMBER);

  return { verificationPhoneNumber };
});
