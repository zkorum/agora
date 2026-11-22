import type { sentrySvelteKit as createSentryPlugin } from "@sentry/sveltekit/vite";
import { afterEach, describe, expect, it, vi } from "vitest";

import { browserBuildOptions } from "../browser-targets.js";

const { sentryPlugin } = vi.hoisted(() => ({
  sentryPlugin: vi.fn<typeof createSentryPlugin>(),
}));

// Inspect build configuration without loading an upload-capable Sentry plugin.
vi.mock("@sentry/sveltekit/vite", () => ({ sentrySvelteKit: sentryPlugin }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("browser build contract", () => {
  it("shares the declared JavaScript and CSS targets", () => {
    const targets = ["es2020", "chrome86", "safari15", "firefox91"];
    expect(browserBuildOptions.target).toEqual(targets);
    expect(browserBuildOptions.cssTarget).toEqual(targets);
  });
});

describe("Sentry 11 build configuration", () => {
  it.each([
    { value: "false", enabled: false },
    { value: "true", enabled: true },
    { value: undefined, enabled: true },
  ])("preserves the upload policy for $value", async ({ value, enabled }) => {
    vi.resetModules();
    sentryPlugin.mockClear();
    sentryPlugin.mockResolvedValue([]);
    vi.stubEnv("SENTRY_UPLOAD_SOURCEMAPS", value);
    const { default: config } = await import("../vite.config.js");
    const options = sentryPlugin.mock.calls.at(0)?.at(0);

    expect(sentryPlugin).toHaveBeenCalledOnce();
    expect(options?.autoUploadSourceMaps).toBe(enabled);
    expect(options?.sourcemaps).toEqual({
      assets: [".netlify/**/*", "build/**/*"],
      filesToDeleteAfterUpload: ["**/*.map"],
    });
    expect(options).not.toHaveProperty("sourceMapsUploadOptions");
    expect(config).toHaveProperty("build.target", browserBuildOptions.target);
    expect(config).toHaveProperty(
      "build.cssTarget",
      browserBuildOptions.cssTarget,
    );
  });
});
