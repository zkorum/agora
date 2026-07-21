import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type { DeviceLoginStatus } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useNotificationStore } from "src/stores/notification";
import { useTopicStore } from "src/stores/topic";
import { useUserStore } from "src/stores/user";
import { useRoute, useRouter } from "vue-router";

import { resetLocalAuthState } from "../auth/localAuthState";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { queryClient } from "../query/client";
import { useRouterGuard } from "../router/guard";
import { api } from "./client";
import { useCommonApi } from "./common";
import { getErrorLogContext } from "./errorLog";
import { runNotificationRefreshInBackground } from "./notification/requestError";

export interface AuthStateUpdateResult {
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}

const unknownDeviceLoginStatus = {
  isKnown: false,
  isLoggedIn: false,
  isRegistered: false,
  credentials: { email: null, phone: null, rarimo: null },
} satisfies DeviceLoginStatus;

function isUnauthorizedResponse(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export function useBackendAuthApi() {
  const { buildEncodedUcan } = useCommonApi();
  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);

  const { loadUserProfile } = useUserStore();
  const { loadTopicsData } = useTopicStore();
  const { refreshNotificationData } = useNotificationStore();
  const { loadLanguagePreferencesFromBackend } = useLanguageStore();

  const route = useRoute();
  const router = useRouter();

  const { firstLoadGuard } = useRouterGuard();

  async function getDeviceLoginStatus(): Promise<DeviceLoginStatus> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const resp = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthCheckLoginStatusPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return resp.data.loggedInStatus as DeviceLoginStatus;
    //NOTE: DO NOT return false on error! You would wipe out the user session at the first backend interruption.
  }

  async function logoutFromServer() {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthLogoutPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const otpDetails = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthLogoutPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return { data: otpDetails.data };
  }

  async function loadAuthenticatedModules() {
    await loadUserProfile();

    void (async () => {
      try {
        await Promise.all([
          runNotificationRefreshInBackground(refreshNotificationData),
          loadTopicsData(),
          loadLanguagePreferencesFromBackend(),
        ]);
      } catch (error) {
        console.error(
          "Background module load failed",
          getErrorLogContext(error)
        );
      }
    })();
  }

  // update the global state according to the change in login status
  async function updateAuthState({
    partialLoginStatus,
    forceRefresh = false,
    deferCacheOperations = false,
  }: {
    partialLoginStatus: Partial<DeviceLoginStatus>;
    forceRefresh?: boolean;
    deferCacheOperations?: boolean;
  }): Promise<AuthStateUpdateResult> {
    try {
      const {
        oldLoginStatus,
        newLoginStatus,
        oldIsGuestOrLoggedIn,
        newIsGuestOrLoggedIn,
      } = authStore.setLoginStatus(partialLoginStatus);
      if (
        (oldLoginStatus.isKnown !== newLoginStatus.isKnown || forceRefresh) &&
        newLoginStatus.isKnown == false
      ) {
        await logoutDataCleanup({
          shouldClearLanguagePreferences:
            oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
        });
        if (route.name) {
          await firstLoadGuard({ toName: route.name, router });
        }
        return { authStateChanged: true, needsCacheRefresh: false };
      }

      // Extract userId from old and new status for comparison
      const oldUserId = oldLoginStatus.isKnown
        ? oldLoginStatus.userId
        : undefined;
      const newUserId = newLoginStatus.isKnown
        ? newLoginStatus.userId
        : undefined;
      const userIdChanged = oldUserId !== newUserId;

      const authStateChanged =
        oldIsGuestOrLoggedIn !== newIsGuestOrLoggedIn || userIdChanged;

      if (forceRefresh || authStateChanged)
        if (newIsGuestOrLoggedIn) {
          // Check if we should defer cache operations
          if (deferCacheOperations) {
            return { authStateChanged: true, needsCacheRefresh: true };
          }

          // Only clear/invalidate cache when auth actually changed.
          // On HMR remounts, forceRefresh is true but Pinia state persists
          // (oldIsGuestOrLoggedIn === newIsGuestOrLoggedIn), so we skip cache
          // clearing to avoid wiping the feed and causing a "..." spinner.
          if (authStateChanged) {
            // Detect if this is a new guest creation (anonymous → guest)
            const newIsGuest =
              newLoginStatus.isKnown && !newLoginStatus.isRegistered;
            const isNewGuestCreation = !oldIsGuestOrLoggedIn && newIsGuest;

            if (isNewGuestCreation) {
              // For new guests: preserve in-flight caches, invalidate everything else
              await queryClient.invalidateQueries({
                predicate: (query) => {
                  const queryKey = query.queryKey[0];
                  // Preserve caches with in-flight optimistic updates
                  if (queryKey === "userVotes") return false;
                  if (queryKey === "comments") return false;
                  if (queryKey === "maxdiff-items") return false;
                  if (queryKey === "maxdiff-load") return false;
                  // Invalidate everything else (user profile, etc.)
                  return true;
                },
              });
            } else {
              // For other transitions (login, logout, account switch): clear everything
              queryClient.clear();
            }
          }

          await loadAuthenticatedModules();
          return { authStateChanged: true, needsCacheRefresh: false };
        } else {
          await logoutDataCleanup({
            shouldClearLanguagePreferences:
              oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
          });
          if (route.name) {
            await firstLoadGuard({ toName: route.name, router });
          }
          return { authStateChanged: true, needsCacheRefresh: false };
        }

      return { authStateChanged: false, needsCacheRefresh: false };
    } catch (e) {
      console.error("Failed to update authentication state", e);
      return { authStateChanged: false, needsCacheRefresh: false };
    }
  }

  async function refreshAuthState(): Promise<AuthStateUpdateResult> {
    try {
      const deviceLoginStatus = await getDeviceLoginStatus();
      return await updateAuthState({
        partialLoginStatus: deviceLoginStatus,
        forceRefresh: true,
      });
    } catch (error) {
      if (isUnauthorizedResponse(error)) {
        return await updateAuthState({
          partialLoginStatus: unknownDeviceLoginStatus,
          forceRefresh: true,
        });
      }

      throw error;
    }
  }

  async function initializeAuthState() {
    try {
      await refreshAuthState();
    } finally {
      isAuthInitialized.value = true;
    }
  }

  async function logoutDataCleanup({
    shouldClearLanguagePreferences,
  }: {
    shouldClearLanguagePreferences: boolean;
  }) {
    await resetLocalAuthState({ shouldClearLanguagePreferences });
  }

  return {
    logoutFromServer,
    getDeviceLoginStatus,
    updateAuthState,
    refreshAuthState,
    initializeAuthState,
    loadAuthenticatedModules,
  };
}
