import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchUserComments: vi.fn(() => Promise.resolve([])),
  fetchUserPosts: vi.fn(() => Promise.resolve([])),
  fetchUserProfile: vi.fn(),
}));

vi.mock("src/utils/api/user", () => ({
  useBackendUserApi: () => mocks,
}));

import { useAuthenticationStore } from "./authentication";
import { useUserStore } from "./user";

function createDeferred<Result>(): {
  promise: Promise<Result>;
  resolve: (result: Result) => void;
} {
  let resolvePromise: ((result: Result) => void) | undefined;
  const promise = new Promise<Result>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (result) => resolvePromise?.(result),
  };
}

const credentials = { email: null, phone: null, rarimo: null };

describe("user store account switching", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.fetchUserComments.mockResolvedValue([]);
    mocks.fetchUserPosts.mockResolvedValue([]);
  });

  it("discards an old account profile response", async () => {
    const profileResponse = createDeferred<{
      activePostCount: number;
      createdAt: Date;
      isSiteModerator: boolean;
      isSiteOrgAdmin: boolean;
      username: string;
      organizationList: [];
      verifiedEventTickets: [];
    }>();
    mocks.fetchUserProfile.mockReturnValueOnce(profileResponse.promise);
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const userStore = useUserStore();
    const loadPromise = userStore.loadUserProfile();

    authStore.setLoginStatus({ isKnown: true, userId: "user-b" });
    profileResponse.resolve({
      activePostCount: 1,
      createdAt: new Date("2026-07-31T00:00:00Z"),
      isSiteModerator: true,
      isSiteOrgAdmin: true,
      username: "account-a",
      organizationList: [],
      verifiedEventTickets: [],
    });
    await loadPromise;

    expect(userStore.profileData.dataLoaded).toBe(false);
    expect(userStore.profileData.userName).toBe("");
  });
});
