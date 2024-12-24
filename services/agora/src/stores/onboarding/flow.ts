import { defineStore } from "pinia";
import { ref } from "vue";

export const onboardingFlowStore = defineStore("onboardingFlow", () => {
  const onboardingMode = ref<"LOGIN" | "SIGNUP">("LOGIN");

  return { onboardingMode };
});
