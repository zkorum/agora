import { useAuthenticationStore } from "src/stores/authentication";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import type { Router, RouteRecordName } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

type RouteName = keyof RouteNamedMap;

const onboardingRoutes = [
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
    "/verify/hard/",
    "/verify/email/",
    "/verify/email-code/",
    "/verify/phone/",
    "/verify/phone-code/",
    "/verify/passport/",
  ] satisfies ReadonlyArray<RouteName>;

// Login/onboarding pages that logged-in users should never see.
// Excludes step4-username (reached right after isLoggedIn becomes true during signup)
// and /verify/* pages (used for credential upgrades on gated conversations).
const loginAndOnboardingRoutes = [
    "/welcome/",
    "/onboarding/step1-login/",
    "/onboarding/step1-signup/",
    "/onboarding/step2-signup/",
    "/onboarding/step3-email-1/",
    "/onboarding/step3-email-2/",
    "/onboarding/step3-passport/",
    "/onboarding/step3-phone-1/",
    "/onboarding/step3-phone-2/",
  ] satisfies ReadonlyArray<RouteName>;

function routeNameMatches({
  routeName,
  routeNames,
}: {
  routeName: RouteRecordName;
  routeNames: readonly string[];
}): boolean {
  if (typeof routeName !== "string") {
    return false;
  }

  return routeNames.some((candidate) => candidate === routeName);
}

export function useRouterGuard() {
  async function firstLoadGuard({
    toName,
    router,
  }: {
    toName: RouteRecordName;
    router: Router;
  }) {
    const unauthenticatedRoutes = [
      ...onboardingRoutes,
      "/",
      "/welcome/",
      "/conversation/[postSlugId]",
      "/conversation/[postSlugId]/",
      "/conversation/[postSlugId]/analysis",
      "/conversation/[postSlugId].embed",
      "/conversation/[postSlugId].embed/",
      "/conversation/[postSlugId].embed/analysis",
      "/conversation/[postSlugId].onboarding",
      "/conversation/[postSlugId].onboarding/",
      "/conversation/[postSlugId].onboarding/verify",
      "/conversation/[postSlugId].onboarding/verify/hard",
      "/conversation/[postSlugId].onboarding/verify/identity",
      "/conversation/[postSlugId].onboarding/verify/email",
      "/conversation/[postSlugId].onboarding/verify/email-code",
      "/conversation/[postSlugId].onboarding/verify/phone",
      "/conversation/[postSlugId].onboarding/verify/phone-code",
      "/conversation/[postSlugId].onboarding/verify/passport",
      "/conversation/[postSlugId].onboarding/verify/ticket",
      "/conversation/[postSlugId].onboarding/question.[questionSlugId]",
      "/conversation/[postSlugId].onboarding/summary",
      "/conversation/[postSlugId].onboarding/complete",
      "/conversation/[conversationSlugId]/report",
      "/project/[projectSlug]/conversation/[postSlugId]",
      "/project/[projectSlug]/conversation/[postSlugId]/",
      "/project/[projectSlug]/conversation/[postSlugId]/analysis",
      "/project/[projectSlug]/conversation/[postSlugId]/report",
      "/conversation/new/create/",
      "/conversation/new/seed/",
      "/conversation/new/survey/",
      "/conversation/new/review/",
      "/legal/privacy/",
      "/legal/terms/",
      "/legal/guidelines/",
      "/project/[projectSlug]",
      "/settings/",
      "/settings/languages/",
      "/settings/languages/display-language/",
      "/settings/languages/spoken-languages/",
      "/topic/[topicCode]",
      "/topics/",
    ] satisfies ReadonlyArray<RouteName>;

    if (
      !routeNameMatches({ routeName: toName, routeNames: unauthenticatedRoutes }) &&
      !isDevRouteAllowed(toName)
    ) {
      await router.push({ name: "/" });
    }
  }

  function isDevRouteAllowed(toName: RouteRecordName): boolean {
    return (
      import.meta.env.DEV &&
      typeof toName === "string" &&
      toName.startsWith("/dev/")
    );
  }

  function conversationGuard(
    toName: RouteRecordName,
    fromName: RouteRecordName
  ): "home" | "ignore" {
    if (
      fromName == "/conversation/[postSlugId]" ||
      fromName == "/conversation/[postSlugId]/" ||
      fromName == "/conversation/[postSlugId].embed" ||
      fromName == "/conversation/[postSlugId].embed/" ||
      fromName == "/project/[projectSlug]/conversation/[postSlugId]" ||
      fromName == "/project/[projectSlug]/conversation/[postSlugId]/"
    ) {
      // Allow navigation to onboarding when doing a credential upgrade
      // (e.g., user needs email/phone verification to participate)
      const flowStore = onboardingFlowStore();
      if (flowStore.credentialUpgradeTarget !== null) {
        return "ignore";
      }

      if (routeNameMatches({ routeName: toName, routeNames: onboardingRoutes }) && toName != "/") {
        return "home";
      }
    }

    return "ignore";
  }

  function loggedInGuard(toName: RouteRecordName): "home" | "ignore" {
    const authStore = useAuthenticationStore();
    if (
      authStore.isLoggedIn &&
      routeNameMatches({ routeName: toName, routeNames: loginAndOnboardingRoutes })
    ) {
      return "home";
    }
    return "ignore";
  }

  return { firstLoadGuard, conversationGuard, loggedInGuard };
}
