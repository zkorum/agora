import { describe, expect, it, vi } from "vitest";

import { runLogoutFlow } from "./logoutFlow";

describe("runLogoutFlow", () => {
  it("stops before local cleanup when server revocation fails", async () => {
    const serverError = new Error("server unavailable");
    const clearLocalState = vi.fn(() => Promise.resolve());
    const clearActiveUserIntention = vi.fn();
    const navigate = vi.fn(() => Promise.resolve());

    const result = await runLogoutFlow({
      revokeFromServer: vi.fn(() => Promise.reject(serverError)),
      clearLocalState,
      clearActiveUserIntention,
      navigate,
    });

    expect(result).toEqual({
      status: "server-revocation-failed",
      error: serverError,
    });
    expect(clearLocalState).not.toHaveBeenCalled();
    expect(clearActiveUserIntention).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not navigate when local cleanup fails", async () => {
    const cleanupError = new Error("keystore failure");
    const clearActiveUserIntention = vi.fn();
    const navigate = vi.fn(() => Promise.resolve());

    const result = await runLogoutFlow({
      revokeFromServer: vi.fn(() => Promise.resolve()),
      clearLocalState: vi.fn(() => Promise.reject(cleanupError)),
      clearActiveUserIntention,
      navigate,
    });

    expect(result).toEqual({
      status: "local-cleanup-failed",
      error: cleanupError,
    });
    expect(clearActiveUserIntention).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps local-only cleanup failures on the current page", async () => {
    const clearActiveUserIntention = vi.fn();
    const navigate = vi.fn(() => Promise.resolve());

    const result = await runLogoutFlow({
      clearLocalState: vi.fn(() => Promise.reject(new Error("DID remained"))),
      clearActiveUserIntention,
      navigate,
    });

    expect(result.status).toBe("local-cleanup-failed");
    expect(clearActiveUserIntention).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports navigation failures separately after cleanup succeeds", async () => {
    const navigationError = new Error("navigation failure");
    const clearActiveUserIntention = vi.fn();

    const result = await runLogoutFlow({
      revokeFromServer: vi.fn(() => Promise.resolve()),
      clearLocalState: vi.fn(() => Promise.resolve()),
      clearActiveUserIntention,
      navigate: vi.fn(() => Promise.reject(navigationError)),
    });

    expect(result).toEqual({
      status: "navigation-failed",
      error: navigationError,
    });
    expect(clearActiveUserIntention).toHaveBeenCalledOnce();
  });

  it("supports local-only cleanup and clears the active intention", async () => {
    const clearLocalState = vi.fn(() => Promise.resolve());
    const clearActiveUserIntention = vi.fn();
    const navigate = vi.fn(() => Promise.resolve());

    const result = await runLogoutFlow({
      clearLocalState,
      clearActiveUserIntention,
      navigate,
    });

    expect(result).toEqual({ status: "completed" });
    expect(clearLocalState).toHaveBeenCalledOnce();
    expect(clearActiveUserIntention).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });
});
