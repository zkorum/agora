import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthenticationStore = defineStore("authentication", () => {
  const verificationPhoneNumber = ref("");
  const verificationDefaultCallingCode = ref("");
  const isAuthenticated = useStorage("isAuthenticated", false);

  return {
    isAuthenticated,
    verificationPhoneNumber,
    verificationDefaultCallingCode,
  };
});
