import { onUnmounted, ref, Ref } from "vue";
import {
  onBeforeRouteLeave,
  RouteLocationNormalized,
  useRouter,
} from "vue-router";

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

export function useRouteGuard(
  beforeUnloadShouldBlockCallback: () => boolean,
  beforeRouteLeaveCallback: (to: RouteLocationNormalized) => boolean
): RouteGuardComposable {
  const router = useRouter();

  // State
  const isRouteLocked = ref(false);
  const showExitDialog = ref(false);
  const pendingRoute = ref<RouteLocationNormalized | null>(null);

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

  // Clean up on component unmount
  onUnmounted(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.onbeforeunload = originalBeforeUnload;
  });

  // Set up Vue Router guard
  onBeforeRouteLeave((to, from, next) => {
    // If route is not locked, allow navigation
    if (!isRouteLocked.value) {
      next();
      return;
    }

    // Check if custom callback allows navigation
    const shouldAllowNavigation = beforeRouteLeaveCallback(to);

    if (shouldAllowNavigation) {
      next();
    } else {
      // Block navigation and store the pending route
      pendingRoute.value = to;
      showExitDialog.value = true;
      next(false);
    }
  });

  const lockRoute = (): void => {
    isRouteLocked.value = true;
  };

  const unlockRoute = (): void => {
    isRouteLocked.value = false;
    pendingRoute.value = null;
    showExitDialog.value = false;
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
