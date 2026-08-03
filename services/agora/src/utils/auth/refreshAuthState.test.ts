import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildUcanForRequestWithDid: vi.fn(() =>
    Promise.resolve({
      didWrite: "did:key:request",
      encodedUcan: "encoded-ucan",
    })
  ),
  checkLoginStatus: vi.fn(),
  clearAccountScopedState: vi.fn(),
  resetLocalAuthStateIfDidMatches: vi.fn(() => Promise.resolve(true)),
  runIfCurrentDid: vi.fn(
    ({ operation }: { operation: () => unknown }) =>
      Promise.resolve({ matched: true, result: operation() })
  ),
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
  buildUcanForRequestWithDid: mocks.buildUcanForRequestWithDid,
  runIfCurrentDid: mocks.runIfCurrentDid,
}));
vi.mock("./localAuthState", () => ({
  clearAccountScopedState: mocks.clearAccountScopedState,
  resetLocalAuthStateIfDidMatches: mocks.resetLocalAuthStateIfDidMatches,
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
    expect(mocks.resetLocalAuthStateIfDidMatches).not.toHaveBeenCalled();
    expect(authStore.userId).toBe("user-b");
  });

  it("clears a retired registered DID after the backend reports logout", async () => {
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
          isLoggedIn: false,
          isRegistered: true,
          userId: "user-a",
          credentials,
        },
      },
    });

    await expect(refreshAuthStateFromBackend()).resolves.toEqual({
      authStateChanged: true,
      needsCacheRefresh: false,
    });

    expect(mocks.resetLocalAuthStateIfDidMatches).toHaveBeenCalledOnce();
  });

  it("ignores a response when the signing DID is no longer current", async () => {
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    mocks.runIfCurrentDid.mockResolvedValueOnce({
      matched: false,
      result: undefined,
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
      authStateChanged: false,
      needsCacheRefresh: false,
    });
    expect(authStore.userId).toBe("user-a");
    expect(mocks.clearAccountScopedState).not.toHaveBeenCalled();
  });

  it("applies an authoritative 401 to the DID that signed the request", async () => {
    mocks.checkLoginStatus.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(refreshAuthStateFromBackend()).resolves.toEqual({
      authStateChanged: true,
      needsCacheRefresh: false,
    });

    expect(mocks.buildUcanForRequestWithDid).toHaveBeenCalledOnce();
    expect(mocks.resetLocalAuthStateIfDidMatches).toHaveBeenCalledWith({
      didWrite: "did:key:request",
      shouldClearLanguagePreferences: false,
      loginStatusOnDeletionFailure: {
        isKnown: false,
        isLoggedIn: false,
        isRegistered: false,
        credentials,
      },
    });
  });

  it("preserves local auth state when the status request fails transiently", async () => {
    const networkError = new Error("network unavailable");
    mocks.checkLoginStatus.mockRejectedValueOnce(networkError);

    await expect(refreshAuthStateFromBackend()).rejects.toBe(networkError);

    expect(mocks.resetLocalAuthStateIfDidMatches).not.toHaveBeenCalled();
    expect(mocks.clearAccountScopedState).not.toHaveBeenCalled();
  });
});
