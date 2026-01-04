import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import type { RouteNamedMap } from "vue-router/auto-routes";

/**
 * Composable for handling authentication-based navigation logic
 * Provides utilities to check if routes require authentication
 */
export function useAuthenticatedNavigation() {
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  /**
   * Routes that require the user to be authenticated (logged in or guest)
   */
  const authRequiredRoutes: (keyof RouteNamedMap)[] = [
    "/notification/",
    "/user-profile/conversations/",
  ];

  /**
   * Check if a route requires authentication
   */
  function requiresAuth(route: keyof RouteNamedMap): boolean {
    return authRequiredRoutes.includes(route);
  }

  /**
   * Check if a route should be visible based on authentication state
   */
  function isRouteVisible(route: keyof RouteNamedMap): boolean {
    if (requiresAuth(route)) {
      return isGuestOrLoggedIn.value;
    }
    return true;
  }

  return {
    requiresAuth,
    isRouteVisible,
  };
}
