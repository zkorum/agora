import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAccountScopedState: vi.fn(),
  resetLocalAuthState: vi.fn(() => Promise.resolve()),
  requestBackendDeviceLoginStatus: vi.fn(),
  loadUserProfileMetadata: vi.fn(() => Promise.resolve()),
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
  useUserStore: () => ({ loadUserProfileMetadata: mocks.loadUserProfileMetadata }),
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
    Promise.resolve({ matched: true, result: operation() }),
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
      loginStatus: { isKnown: true, isRegistered: false, isLoggedIn: false, userId: "guest-id", credentials },
    });
    const firstApi = useBackendAuthApi();
    const secondApi = useBackendAuthApi();

    await Promise.all([firstApi.ensureParticipationAuthState(), secondApi.ensureParticipationAuthState()]);
    await firstApi.ensureParticipationAuthState();

    expect(authStore.userId).toBe("guest-id");
    expect(authStore.isGuest).toBe(true);
    expect(mocks.requestBackendDeviceLoginStatus).toHaveBeenCalledOnce();
    expect(mocks.loadUserProfileMetadata).toHaveBeenCalledOnce();
    expect(mocks.clearAccountScopedState).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["userVotes", "conversation", "guest-id"])).toEqual(votes);
  });
});
