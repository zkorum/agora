import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import {
  listAuthSessionsResponse,
  logoutAllAuthSessionsResponse,
  revokeAuthSessionResponse,
} from "src/shared/types/dto-auth";
import type { DeviceLoginStatus } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useNotificationStore } from "src/stores/notification";
import { useTopicStore } from "src/stores/topic";
import { useUserStore } from "src/stores/user";
import { useRoute, useRouter } from "vue-router";

import {
  applyBackendAuthStatus,
  type AuthStatusTransition,
} from "../auth/backendAuthState";
import {
  clearAccountScopedState,
  resetLocalAuthState,
} from "../auth/localAuthState";
import {
  requestBackendAuthStatus,
  requestBackendDeviceLoginStatus,
} from "../auth/refreshAuthState";
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

export function useBackendAuthApi() {
  const { buildEncodedUcan } = useCommonApi();
  const authStore = useAuthenticationStore();

  const { loadUserProfile } = useUserStore();
  const { loadTopicsData } = useTopicStore();
  const { refreshNotificationData } = useNotificationStore();
  const { loadLanguagePreferencesFromBackend } = useLanguageStore();

  const route = useRoute();
  const router = useRouter();

  const { firstLoadGuard } = useRouterGuard();

  async function getDeviceLoginStatus(): Promise<DeviceLoginStatus> {
    const { loginStatus } = await requestBackendDeviceLoginStatus();
    return loginStatus;
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

  async function listAuthSessions() {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthSessionsListPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthSessionsListPost({
      headers: buildAuthorizationHeader(encodedUcan),
    });
    return listAuthSessionsResponse.parse(response.data);
  }

  async function revokeAuthSession(didWrite: string) {
    const request = { didWrite };
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthSessionsRevokePost(request);
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthSessionsRevokePost(request, {
      headers: buildAuthorizationHeader(encodedUcan),
    });
    return revokeAuthSessionResponse.parse(response.data);
  }

  async function logoutAllAuthSessions() {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthSessionsLogoutAllPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthSessionsLogoutAllPost({
      headers: buildAuthorizationHeader(encodedUcan),
    });
    return logoutAllAuthSessionsResponse.parse(response.data);
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

  async function processAuthStatusTransition({
    statusTransition,
    forceRefresh = false,
    deferCacheOperations = false,
  }: {
    statusTransition: AuthStatusTransition;
    forceRefresh?: boolean;
    deferCacheOperations?: boolean;
  }): Promise<AuthStateUpdateResult> {
    const {
      oldLoginStatus,
      newLoginStatus,
      oldIsGuestOrLoggedIn,
      newIsGuestOrLoggedIn,
    } = statusTransition;
    const oldUserId = oldLoginStatus.isKnown
      ? oldLoginStatus.userId
      : undefined;
    const newUserId = newLoginStatus.isKnown
      ? newLoginStatus.userId
      : undefined;
    const userIdChanged = oldUserId !== newUserId;
    const knownUserChanged =
      oldLoginStatus.isKnown && newLoginStatus.isKnown && userIdChanged;

    if (knownUserChanged) {
      clearAccountScopedState();
    }

    if (
      (oldLoginStatus.isKnown !== newLoginStatus.isKnown || forceRefresh) &&
      !newLoginStatus.isKnown
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

    const authStateChanged =
      oldIsGuestOrLoggedIn !== newIsGuestOrLoggedIn || userIdChanged;
    if (!forceRefresh && !authStateChanged) {
      return { authStateChanged: false, needsCacheRefresh: false };
    }
    if (!newIsGuestOrLoggedIn) {
      await logoutDataCleanup({
        shouldClearLanguagePreferences:
          oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
      });
      if (route.name) {
        await firstLoadGuard({ toName: route.name, router });
      }
      return { authStateChanged: true, needsCacheRefresh: false };
    }
    if (deferCacheOperations) {
      return { authStateChanged: true, needsCacheRefresh: true };
    }

    if (authStateChanged) {
      const isNewGuestCreation =
        !oldIsGuestOrLoggedIn &&
        newLoginStatus.isKnown &&
        !newLoginStatus.isRegistered;
      if (isNewGuestCreation) {
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey[0];
            return ![
              "userVotes",
              "comments",
              "maxdiff-items",
              "maxdiff-load",
            ].includes(String(queryKey));
          },
        });
      } else if (!knownUserChanged) {
        queryClient.clear();
      }
    }

    await loadAuthenticatedModules();
    return { authStateChanged: true, needsCacheRefresh: false };
  }

  // Apply trusted local state changes that are not tied to a backend status request.
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
      return await processAuthStatusTransition({
        statusTransition: authStore.setLoginStatus(partialLoginStatus),
        forceRefresh,
        deferCacheOperations,
      });
    } catch (error) {
      console.error("Failed to update authentication state", error);
      throw error;
    }
  }

  async function updateAuthStateFromBackend({
    loginStatus,
    didWrite,
  }: {
    loginStatus: DeviceLoginStatus;
    didWrite: string;
  }): Promise<AuthStateUpdateResult> {
    const application = await applyBackendAuthStatus({ loginStatus, didWrite });
    if (application.type === "ignored") {
      return { authStateChanged: false, needsCacheRefresh: false };
    }
    if (application.type === "reset") {
      if (route.name) {
        await firstLoadGuard({ toName: route.name, router });
      }
      return { authStateChanged: true, needsCacheRefresh: false };
    }
    return await processAuthStatusTransition({
      statusTransition: application.transition,
      forceRefresh: true,
    });
  }

  async function refreshAuthState(): Promise<AuthStateUpdateResult> {
    const { loginStatus, didWrite } = await requestBackendAuthStatus();
    return await updateAuthStateFromBackend({ loginStatus, didWrite });
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
    listAuthSessions,
    revokeAuthSession,
    logoutAllAuthSessions,
    getDeviceLoginStatus,
    updateAuthState,
    refreshAuthState,
    loadAuthenticatedModules,
  };
}
