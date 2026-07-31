import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkLoginStatus: vi.fn(),
  clearAccountScopedState: vi.fn(),
  resetLocalAuthState: vi.fn(() => Promise.resolve()),
}));

vi.mock("src/api", () => ({
  DefaultApiAxiosParamCreator: () => ({
    apiV1AuthCheckLoginStatusPost: () =>
      Promise.resolve({ url: "/auth/check", options: { method: "POST" } }),
  }),
  DefaultApiFactory: () => ({
    apiV1AuthCheckLoginStatusPost: mocks.checkLoginStatus,
  }),
}));
vi.mock("src/utils/api/client", () => ({ api: {} }));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  buildAuthorizationHeader: () => ({}),
  buildUcanForRequest: () => Promise.resolve("encoded-ucan"),
}));
vi.mock("./localAuthState", () => ({
  clearAccountScopedState: mocks.clearAccountScopedState,
  resetLocalAuthState: mocks.resetLocalAuthState,
}));

import { useAuthenticationStore } from "src/stores/authentication";

import { refreshAuthStateFromBackend } from "./refreshAuthState";

const credentials = { email: null, phone: null, rarimo: null };

describe("refreshAuthStateFromBackend account switching", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("clears account state before returning cache refresh work", async () => {
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    mocks.checkLoginStatus.mockResolvedValueOnce({
      data: {
        loggedInStatus: {
          isKnown: true,
          isLoggedIn: true,
          isRegistered: true,
          userId: "user-b",
          credentials,
        },
      },
    });

    await expect(refreshAuthStateFromBackend()).resolves.toEqual({
      authStateChanged: true,
      needsCacheRefresh: true,
    });

    expect(mocks.clearAccountScopedState).toHaveBeenCalledOnce();
    expect(mocks.resetLocalAuthState).not.toHaveBeenCalled();
    expect(authStore.userId).toBe("user-b");
  });
});
