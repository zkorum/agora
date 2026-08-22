import type { RouteRecordName } from "vue-router";

const nonDrawerRoutePatterns = [
  "/onboarding/",
  "/project/[projectSlug]",
  "/verify/",
  "/welcome",
  "/conversation/[postSlugId].onboarding",
  "/[...all]",
];

export function shouldUseDrawerLayout(
  routeName: RouteRecordName | null | undefined
): boolean {
  if (routeName === undefined || routeName === null) {
    return false;
  }

  const name = String(routeName);
  if (name.includes(".embed")) {
    return false;
  }
  return !nonDrawerRoutePatterns.some((pattern) => name.startsWith(pattern));
}
