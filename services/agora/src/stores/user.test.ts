import { createPinia, setActivePinia } from "pinia";
import type { GetUserProfileResponse } from "src/shared/types/dto";
import type { useBackendUserApi } from "src/utils/api/user";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchUserComments:
    vi.fn<ReturnType<typeof useBackendUserApi>["fetchUserComments"]>(),
  fetchUserPosts:
    vi.fn<ReturnType<typeof useBackendUserApi>["fetchUserPosts"]>(),
  fetchUserProfile:
    vi.fn<ReturnType<typeof useBackendUserApi>["fetchUserProfile"]>(),
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

function createProfile(): GetUserProfileResponse {
  return {
    activePostCount: 1,
    createdAt: new Date("2026-07-31T00:00:00Z"),
    isSiteModerator: false,
    isSiteOrgAdmin: true,
    username: "account-a",
    organizationList: [],
    verifiedEventTickets: [],
  };
}

describe("user profile loading and account isolation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    mocks.fetchUserComments.mockResolvedValue([]);
    mocks.fetchUserPosts.mockResolvedValue([]);
    mocks.fetchUserProfile.mockResolvedValue(createProfile());
  });

  it("discards an old account profile response", async () => {
    const profileResponse = createDeferred<GetUserProfileResponse>();
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
    profileResponse.resolve(createProfile());
    await loadPromise;

    expect(userStore.profileData.dataLoaded).toBe(false);
    expect(userStore.profileData.userName).toBe("");
  });

  it("loads auth metadata without requesting either activity feed", async () => {
    const userStore = useUserStore();

    await userStore.loadUserProfileMetadata();

    expect(mocks.fetchUserPosts).not.toHaveBeenCalled();
    expect(mocks.fetchUserComments).not.toHaveBeenCalled();
    expect(userStore.profileData.dataLoaded).toBe(true);
    expect(userStore.profileData.isSiteOrgAdmin).toBe(true);
    expect(userStore.profileData.userName).toBe("account-a");
  });

  it("still loads both feeds for the profile page and records failures when metadata refresh fails", async () => {
    const userStore = useUserStore();
    await userStore.loadUserProfileMetadata();
    mocks.fetchUserProfile.mockResolvedValueOnce(undefined);
    mocks.fetchUserPosts.mockResolvedValueOnce(null);
    mocks.fetchUserComments.mockResolvedValueOnce(null);

    await userStore.loadUserProfile();

    expect(mocks.fetchUserPosts).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(mocks.fetchUserComments).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(userStore.profileData.postsLoadFailed).toBe(true);
    expect(userStore.profileData.commentsLoadFailed).toBe(true);
    expect(userStore.profileData.userName).toBe("account-a");
  });

  it("preserves activity state during a metadata-only refresh", async () => {
    const userStore = useUserStore();
    mocks.fetchUserPosts.mockResolvedValueOnce(null);
    await userStore.loadUserProfile();
    const posts = userStore.profileData.userPostList;
    const comments = userStore.profileData.userCommentList;

    await userStore.loadUserProfileMetadata();

    expect(userStore.profileData.userPostList).toBe(posts);
    expect(userStore.profileData.userCommentList).toBe(comments);
    expect(userStore.profileData.postsLoadFailed).toBe(true);
    expect(mocks.fetchUserPosts).toHaveBeenCalledTimes(1);
    expect(mocks.fetchUserComments).toHaveBeenCalledTimes(1);
  });

  it("creates fresh defaults when clearing an account", () => {
    const userStore = useUserStore();
    const previous = userStore.profileData;
    userStore.addVerifiedTicket("devconnect-2025");

    userStore.clearProfileData();

    expect(userStore.profileData.verifiedEventTickets).toEqual([]);
    expect(userStore.profileData.userPostList).not.toBe(previous.userPostList);
    expect(userStore.profileData.userCommentList).not.toBe(
      previous.userCommentList
    );
    expect(userStore.profileData.organizationList).not.toBe(
      previous.organizationList
    );
  });

  it("discards late metadata after clearing even before the user ID changes", async () => {
    const profileResponse = createDeferred<GetUserProfileResponse>();
    mocks.fetchUserProfile.mockReturnValueOnce(profileResponse.promise);
    const userStore = useUserStore();
    const loading = userStore.loadUserProfileMetadata();

    userStore.clearProfileData();
    profileResponse.resolve(createProfile());
    await loading;

    expect(userStore.profileData.dataLoaded).toBe(false);
    expect(userStore.profileData.userName).toBe("");
    expect(userStore.profileData.isSiteOrgAdmin).toBe(false);
  });

  it("discards late activity results after an account reset", async () => {
    const postsResponse = createDeferred<null>();
    mocks.fetchUserPosts.mockReturnValueOnce(postsResponse.promise);
    const userStore = useUserStore();
    const loading = userStore.loadUserProfile();
    await vi.waitFor(() => expect(userStore.profileData.dataLoaded).toBe(true));

    userStore.clearProfileData();
    postsResponse.resolve(null);
    await loading;

    expect(userStore.profileData.dataLoaded).toBe(false);
    expect(userStore.profileData.postsLoadFailed).toBe(false);
  });
});
