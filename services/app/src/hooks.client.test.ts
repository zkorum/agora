import type { init as initializeSentry } from "@sentry/sveltekit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { captureException, init, recover } = vi.hoisted(() => ({
  captureException: vi.fn(),
  init: vi.fn<typeof initializeSentry>(),
  recover: vi.fn(() => false),
}));

vi.mock("@sentry/sveltekit", () => ({ captureException, init }));
vi.mock("$logic/shared/dynamic-import-error", () => ({
  recoverFromDynamicImportError: recover,
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_SENTRY_ENABLED", "true");
  vi.stubEnv("VITE_STAGING", "false");
  recover.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("client error hook", () => {
  it("returns synchronously and reports consecutive errors with one SDK initialization", async () => {
    const { handleError } = await import("./hooks.client.js");
    const hook = vi.fn(handleError);
    const errors = [new Error("first"), new Error("second")];

    for (const error of errors) {
      hook({ kind: "unknown", error });
    }

    expect(hook.mock.results).toEqual(
      errors.map(() => ({ type: "return", value: undefined })),
    );
    await vi.waitFor(() => {
      expect(captureException).toHaveBeenCalledTimes(2);
    });
    expect(init).toHaveBeenCalledOnce();
    const options = init.mock.calls.at(0)?.at(0);
    expect(options?.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
    });
    expect(options?.tracesSampleRate).toBe(0.1);
    expect(options?.traceLifecycle).toBe("stream");
    for (const error of errors)
      expect(captureException).toHaveBeenCalledWith(error);
  });

  it("preserves expected errors without initializing telemetry", async () => {
    const { handleError } = await import("./hooks.client.js");
    const hook = vi.fn(handleError);

    hook({
      kind: "app",
      error: { status: 403, message: "Forbidden" },
    });
    hook({
      kind: "framework",
      error: { status: 404, message: "Not found" },
    });
    expect(hook).toHaveReturnedWith(undefined);
    expect(recover).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
  });

  it("does not report an error already handled by import recovery", async () => {
    recover.mockReturnValue(true);
    const { handleError } = await import("./hooks.client.js");

    handleError({
      kind: "unknown",
      error: new TypeError("chunk unavailable"),
    });
    expect(init).not.toHaveBeenCalled();
  });

  it.each(["development", "staging", "opted-out production"])(
    "does not initialize telemetry in %s",
    async (environment) => {
      vi.stubEnv("PROD", environment !== "development");
      vi.stubEnv("VITE_STAGING", environment === "staging" ? "true" : "false");
      vi.stubEnv(
        "VITE_SENTRY_ENABLED",
        environment === "opted-out production" ? "false" : "true",
      );
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { handleError } = await import("./hooks.client.js");

      handleError({ kind: "unknown", error: new Error("preview error") });
      expect(init).not.toHaveBeenCalled();
      expect(captureException).not.toHaveBeenCalled();
    },
  );

  it("contains asynchronous reporting failures", async () => {
    init.mockImplementationOnce(() => {
      throw new Error("SDK unavailable");
    });
    const diagnostic = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { handleError } = await import("./hooks.client.js");

    handleError({ kind: "unknown", error: new Error("original") });
    await vi.waitFor(() => {
      expect(diagnostic).toHaveBeenCalledOnce();
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("retries initialization after a failed attempt", async () => {
    init.mockImplementationOnce(() => {
      throw new Error("SDK unavailable");
    });
    const diagnostic = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { handleError } = await import("./hooks.client.js");

    handleError({ kind: "unknown", error: new Error("first") });
    await vi.waitFor(() => {
      expect(diagnostic).toHaveBeenCalledOnce();
    });

    const error = new Error("after recovery");
    handleError({ kind: "unknown", error });
    await vi.waitFor(() => {
      expect(captureException).toHaveBeenCalledWith(error);
    });
    expect(init).toHaveBeenCalledTimes(2);
  });

  it("contains capture failures without reinitializing a working SDK", async () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("capture unavailable");
    });
    const diagnostic = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { handleError } = await import("./hooks.client.js");

    handleError({ kind: "unknown", error: new Error("first") });
    await vi.waitFor(() => {
      expect(diagnostic).toHaveBeenCalledOnce();
    });

    const error = new Error("second");
    handleError({ kind: "unknown", error });
    await vi.waitFor(() => {
      expect(captureException).toHaveBeenCalledWith(error);
    });
    expect(init).toHaveBeenCalledOnce();
  });
});
