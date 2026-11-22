import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const mocks = vi.hoisted(() => ({
  create: vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>(),
  applyAuth: vi.fn(() =>
    Promise.resolve({ authStateChanged: true, needsCacheRefresh: false })
  ),
}));
vi.mock("pinia", () => ({ storeToRefs: (value: unknown) => value }));
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ isGuestOrLoggedIn: ref(false) }),
}));
vi.mock("src/stores/opinionRedaction", () => ({
  useOpinionRedactionStore: () => ({}),
}));
vi.mock("src/api", () => ({
  DefaultApiFactory: () => ({ apiV1OpinionCreatePost: mocks.create }),
  DefaultApiAxiosParamCreator: () => ({
    apiV1OpinionCreatePost: () => ({
      url: "/opinion/create",
      options: { method: "POST" },
    }),
  }),
}));
vi.mock("../auth", () => ({
  useBackendAuthApi: () => ({
    applyAcceptedParticipationAuth: mocks.applyAuth,
  }),
}));
vi.mock("../client", () => ({ api: {} }));
vi.mock("../common", () => ({
  useCommonApi: () => ({
    buildEncodedUcan: vi.fn(),
    createRawAxiosRequestConfig: (input: unknown) => input,
  }),
}));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  buildUcanForRequestWithDid: () =>
    Promise.resolve({ encodedUcan: "ucan", didWrite: "did:key:request" }),
}));
import { useBackendCommentApi } from "./comment";

const loginStatus = {
  isKnown: true,
  isRegistered: false,
  isLoggedIn: false,
  userId: "accepted-guest",
  credentials: { email: null, phone: null, rarimo: null },
};
const opinionItem = {
  opinionSlugId: "opinion1",
  opinion: "<p>Improve transit</p>",
  sourceLanguageCode: null,
  createdAt: "2026-11-13T12:00:00Z",
  updatedAt: "2026-11-13T12:00:00Z",
  numParticipants: 1,
  numAgrees: 1,
  numDisagrees: 0,
  numPasses: 0,
  username: "guest",
  isSeed: false,
  isEdited: false,
  moderation: { status: "unmoderated" },
};
const accepted = {
  success: true,
  opinionSlugId: "opinion1",
  opinionItem,
  loginStatus,
  displayedOpinionItem: {
    ...opinionItem,
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: { content: opinionItem.opinion },
      translationControl: null,
    },
  },
};

describe("statement creation identity", () => {
  beforeEach(() => vi.clearAllMocks());
  it("applies the accepted response identity using the signing DID, without refreshing auth", async () => {
    mocks.create.mockResolvedValue({ data: accepted });
    const isCurrent = () => true;
    const result = await useBackendCommentApi().createNewComment({
      commentBody: opinionItem.opinion,
      postSlugId: "conversation",
      isCurrent,
    });
    expect(result).toMatchObject({
      status: "completed",
      data: { success: true, authStateChanged: true, needsCacheRefresh: false },
    });
    expect(mocks.applyAuth).toHaveBeenCalledExactlyOnceWith({
      loginStatus,
      didWrite: "did:key:request",
      isCurrent,
    });
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
      { opinionBody: opinionItem.opinion, conversationSlugId: "conversation" },
      { encodedUcan: "ucan" }
    );
  });
  it("does not install a late identity after the initiating session changes", async () => {
    const response = Promise.withResolvers<{ data: unknown }>();
    mocks.create.mockReturnValue(response.promise);
    let current = true;
    const result = useBackendCommentApi().createNewComment({
      commentBody: opinionItem.opinion,
      postSlugId: "conversation",
      isCurrent: () => current,
    });
    await vi.waitUntil(() => mocks.create.mock.calls.length === 1);
    current = false;
    response.resolve({ data: accepted });
    expect(await result).toEqual({ status: "cancelled" });
    expect(mocks.applyAuth).not.toHaveBeenCalled();
  });
});
