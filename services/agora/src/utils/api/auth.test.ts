import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAccountScopedState: vi.fn(),
  resetLocalAuthState: vi.fn(() => Promise.resolve()),
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
  useUserStore: () => ({ loadUserProfile: vi.fn() }),
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

import { useBackendAuthApi } from "./auth";

const credentials = { email: null, phone: null, rarimo: null };

describe("useBackendAuthApi account switching", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.resetLocalAuthState.mockResolvedValue();
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
});
