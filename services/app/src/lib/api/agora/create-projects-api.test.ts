import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

test.each([
  { development: true, staging: false, enabled: false, expected: true },
  { development: false, staging: true, enabled: true, expected: true },
  { development: false, staging: true, enabled: false, expected: false },
  { development: false, staging: false, enabled: true, expected: false },
  { development: false, staging: false, enabled: false, expected: false },
])(
  "mock availability is explicit: %j",
  async ({ expected, development, staging, enabled }) => {
    vi.stubEnv("DEV", development);
    vi.stubEnv("VITE_STAGING", String(staging));
    vi.stubEnv("VITE_PROJECTS_MOCK", String(enabled));
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    vi.stubGlobal("window", {
      sessionStorage: storage,
      location: new URL("https://example.org/projects"),
    });
    vi.stubGlobal("localStorage", storage);
    const { createProjectsRuntime } = await import("./create-projects-api.js");
    const runtime = await createProjectsRuntime({ mockDelayMs: 0 });
    expect(runtime !== undefined).toBe(expected);
    if (runtime) {
      expect(await runtime.api.loadWorkspace()).toMatchObject({
        projects: [
          {
            directoryVisibility: "unlisted",
            ownerOrganizationSlugs: ["personal-organization"],
          },
        ],
        drafts: [],
      });
    }
  },
);

test("does not start a browser mock on the server even in development", async () => {
  vi.stubEnv("DEV", true);
  vi.stubGlobal("window", undefined);
  const { createProjectsRuntime } = await import("./create-projects-api.js");
  await expect(createProjectsRuntime()).resolves.toBeUndefined();
});
