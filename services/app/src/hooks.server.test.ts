import type { init as initializeSentry } from "@sentry/sveltekit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { captureException, init, runtime } = vi.hoisted(() => ({
  captureException: vi.fn(),
  init: vi.fn<typeof initializeSentry>(),
  runtime: { building: false, dev: false },
}));

vi.mock("@sentry/sveltekit", () => ({ captureException, init }));
vi.mock("$app/env", () => runtime);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_SENTRY_ENABLED", "true");
  vi.stubEnv("VITE_STAGING", "false");
  runtime.building = false;
  runtime.dev = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("server error hook", () => {
  it("uses the instrumentation client for every error without reinitializing it", async () => {
    await import("./instrumentation.server.js");
    const { handleError } = await import("./hooks.server.js");
    const errors = [new Error("first"), new Error("second")];

    for (const error of errors) {
      handleError({ kind: "unknown", error });
      expect(captureException).toHaveBeenCalledWith(error);
    }

    expect(captureException).toHaveBeenCalledTimes(2);
    expect(init).toHaveBeenCalledOnce();
    const options = init.mock.calls.at(0)?.at(0);
    expect(options?.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
    });
    expect(options?.tracesSampleRate).toBe(1.0);
    expect(options?.traceLifecycle).toBe("stream");
  });

  it("leaves expected errors and their status codes to Kit", async () => {
    const { handleError } = await import("./hooks.server.js");
    const hook = vi.fn(handleError);

    hook({
      kind: "app",
      error: { status: 403, message: "Forbidden" },
    });
    hook({
      kind: "framework",
      error: { status: 404, message: "Not found" },
    });
    hook({
      kind: "validation",
      error: { status: 400, message: "Invalid input" },
      issues: [],
    });
    expect(hook.mock.results).toEqual(
      Array.from({ length: 3 }, () => ({ type: "return", value: undefined })),
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it.each(["build", "development", "staging", "opted-out production"])(
    "does not initialize or send telemetry in %s",
    async (environment) => {
      runtime.building = environment === "build";
      runtime.dev = environment === "development";
      vi.stubEnv("VITE_STAGING", environment === "staging" ? "true" : "false");
      vi.stubEnv(
        "VITE_SENTRY_ENABLED",
        environment === "opted-out production" ? "false" : "true",
      );
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await import("./instrumentation.server.js");
      const { handleError } = await import("./hooks.server.js");

      handleError({ kind: "unknown", error: new Error("preview error") });
      expect(init).not.toHaveBeenCalled();
      expect(captureException).not.toHaveBeenCalled();
    },
  );
});
