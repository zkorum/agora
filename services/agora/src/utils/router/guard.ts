import { RouteRecordName, useRouter } from "vue-router";

export function useRouterGuard() {
  const router = useRouter();

  const onboardingRoutes: RouteRecordName[] = [
    "/onboarding/step1-login/",
    "/onboarding/step1-signup/",
    "/onboarding/step2-signup/",
    "/onboarding/step3-passport/",
    "/onboarding/step3-phone-1/",
    "/onboarding/step3-phone-2/",
    "/onboarding/step4-username/",
    "/onboarding/step5-preferences/",
    "/onboarding/step5-experience-deprecated/",
  ];

  async function firstLoadGuard(toName: RouteRecordName) {
    const unauthenticatedRoutes: RouteRecordName[] = [
      ...onboardingRoutes,
      "/",
      "/welcome/",
      "/conversation/[postSlugId]",
      "/conversation/create/",
      "/legal/privacy/",
      "/legal/terms/",
      "/settings/",
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
    if (fromName == "/conversation/[postSlugId]") {
      if (onboardingRoutes.includes(toName) && toName != "/") {
        return "home";
      }
    }

    return "ignore";
  }

  return { firstLoadGuard, conversationGuard };
}
