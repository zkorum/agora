import type { Ref } from "vue";
import { onUnmounted, ref } from "vue";
import type { RouteLocationNormalized } from "vue-router";
import { onBeforeRouteLeave, useRouter } from "vue-router";

/**
 * Callback function to execute before actually leaving the route
 */
type BeforeLeaveCallback = () => void | Promise<void>;

export interface RouteGuardState {
  /** Whether to show an exit confirmation dialog */
  showExitDialog: Ref<boolean>;
}

export interface RouteGuardActions {
  lockRoute: () => void;
  unlockRoute: () => void;
  isRouteLockedCheck: () => boolean;
  proceedWithNavigation: (
    beforeLeaveCallback?: BeforeLeaveCallback
  ) => Promise<void>;
}

export interface RouteGuardComposable
  extends RouteGuardState,
    RouteGuardActions {}

/**
 * Vue Router stores the history position in window.history.state.position.
 * Returns null if the position is not available.
 */
function getHistoryPosition(): number | null {
  const position: unknown = window.history.state?.position;
  return typeof position === "number" ? position : null;
}

export function useRouteGuard(
  beforeUnloadShouldBlockCallback: () => boolean,
  beforeRouteLeaveCallback: (to: RouteLocationNormalized) => boolean
): RouteGuardComposable {
  const router = useRouter();

  // State
  const isRouteLocked = ref(false);
  const showExitDialog = ref(false);
  const pendingRoute = ref<RouteLocationNormalized | null>(null);
  let lockedHistoryPosition: number | null = null;

  // Shared helper: block navigation and show the exit dialog
  function blockAndShowDialog(destination: RouteLocationNormalized): void {
    pendingRoute.value = destination;
    showExitDialog.value = true;
  }

  // Store original beforeunload handler to restore on cleanup
  const originalBeforeUnload = window.onbeforeunload;

  // Set up browser beforeunload handler
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    const shouldBlock = beforeUnloadShouldBlockCallback();
    if (shouldBlock) {
      event.preventDefault();
      return "Changes that you made may not be saved.";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  // Set up Vue Router guard (handles router.push / router.replace navigations)
  onBeforeRouteLeave((to, from, next) => {
    if (!isRouteLocked.value) {
      next();
      return;
    }

    if (beforeRouteLeaveCallback(to)) {
      next();
      return;
    }

    blockAndShowDialog(to);
    next(false);
  });

  // Set up popstate interceptor (handles browser back/forward and router.go)
  // Registered in capture phase to fire BEFORE Vue Router's bubble-phase listener
  let ignoreNextPopState = false;

  function handlePopState(event: PopStateEvent): void {
    if (ignoreNextPopState) {
      ignoreNextPopState = false;
      return;
    }

    if (!isRouteLocked.value) return;
    if (!beforeUnloadShouldBlockCallback()) return;

    // Capture destination before restoring position
    const destinationPath =
      window.location.pathname + window.location.search + window.location.hash;
    const destinationRoute = router.resolve(destinationPath);

    // Check if the guard would allow this navigation
    if (beforeRouteLeaveCallback(destinationRoute)) return;

    // Calculate delta to restore history position
    const newPosition = getHistoryPosition();
    if (lockedHistoryPosition === null || newPosition === null) return;
    const delta = lockedHistoryPosition - newPosition;
    if (delta === 0) return;

    // Block: prevent Vue Router from seeing this popstate, restore position
    event.stopImmediatePropagation();
    ignoreNextPopState = true;
    window.history.go(delta);

    blockAndShowDialog(destinationRoute);
  }

  window.addEventListener("popstate", handlePopState, true);

  // Clean up on component unmount
  onUnmounted(() => {
    window.removeEventListener("popstate", handlePopState, true);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.onbeforeunload = originalBeforeUnload;
  });

  const lockRoute = (): void => {
    isRouteLocked.value = true;
    lockedHistoryPosition = getHistoryPosition();
  };

  const unlockRoute = (): void => {
    isRouteLocked.value = false;
    pendingRoute.value = null;
    showExitDialog.value = false;
    lockedHistoryPosition = null;
  };

  const isRouteLockedCheck = (): boolean => {
    return isRouteLocked.value;
  };

  const proceedWithNavigation = async (
    beforeLeaveCallback?: BeforeLeaveCallback
  ): Promise<void> => {
    if (!pendingRoute.value) {
      console.warn("No pending route to navigate to");
      return;
    }

    try {
      // Execute any cleanup before leaving
      if (beforeLeaveCallback) {
        await beforeLeaveCallback();
      }

      // Unlock the route and navigate
      const targetRoute = pendingRoute.value;
      unlockRoute();

      await router.push(targetRoute);
    } catch (error) {
      console.error("Failed to navigate to pending route:", error);
      // Re-lock the route if navigation failed
      lockRoute();
      throw error;
    }
  };

  return {
    showExitDialog,
    lockRoute,
    unlockRoute,
    isRouteLockedCheck,
    proceedWithNavigation,
  };
}
