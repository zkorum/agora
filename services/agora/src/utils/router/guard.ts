import { onboardingFlowStore } from "src/stores/onboarding/flow";
import type { RouteRecordName } from "vue-router";
import { useRouter } from "vue-router";

export function useRouterGuard() {
  const router = useRouter();

  const onboardingRoutes: RouteRecordName[] = [
    "/onboarding/step1-login/",
    "/onboarding/step1-signup/",
    "/onboarding/step2-signup/",
    "/onboarding/step3-email-1/",
    "/onboarding/step3-email-2/",
    "/onboarding/step3-passport/",
    "/onboarding/step3-phone-1/",
    "/onboarding/step3-phone-2/",
    "/onboarding/step4-username/",
    "/onboarding/step5-experience-deprecated/",
    "/verify/identity/",
    "/verify/email/",
    "/verify/email-code/",
    "/verify/phone/",
    "/verify/phone-code/",
    "/verify/passport/",
  ];

  async function firstLoadGuard(toName: RouteRecordName) {
    const unauthenticatedRoutes: RouteRecordName[] = [
      ...onboardingRoutes,
      "/",
      "/welcome/",
      "/conversation/[postSlugId]",
      "/conversation/[postSlugId]/",
      "/conversation/[postSlugId]/analysis",
      "/conversation/[postSlugId].embed",
      "/conversation/new/create/",
      "/conversation/new/review/",
      "/legal/privacy/",
      "/legal/terms/",
      "/legal/guidelines/",
      "/settings/",
      "/settings/languages/",
      "/settings/languages/display-language/",
      "/settings/languages/spoken-languages/",
      "/topic/[topicCode]",
      "/topics/",
    ];

    if (!unauthenticatedRoutes.includes(toName)) {
      await router.push({ name: "/welcome/" });
    }
  }

  function conversationGuard(
    toName: RouteRecordName,
    fromName: RouteRecordName
  ): "home" | "ignore" {
    if (
      fromName == "/conversation/[postSlugId]" ||
      fromName == "/conversation/[postSlugId]/"
    ) {
      // Allow navigation to onboarding when doing a credential upgrade
      // (e.g., user needs email/phone verification to participate)
      const flowStore = onboardingFlowStore();
      if (flowStore.credentialUpgradeTarget !== null) {
        return "ignore";
      }

      if (onboardingRoutes.includes(toName) && toName != "/") {
        return "home";
      }
    }

    return "ignore";
  }

  return { firstLoadGuard, conversationGuard };
}
