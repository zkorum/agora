import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAccountScopedState: vi.fn(),
  resetLocalAuthState: vi.fn(() => Promise.resolve()),
  requestBackendDeviceLoginStatus: vi.fn(),
  loadUserProfileMetadata: vi.fn(() => Promise.resolve()),
  didMatches: true,
}));

vi.mock("src/api", () => ({
  DefaultApiAxiosParamCreator: vi.fn(),
  DefaultApiFactory: vi.fn(),
}));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    loadLanguagePreferencesFromBackend: vi.fn(),
  }),
}));
vi.mock("src/stores/notification", () => ({
  useNotificationStore: () => ({ refreshNotificationData: vi.fn() }),
}));
vi.mock("src/stores/topic", () => ({
  useTopicStore: () => ({ loadTopicsData: vi.fn() }),
}));
vi.mock("src/stores/user", () => ({
  useUserStore: () => ({
    loadUserProfileMetadata: mocks.loadUserProfileMetadata,
  }),
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ name: undefined }),
  useRouter: () => ({}),
}));
vi.mock("../auth/localAuthState", () => ({
  clearAccountScopedState: mocks.clearAccountScopedState,
  resetLocalAuthState: mocks.resetLocalAuthState,
}));
vi.mock("../crypto/ucan/operation", () => ({
  buildAuthorizationHeader: vi.fn(),
  runIfCurrentDid: ({ operation }: { operation: () => unknown }) =>
    Promise.resolve(
      mocks.didMatches
        ? { matched: true, result: operation() }
        : { matched: false }
    ),
}));
vi.mock("../auth/refreshAuthState", () => ({
  requestBackendDeviceLoginStatus: mocks.requestBackendDeviceLoginStatus,
  requestBackendAuthStatus: vi.fn(),
}));
vi.mock("../router/guard", () => ({
  useRouterGuard: () => ({ firstLoadGuard: vi.fn() }),
}));
vi.mock("./client", () => ({ api: {} }));
vi.mock("./common", () => ({
  useCommonApi: () => ({ buildEncodedUcan: vi.fn() }),
}));
vi.mock("./notification/requestError", () => ({
  runNotificationRefreshInBackground: vi.fn(),
}));

import { useAuthenticationStore } from "src/stores/authentication";
import { queryClient } from "src/utils/query/client";

import { useBackendAuthApi } from "./auth";

const credentials = { email: null, phone: null, rarimo: null };

describe("useBackendAuthApi account switching", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.resetLocalAuthState.mockResolvedValue();
    mocks.didMatches = true;
    queryClient.clear();
  });

  it("clears account state before returning a deferred cache refresh", async () => {
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const { updateAuthState } = useBackendAuthApi();

    const updatePromise = updateAuthState({
      partialLoginStatus: {
        isKnown: true,
        isLoggedIn: true,
        isRegistered: true,
        userId: "user-b",
        credentials,
      },
      deferCacheOperations: true,
    });

    expect(mocks.clearAccountScopedState).toHaveBeenCalledOnce();
    await expect(updatePromise).resolves.toEqual({
      authStateChanged: true,
      needsCacheRefresh: true,
    });
    expect(mocks.resetLocalAuthState).not.toHaveBeenCalled();
    expect(authStore.userId).toBe("user-b");
  });

  it("propagates local logout cleanup failures", async () => {
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    mocks.resetLocalAuthState.mockRejectedValueOnce(
      new Error("keystore failure")
    );
    const { updateAuthState } = useBackendAuthApi();

    await expect(
      updateAuthState({ partialLoginStatus: { isLoggedIn: false } })
    ).rejects.toThrow("keystore failure");
  });

  it("resolves a real guest identity once and preserves the first participation cache", async () => {
    const authStore = useAuthenticationStore();
    const votes = [{ opinionSlugId: "statement", votingAction: "agree" }];
    queryClient.setQueryData(["userVotes", "conversation", undefined], votes);
    mocks.requestBackendDeviceLoginStatus.mockResolvedValue({
      didWrite: "did:key:guest",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "guest-id",
        credentials,
      },
    });
    const firstApi = useBackendAuthApi();
    const secondApi = useBackendAuthApi();

    await Promise.all([
      firstApi.ensureParticipationAuthState(),
      secondApi.ensureParticipationAuthState(),
    ]);
    await firstApi.ensureParticipationAuthState();

    expect(authStore.userId).toBe("guest-id");
    expect(authStore.isGuest).toBe(true);
    expect(mocks.requestBackendDeviceLoginStatus).toHaveBeenCalledOnce();
    expect(mocks.loadUserProfileMetadata).toHaveBeenCalledOnce();
    expect(mocks.clearAccountScopedState).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(["userVotes", "conversation", "guest-id"])
    ).toEqual(votes);
  });
  it("installs accepted-write identity and seeds guest caches without an auth request or waiting for profile loading", async () => {
    const authStore = useAuthenticationStore();
    const votes = [{ opinionSlugId: "statement", votingAction: "agree" }];
    queryClient.setQueryData(["userVotes", "conversation", undefined], votes);
    mocks.loadUserProfileMetadata.mockReturnValueOnce(new Promise(() => {}));
    const result = await useBackendAuthApi().applyAcceptedParticipationAuth({
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "accepted-guest",
        credentials,
      },
      didWrite: "did:key:guest",
      isCurrent: () => true,
    });
    expect(result).toEqual({
      authStateChanged: true,
      needsCacheRefresh: false,
    });
    expect(authStore.userId).toBe("accepted-guest");
    expect(authStore.isGuest).toBe(true);
    expect(mocks.requestBackendDeviceLoginStatus).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(["userVotes", "conversation", "accepted-guest"])
    ).toEqual(votes);
  });
  it("ignores an accepted-write identity when the initiating viewer is no longer current", async () => {
    await useBackendAuthApi().applyAcceptedParticipationAuth({
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "old-guest",
        credentials,
      },
      didWrite: "did:key:guest",
      isCurrent: () => false,
    });
    expect(useAuthenticationStore().isKnown).toBe(false);
    expect(mocks.loadUserProfileMetadata).not.toHaveBeenCalled();
    expect(mocks.requestBackendDeviceLoginStatus).not.toHaveBeenCalled();
  });
  it("ignores accepted identity when the signing key has been replaced", async () => {
    mocks.didMatches = false;
    await useBackendAuthApi().applyAcceptedParticipationAuth({
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "old-key-guest",
        credentials,
      },
      didWrite: "did:key:old",
      isCurrent: () => true,
    });
    expect(useAuthenticationStore().isKnown).toBe(false);
    expect(mocks.loadUserProfileMetadata).not.toHaveBeenCalled();
  });
  it("keeps accepted identity when optional background profile loading fails", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.loadUserProfileMetadata.mockRejectedValueOnce(new Error("Offline"));
      await expect(
        useBackendAuthApi().applyAcceptedParticipationAuth({
          loginStatus: {
            isKnown: true,
            isRegistered: false,
            isLoggedIn: false,
            userId: "saved-guest",
            credentials,
          },
          didWrite: "did:key:guest",
          isCurrent: () => true,
        })
      ).resolves.toEqual({ authStateChanged: true, needsCacheRefresh: false });
      await vi.waitFor(() => expect(errorLog).toHaveBeenCalled());
      expect(useAuthenticationStore().userId).toBe("saved-guest");
      expect(mocks.requestBackendDeviceLoginStatus).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
  });
});
