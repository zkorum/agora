import {
  isNavigationFailure,
  NavigationFailureType,
  type Router,
} from "vue-router";

export async function navigateHomeAfterLogout(router: Router): Promise<void> {
  const failure = await router.replace({ name: "/" });
  if (
    isNavigationFailure(failure) &&
    !isNavigationFailure(failure, NavigationFailureType.duplicated)
  ) {
    const navigationError: Error = failure;
    throw navigationError;
  }
}
