import { storeToRefs } from "pinia";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type { DeviceLoginStatus } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useLanguageStore } from "src/stores/language";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useNotificationStore } from "src/stores/notification";
import { useTopicStore } from "src/stores/topic";
import { useUserStore } from "src/stores/user";
import { useRoute } from "vue-router";

import { resetZupassModuleState } from "../../composables/zupass/useZupassVerification";
import { useNewPostDraftsStore } from "../../stores/newConversationDrafts";
import { buildAuthorizationHeader, deleteDid } from "../crypto/ucan/operation";
import { queryClient } from "../query/client";
import { useRouterGuard } from "../router/guard";
import { api } from "./client";
import { useCommonApi } from "./common";

export function useBackendAuthApi() {
  const { buildEncodedUcan } = useCommonApi();
  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);
  const { loadPostData } = useHomeFeedStore();
  const { loadUserProfile, clearProfileData } = useUserStore();
  const { loadTopicsData, clearTopicsData } = useTopicStore();
  const { loadNotificationData } = useNotificationStore();
  const { resetDraft } = useNewPostDraftsStore();
  const { clearOpinionDrafts } = useNewOpinionDraftsStore();
  const { clearNotificationData } = useNotificationStore();
  const { clearLanguagePreferences, loadLanguagePreferencesFromBackend } =
    useLanguageStore();

  const route = useRoute();

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

    void Promise.all([
      loadPostData(),
      loadNotificationData(false),
      loadTopicsData(),
      loadLanguagePreferencesFromBackend(),
    ]);
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
  }): Promise<{ authStateChanged: boolean; needsCacheRefresh: boolean }> {
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
        console.log("Cleaning data from detecting change to unknown device");
        await logoutDataCleanup({
          shouldClearLanguagePreferences:
            oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
        });
        if (route.name) {
          await firstLoadGuard(route.name);
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
            console.log(
              "Auth state changed but deferring cache operations for caller to handle"
            );
            return { authStateChanged: true, needsCacheRefresh: true };
          }

          console.log(
            "Clearing query cache and loading authenticated modules upon detecting new login, guest user, or userId change"
          );

          // Detect if this is a new guest creation (anonymous → guest)
          const newIsGuest = newLoginStatus.isKnown && !newLoginStatus.isRegistered;
          const isNewGuestCreation = !oldIsGuestOrLoggedIn && newIsGuest;

          if (isNewGuestCreation) {
            // For new guests: preserve vote/comment caches, invalidate everything else
            console.log("New guest detected - preserving vote/comment caches");
            await queryClient.invalidateQueries({
              predicate: (query) => {
                const queryKey = query.queryKey[0];
                // Preserve vote and comment caches (optimistic updates)
                if (queryKey === 'userVotes') return false;
                if (queryKey === 'comments') return false;
                // Invalidate everything else (user profile, etc.)
                return true;
              }
            });
          } else {
            // For other transitions (login, logout, account switch): clear everything
            queryClient.clear();
          }

          await loadAuthenticatedModules();
          return { authStateChanged: true, needsCacheRefresh: false };
        } else {
          console.log("Cleaning data from logging out");
          await logoutDataCleanup({
            shouldClearLanguagePreferences:
              oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
          });
          if (route.name) {
            await firstLoadGuard(route.name);
          }
          return { authStateChanged: true, needsCacheRefresh: false };
        }

      return { authStateChanged: false, needsCacheRefresh: false };
    } catch (e) {
      console.error("Failed to update authentication state", e);
      return { authStateChanged: false, needsCacheRefresh: false };
    } finally {
      isAuthInitialized.value = true;
    }
  }

  async function initializeAuthState() {
    const deviceLoginStatus = await getDeviceLoginStatus();
    await updateAuthState({
      partialLoginStatus: deviceLoginStatus,
      forceRefresh: true,
    });
  }

  async function logoutDataCleanup({
    shouldClearLanguagePreferences,
  }: {
    shouldClearLanguagePreferences: boolean;
  }) {
    // Clear all TanStack Query cache data
    queryClient.clear();

    await deleteDid();
    resetDraft();
    clearOpinionDrafts();

    authStore.setLoginStatus({ isKnown: false });

    await loadPostData();
    clearProfileData();

    clearNotificationData();

    clearTopicsData();

    resetZupassModuleState();

    if (shouldClearLanguagePreferences) {
      await clearLanguagePreferences();
    }
  }

  return {
    logoutFromServer,
    getDeviceLoginStatus,
    updateAuthState,
    initializeAuthState,
    loadAuthenticatedModules,
  };
}
