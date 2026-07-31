import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllTopics: vi.fn(() =>
    Promise.resolve({ status: "success", data: { topicList: [] } })
  ),
  getUserFollowedTopics: vi.fn(),
  handleAxiosErrorStatusCodes: vi.fn(),
  userFollowTopicCode: vi.fn(),
  userUnfollowTopicCode: vi.fn(),
}));

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/utils/api/common", () => ({
  useCommonApi: () => ({
    handleAxiosErrorStatusCodes: mocks.handleAxiosErrorStatusCodes,
  }),
}));
vi.mock("src/utils/api/topic", () => ({
  useBackendTopicApi: () => mocks,
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: vi.fn() }),
}));

import { useAuthenticationStore } from "./authentication";
import { useTopicStore } from "./topic";

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

describe("topic store account switching", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.getAllTopics.mockResolvedValue({
      status: "success",
      data: { topicList: [] },
    });
  });

  it("discards an old account followed-topics response", async () => {
    const followedTopicsResponse = createDeferred<{
      status: "success";
      data: { followedTopicCodeList: string[] };
    }>();
    mocks.getUserFollowedTopics.mockReturnValueOnce(
      followedTopicsResponse.promise
    );
    const authStore = useAuthenticationStore();
    authStore.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      isRegistered: true,
      userId: "user-a",
      credentials,
    });
    const topicStore = useTopicStore();
    const loadPromise = topicStore.loadTopicsData();
    await vi.waitFor(() => {
      expect(mocks.getUserFollowedTopics).toHaveBeenCalledOnce();
    });

    authStore.setLoginStatus({ isKnown: true, userId: "user-b" });
    followedTopicsResponse.resolve({
      status: "success",
      data: { followedTopicCodeList: ["account-a-topic"] },
    });
    await loadPromise;

    expect(topicStore.followedTopicCodeSet).toEqual(new Set());
  });
});
