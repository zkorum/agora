import { defineStore } from "pinia";
import { ref } from "vue";

export const emailVerificationStore = defineStore("emailVerification", () => {
  const verificationEmail = ref("");

  return { verificationEmail };
});
