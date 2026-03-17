import { defineStore } from "pinia";
import { ref } from "vue";

export const onboardingFlowStore = defineStore("onboardingFlow", () => {
  const onboardingMode = ref<"LOGIN" | "SIGNUP">("LOGIN");

  // When non-null, the user is being routed through a streamlined credential
  // upgrade flow from a gated conversation (skips username + preferences).
  // "email" = needs email verification, "strong" = needs phone or Rarimo,
  // "any" = needs any credential (phone, Rarimo, or email).
  const credentialUpgradeTarget = ref<"email" | "strong" | "any" | null>(null);

  return { onboardingMode, credentialUpgradeTarget };
});
