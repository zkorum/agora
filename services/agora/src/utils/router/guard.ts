import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { RouteMap, useRouter } from "vue-router";

export function useRouterGuard() {
  const router = useRouter();

  const { isLoggedIn, isAuthInitialized } = storeToRefs(
    useAuthenticationStore()
  );

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

  async function firstLoadGuard(toName: keyof RouteMap) {
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

  function onboardingGuard(toName: keyof RouteMap): {
    skipOnboarding: boolean;
  } {
    if (isAuthInitialized.value) {
      if (isLoggedIn.value && onboardingRoutes.includes(toName)) {
        return { skipOnboarding: true };
      } else {
        return { skipOnboarding: false };
      }
    } else {
      return { skipOnboarding: false };
    }
  }

  return { firstLoadGuard, onboardingGuard };
}
