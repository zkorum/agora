import { useAuthenticationStore } from "src/stores/authentication";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import type { Router,RouteRecordName } from "vue-router";

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
    "/verify/identity/",
    "/verify/email/",
    "/verify/email-code/",
    "/verify/phone/",
    "/verify/phone-code/",
    "/verify/passport/",
  ];

// Login/onboarding pages that logged-in users should never see.
// Excludes step4-username (reached right after isLoggedIn becomes true during signup)
// and /verify/* pages (used for credential upgrades on gated conversations).
const loginAndOnboardingRoutes: RouteRecordName[] = [
    "/welcome/",
    "/onboarding/step1-login/",
    "/onboarding/step1-signup/",
    "/onboarding/step2-signup/",
    "/onboarding/step3-email-1/",
    "/onboarding/step3-email-2/",
    "/onboarding/step3-passport/",
    "/onboarding/step3-phone-1/",
    "/onboarding/step3-phone-2/",
  ];

export function useRouterGuard() {
  async function firstLoadGuard({
    toName,
    router,
  }: {
    toName: RouteRecordName;
    router: Router;
  }) {
    const unauthenticatedRoutes: RouteRecordName[] = [
      ...onboardingRoutes,
      "/",
      "/welcome/",
      "/conversation/[postSlugId]",
      "/conversation/[postSlugId]/",
      "/conversation/[postSlugId]/analysis",
      "/conversation/[postSlugId].embed",
      "/conversation/[postSlugId].embed/",
      "/conversation/[postSlugId].embed/analysis",
      "/conversation/[conversationSlugId]/report",
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
      await router.push({ name: "/" });
    }
  }

  function conversationGuard(
    toName: RouteRecordName,
    fromName: RouteRecordName
  ): "home" | "ignore" {
    if (
      fromName == "/conversation/[postSlugId]" ||
      fromName == "/conversation/[postSlugId]/" ||
      fromName == "/conversation/[postSlugId].embed" ||
      fromName == "/conversation/[postSlugId].embed/"
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

  function loggedInGuard(toName: RouteRecordName): "home" | "ignore" {
    const authStore = useAuthenticationStore();
    if (authStore.isLoggedIn && loginAndOnboardingRoutes.includes(toName)) {
      return "home";
    }
    return "ignore";
  }

  return { firstLoadGuard, conversationGuard, loggedInGuard };
}
