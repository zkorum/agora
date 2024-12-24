import { defineStore } from "pinia";
import { ref } from "vue";

export const phoneVerificationStore = defineStore("phoneVerification", () => {
  interface PhoneNumberInterface {
    phoneNumber: string;
    defaultCallingCode: string;
  }

  const EMPTY_NUMBER: PhoneNumberInterface = {
    phoneNumber: "",
    defaultCallingCode: "",
  };

  const verificationPhoneNumber = ref(EMPTY_NUMBER);

  return { verificationPhoneNumber };
});
