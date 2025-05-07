import { RouteMap, useRouter } from "vue-router";

export function useRouterGuard() {
  const router = useRouter();

  async function firstLoadGuard(toName: keyof RouteMap) {
    const onboardingRoutes: (keyof RouteMap)[] = [
      "/onboarding/step1-login/",
      "/onboarding/step1-signup/",
      "/onboarding/step2-signup/",
      "/onboarding/step3-passport/",
      "/onboarding/step3-phone-1/",
      "/onboarding/step3-phone-2/",
      "/onboarding/step4-username/",
      "/onboarding/step5-experience-deprecated/",
      "/onboarding/step5-preferences-deprecated/",
    ];

    const unauthenticatedRoutes: (keyof RouteMap)[] = [
      ...onboardingRoutes,
      "/",
      "/welcome/",
      "/conversation/[postSlugId]",
      "/conversation/create/",
      "/legal/privacy/",
      "/legal/terms/",
      "/settings/",
    ];

    if (!unauthenticatedRoutes.includes(toName)) {
      await router.push({ name: "/welcome/" });
    }
  }

  function onboardingGuard(
    toName: keyof RouteMap,
    fromName: keyof RouteMap
  ): {
    jumpToHome: boolean;
  } {
    if (fromName == "/conversation/[postSlugId]" || fromName == "/") {
      const postOnboardingStopRoutes: (keyof RouteMap)[] = [
        "/onboarding/step3-passport/",
        "/onboarding/step3-phone-1/",
        "/onboarding/step3-phone-2/",
        "/onboarding/step4-username/",
      ];

      if (postOnboardingStopRoutes.includes(toName)) {
        return { jumpToHome: true };
      } else {
        return { jumpToHome: false };
      }
    } else {
      return { jumpToHome: false };
    }
  }

  return { firstLoadGuard, onboardingGuard };
}
