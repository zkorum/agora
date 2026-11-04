import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const applicationSetup = vi.hoisted(() => vi.fn());

vi.mock("src/App.vue", async () => {
  const { defineComponent, h } = await import("vue");
  const { useQueryClient } = await import("@tanstack/vue-query");
  return {
    default: defineComponent({
      setup() {
        applicationSetup(useQueryClient());
        return () => h("div", "Application ready");
      },
    }),
  };
});

vi.mock("src/utils/query/client", async () => {
  const { QueryClient } = await import("@tanstack/vue-query");
  return { queryClient: new QueryClient() };
});

const mockedBootNames = [
  "chunkErrorRecovery",
  "recipientActionPrivacy",
  "plausible",
  "sentry",
  "devBrowserLogger",
  "i18n",
  "axios",
  "primevue",
  "embeddedBrowserGuard",
  "maz-ui",
  "spaLinkInterceptor",
];

describe("application startup", () => {
  const initializedBoots: string[] = [];
  const mountedApps: App[] = [];

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_STAGING", "false");
    initializedBoots.length = 0;
    localStorage.clear();
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en"]);

    for (const name of mockedBootNames) {
      vi.doMock(`src/boot/${name}`, () => ({
        default: async () => {
          await Promise.resolve();
          initializedBoots.push(name);
        },
      }));
    }
    vi.doUnmock("src/boot/vue-query");
  });

  afterEach(() => {
    for (const app of mountedApps) app.unmount();
    mountedApps.length = 0;
    document.body.replaceChildren();
    for (const name of mockedBootNames) vi.doUnmock(`src/boot/${name}`);
    vi.doUnmock("src/boot/vue-query");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function createApplication() {
    const { default: Bootstrap } = await import("src/Bootstrap.vue");
    const app = createApp(Bootstrap);
    const store = createPinia();
    app.use(store);
    return {
      app,
      store,
      router: createRouter({ history: createMemoryHistory(), routes: [] }),
      publicPath: "/",
      redirect: vi.fn(),
      urlPath: "/",
    };
  }

  function mountApplication(app: App): HTMLElement {
    const container = document.createElement("div");
    document.body.append(container);
    app.mount(container);
    mountedApps.push(app);
    return container;
  }

  it("awaits ordered initialization and provides the shared QueryClient to the app", async () => {
    const { default: startup } = await import("src/boot/startup");
    const context = await createApplication();
    await startup(context);

    const container = mountApplication(context.app);
    const { queryClient } = await import("src/utils/query/client");
    expect(applicationSetup).toHaveBeenCalledExactlyOnceWith(queryClient);
    expect(container.textContent).toBe("Application ready");
    expect(initializedBoots).toEqual([
      "chunkErrorRecovery",
      "recipientActionPrivacy",
      "plausible",
      "sentry",
      "i18n",
      "axios",
      "primevue",
      "embeddedBrowserGuard",
      "maz-ui",
      "spaLinkInterceptor",
    ]);

    const otherContext = await createApplication();
    const otherContainer = mountApplication(otherContext.app);
    expect(otherContainer.textContent).toContain("Unable to start Agora");
    expect(applicationSetup).toHaveBeenCalledOnce();
  });

  it("mounts the failure screen without starting initializers when a required plugin import fails", async () => {
    const importError = new Error("Query plugin import failed");
    vi.doMock("src/boot/vue-query", () => {
      throw importError;
    });

    const splash = document.createElement("div");
    splash.id = "app-loading";
    document.body.append(splash);
    const { default: startup } = await import("src/boot/startup");
    const context = await createApplication();
    const handleError = vi.fn();
    context.app.config.errorHandler = handleError;
    await expect(startup(context)).resolves.toBeUndefined();
    const container = mountApplication(context.app);

    expect(initializedBoots).toEqual([]);
    expect(handleError).toHaveBeenCalledOnce();
    expect(applicationSetup).not.toHaveBeenCalled();
    expect(container.querySelector("main h1")?.textContent).toContain(
      "Unable to start Agora"
    );
    expect(container.querySelector("button")?.textContent).toBe("Reload");
    expect(document.getElementById("app-loading")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector("h1"));
  });

  it("keeps the app behind the startup gate when an initializer rejects", async () => {
    const initializationError = new Error("i18n initialization failed");
    vi.doMock("src/boot/i18n", () => ({
      default: () => {
        throw initializationError;
      },
    }));

    const { default: startup } = await import("src/boot/startup");
    const context = await createApplication();
    const handleError = vi.fn();
    context.app.config.errorHandler = handleError;
    await expect(startup(context)).resolves.toBeUndefined();
    const container = mountApplication(context.app);

    expect(handleError).toHaveBeenCalledExactlyOnceWith(
      initializationError,
      null,
      "application startup"
    );
    expect(applicationSetup).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Unable to start Agora");
    expect(initializedBoots).toEqual([
      "chunkErrorRecovery",
      "recipientActionPrivacy",
      "plausible",
      "sentry",
    ]);
  });

  it.each([
    {
      storedLanguage: "fr",
      browserLanguage: "fa-IR",
      language: "fr",
      direction: "ltr",
      title: "Impossible de démarrer Agora",
    },
    {
      storedLanguage: undefined,
      browserLanguage: "fa-IR",
      language: "fa",
      direction: "rtl",
      title: "آگورا راه‌اندازی نشد",
    },
  ])(
    "localizes the plugin-independent failure screen in $language",
    async ({ storedLanguage, browserLanguage, language, direction, title }) => {
      if (storedLanguage !== undefined)
        localStorage.setItem("displayLanguage", storedLanguage);
      vi.spyOn(navigator, "languages", "get").mockReturnValue([
        browserLanguage,
      ]);
      const context = await createApplication();
      const container = mountApplication(context.app);

      expect(container.querySelector("main")?.getAttribute("lang")).toBe(
        language
      );
      expect(container.querySelector("main")?.getAttribute("dir")).toBe(
        direction
      );
      expect(container.querySelector("h1")?.textContent).toBe(title);
    }
  );

  it("keeps recovery usable when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });
    const context = await createApplication();
    const container = mountApplication(context.app);

    expect(container.querySelector("button")?.textContent).toBe("Reload");
    expect(document.activeElement).toBe(container.querySelector("h1"));
  });

  it.each(["import", "initialization"])(
    "does not block startup when telemetry %s fails",
    async (failure) => {
      const telemetryError = new Error("Telemetry unavailable");
      const logError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      vi.doMock("src/boot/sentry", () => {
        if (failure === "import") throw telemetryError;
        return {
          default: () => {
            throw telemetryError;
          },
        };
      });

      const { default: startup } = await import("src/boot/startup");
      const context = await createApplication();
      await startup(context);
      const container = mountApplication(context.app);

      expect(container.textContent).toBe("Application ready");
      expect(applicationSetup).toHaveBeenCalledOnce();
      expect(logError).toHaveBeenCalledOnce();
    }
  );

  it.each([
    { dev: true, prod: false, staging: "false", logger: "devBrowserLogger" },
    { dev: false, prod: true, staging: "true", logger: undefined },
  ])(
    "preserves telemetry selection for $dev/$staging",
    async ({ dev, prod, staging, logger }) => {
      vi.stubEnv("DEV", dev);
      vi.stubEnv("PROD", prod);
      vi.stubEnv("VITE_STAGING", staging);

      const { default: startup } = await import("src/boot/startup");
      const context = await createApplication();
      await startup(context);

      expect(initializedBoots).not.toContain("sentry");
      expect(initializedBoots.includes("devBrowserLogger")).toBe(
        logger === "devBrowserLogger"
      );
      const container = mountApplication(context.app);
      expect(container.textContent).toBe("Application ready");
    }
  );
});
