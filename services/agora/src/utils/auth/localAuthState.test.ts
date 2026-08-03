import type { DeviceLoginStatus } from "src/shared/types/zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearLanguagePreferences: vi.fn(() => Promise.resolve(true)),
  clearNotificationData: vi.fn(),
  clearOpinionDrafts: vi.fn(),
  clearProfileData: vi.fn(),
  clearQueries: vi.fn(),
  clearTopicsData: vi.fn(),
  deleteDid: vi.fn(() => Promise.resolve()),
  deleteDidIfCurrent: vi.fn(
    (_params: {
      didWrite: string;
      onDeleted: () => void;
      onDeleteFailed: () => void;
    }) => Promise.resolve(true)
  ),
  resetDraft: vi.fn(),
  resetEmailVerification: vi.fn(),
  resetPhoneVerification: vi.fn(),
  resetZupassModuleState: vi.fn(),
  setLoginStatus: vi.fn(),
}));

vi.mock("src/composables/zupass/useZupassVerification", () => ({
  resetZupassModuleState: mocks.resetZupassModuleState,
}));
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ setLoginStatus: mocks.setLoginStatus }),
}));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    clearLanguagePreferences: mocks.clearLanguagePreferences,
  }),
}));
vi.mock("src/stores/newConversationDrafts", () => ({
  useNewPostDraftsStore: () => ({ resetDraft: mocks.resetDraft }),
}));
vi.mock("src/stores/newOpinionDrafts", () => ({
  useNewOpinionDraftsStore: () => ({
    clearOpinionDrafts: mocks.clearOpinionDrafts,
  }),
}));
vi.mock("src/stores/notification", () => ({
  useNotificationStore: () => ({
    clearNotificationData: mocks.clearNotificationData,
  }),
}));
vi.mock("src/stores/onboarding/email", () => ({
  emailVerificationStore: () => ({ reset: mocks.resetEmailVerification }),
}));
vi.mock("src/stores/onboarding/phone", () => ({
  phoneVerificationStore: () => ({ reset: mocks.resetPhoneVerification }),
}));
vi.mock("src/stores/topic", () => ({
  useTopicStore: () => ({ clearTopicsData: mocks.clearTopicsData }),
}));
vi.mock("src/stores/user", () => ({
  useUserStore: () => ({ clearProfileData: mocks.clearProfileData }),
}));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  deleteDid: mocks.deleteDid,
  deleteDidIfCurrent: mocks.deleteDidIfCurrent,
}));
vi.mock("src/utils/query/client", () => ({
  queryClient: { clear: mocks.clearQueries },
}));

import {
  resetLocalAuthState,
  resetLocalAuthStateIfDidMatches,
} from "./localAuthState";

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

describe("resetLocalAuthState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteDid.mockResolvedValue();
    mocks.deleteDidIfCurrent.mockResolvedValue(true);
    mocks.clearLanguagePreferences.mockResolvedValue(true);
  });

  it("clears all account-scoped state when DID deletion fails", async () => {
    mocks.deleteDid.mockRejectedValueOnce(new Error("keystore failure"));

    await expect(resetLocalAuthState()).rejects.toThrow("keystore failure");

    expect(mocks.clearQueries).toHaveBeenCalledOnce();
    expect(mocks.clearProfileData).toHaveBeenCalledOnce();
    expect(mocks.resetDraft).toHaveBeenCalledOnce();
    expect(mocks.clearOpinionDrafts).toHaveBeenCalledOnce();
    expect(mocks.clearNotificationData).toHaveBeenCalledOnce();
    expect(mocks.clearTopicsData).toHaveBeenCalledOnce();
    expect(mocks.resetEmailVerification).toHaveBeenCalledOnce();
    expect(mocks.resetPhoneVerification).toHaveBeenCalledOnce();
    expect(mocks.resetZupassModuleState).toHaveBeenCalledOnce();
    expect(mocks.setLoginStatus).not.toHaveBeenCalled();
  });

  it("waits for language cleanup after DID deletion fails", async () => {
    const languageCleanup = createDeferred<boolean>();
    mocks.deleteDid.mockRejectedValueOnce(new Error("keystore failure"));
    mocks.clearLanguagePreferences.mockReturnValueOnce(languageCleanup.promise);
    const cleanupPromise = resetLocalAuthState({
      shouldClearLanguagePreferences: true,
    });
    let cleanupOutcome: "pending" | "rejected" = "pending";
    const observeCleanup = async (): Promise<void> => {
      try {
        await cleanupPromise;
      } catch {
        cleanupOutcome = "rejected";
      }
    };
    const observationPromise = observeCleanup();

    await Promise.resolve();
    expect(cleanupOutcome).toBe("pending");

    languageCleanup.resolve(true);
    await observationPromise;
    expect(cleanupOutcome).toBe("rejected");
    await expect(cleanupPromise).rejects.toThrow("keystore failure");
  });

  it("rejects when language preferences report that cleanup failed", async () => {
    mocks.clearLanguagePreferences.mockResolvedValueOnce(false);

    await expect(
      resetLocalAuthState({ shouldClearLanguagePreferences: true })
    ).rejects.toThrow("Failed to clear language preferences");
    expect(mocks.deleteDid).toHaveBeenCalledOnce();
  });

  it("does not clear state for a stale DID response", async () => {
    mocks.deleteDidIfCurrent.mockResolvedValueOnce(false);

    await expect(
      resetLocalAuthStateIfDidMatches({
        didWrite: "did:key:old",
        loginStatusOnDeletionFailure: {
          isKnown: false,
          isLoggedIn: false,
          isRegistered: false,
          credentials: { email: null, phone: null, rarimo: null },
        },
      })
    ).resolves.toBe(false);

    expect(mocks.clearQueries).not.toHaveBeenCalled();
    expect(mocks.setLoginStatus).not.toHaveBeenCalled();
  });

  it("preserves the backend status when conditional DID deletion fails", async () => {
    const loggedOutStatus = {
      isKnown: true,
      isLoggedIn: false,
      isRegistered: true,
      userId: "user-a",
      credentials: { email: null, phone: null, rarimo: null },
    } satisfies DeviceLoginStatus;
    mocks.deleteDidIfCurrent.mockImplementationOnce(
      ({ onDeleteFailed }: { onDeleteFailed: () => void }) => {
        onDeleteFailed();
        return Promise.reject(new Error("keystore failure"));
      }
    );

    await expect(
      resetLocalAuthStateIfDidMatches({
        didWrite: "did:key:retired",
        loginStatusOnDeletionFailure: loggedOutStatus,
      })
    ).rejects.toThrow("keystore failure");

    expect(mocks.setLoginStatus).toHaveBeenCalledWith(loggedOutStatus);
    expect(mocks.clearQueries).not.toHaveBeenCalled();
  });
});
