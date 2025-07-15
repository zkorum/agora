import { defineStore } from "pinia";
import type { SupportedCountryCallingCode } from "src/shared/types/zod";
import { ref } from "vue";

export const phoneVerificationStore = defineStore("phoneVerification", () => {
  interface PhoneNumberInterface {
    phoneNumber: string;
    defaultCallingCode: SupportedCountryCallingCode;
  }

  const EMPTY_NUMBER: PhoneNumberInterface = {
    phoneNumber: "",
    defaultCallingCode: "33",
  };

  const verificationPhoneNumber = ref(EMPTY_NUMBER);

  return { verificationPhoneNumber };
});
