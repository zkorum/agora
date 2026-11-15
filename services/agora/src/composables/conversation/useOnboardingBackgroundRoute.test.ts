import { createPinia, setActivePinia } from "pinia";
import { QBtn, QDialog, Quasar } from "quasar";
import ApplicationRouteView from "src/components/navigation/ApplicationRouteView.vue";
import ConversationOnboardingLayout from "src/layouts/ConversationOnboardingLayout.vue";
import ConversationOnboarding from "src/pages/conversation/[postSlugId].onboarding.vue";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { withOnboardingAliases } from "src/utils/router/onboardingAliases";
import { registerOnboardingNavigation } from "src/utils/router/onboardingNavigation";
import { getSingleRouteParam } from "src/utils/router/params";
import type { DismissalController } from "src/utils/ui/dismissalController";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  useRoute,
} from "vue-router";

import { useConversationOnboardingExit } from "./useConversationOnboardingExit";
import { useOnboardingBackgroundRoute } from "./useOnboardingBackgroundRoute";

vi.mock("src/layouts/PersistentLayout.vue", async () => {
  const { defineComponent } = await import("vue");
  return {
    default: defineComponent(
      (_props, { slots }) =>
        () =>
          slots.default?.()
    ),
  };
});

const mountedApps: App[] = [];

afterEach(async () => {
  for (const app of mountedApps.splice(0)) app.unmount();
  await settle();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  await nextTick();
}

async function mountFlow({
  path,
  backgroundDelay,
  exitOnDismiss = false,
}: {
  path: string;
  backgroundDelay: Promise<void>;
  exitOnDismiss?: boolean;
}) {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const dismiss = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const Conversation = defineComponent(() => {
    const route = useRoute();
    return () => h("article", { "data-background": "" }, route.fullPath);
  });
  const loadConversation = vi.fn(async () => {
    await backgroundDelay;
    return Conversation;
  });
  const Step = defineComponent(
    (props: { sheet: DismissalController }) => {
      const route = useRoute();
      const { exitToConversation } = useConversationOnboardingExit();
      const close = async () => {
        await dismiss();
        if (exitOnDismiss)
          await exitToConversation({
            conversationSlugId: getSingleRouteParam(
              "postSlugId" in route.params ? route.params.postSlugId : undefined
            ),
          });
      };
      return () =>
        h(
          ConversationOnboardingLayout,
          {
            sheet: props.sheet,
            backCallback: () => {},
            closeCallback: close,
          },
          { default: () => h("div", route.fullPath) }
        );
    },
    { props: { sheet: { type: Object, required: true } } }
  );
  const router = createRouter({
    history: createMemoryHistory(),
    routes: withOnboardingAliases([
      {
        path: "/",
        name: "/",
        component: defineComponent(
          () => () => h("article", { "data-background": "" }, "Feed")
        ),
      },
      {
        path: "/settings/",
        name: "/settings/",
        component: defineComponent(
          () => () => h("article", { "data-background": "" }, "Settings")
        ),
      },
      {
        path: "/conversation/:postSlugId/",
        name: "/conversation/[postSlugId]/",
        component: loadConversation,
      },
      {
        path: "/conversation/:postSlugId/embed",
        name: "/conversation/[postSlugId].embed/",
        component: loadConversation,
      },
      {
        path: "/project/:projectSlug/conversation/:postSlugId/",
        name: "/project/[projectSlug]/conversation/[postSlugId]/",
        component: loadConversation,
      },
      {
        path: "/conversation/:postSlugId/onboarding",
        name: "/conversation/[postSlugId].onboarding",
        component: ConversationOnboarding,
        children: [
          {
            path: "",
            name: "/conversation/[postSlugId].onboarding/",
            component: Step,
          },
          {
            path: "summary",
            name: "/conversation/[postSlugId].onboarding/summary",
            component: Step,
          },
        ],
      },
    ]),
  });
  const pinia = createPinia();
  setActivePinia(pinia);
  registerOnboardingNavigation(router);
  await router.push(path);
  const app = createApp(
    defineComponent(() => {
      const { background, isOnboarding } = useOnboardingBackgroundRoute();
      return () =>
        h("div", [
          background.value.kind === "ready"
            ? h(ApplicationRouteView, { route: background.value.route })
            : null,
          isOnboarding.value ? h(RouterView) : null,
        ]);
    })
  );
  app.use(pinia);
  app.use(router);
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  app.use(Quasar, { components: { QDialog, QBtn } });
  const container = document.createElement("div");
  document.body.append(container);
  mountedApps.push(app);
  app.mount(container);
  await settle();
  return {
    router,
    dismiss,
    loadConversation,
    onboarding: useConversationOnboardingStore(pinia),
    ...app.runWithContext(useConversationOnboardingExit),
  };
}

describe("routed conversation onboarding", () => {
  it("restores the original window scroll after the routed dialog releases its body lock", async () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(470);
    const { router, exitToConversation } = await mountFlow({
      path: "/conversation/example/?filter=new",
      backgroundDelay: Promise.resolve(),
    });
    await router.push("/conversation/example/onboarding/");
    await settle();
    await exitToConversation({ conversationSlugId: "example" });
    await settle();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 470 });
  });

  it.each([
    "/?filter=recent",
    "/conversation/example/?filter=new",
    "/conversation/example/?opinion=existing&filter=new",
    "/project/test/conversation/example/?filter=new",
    "/conversation/example/embed?filter=new",
  ])(
    "closes to the exact originating page at %s without remounting it",
    async (path) => {
      const { router, onboarding } = await mountFlow({
        path,
        backgroundDelay: Promise.resolve(),
        exitOnDismiss: true,
      });
      const background = document.querySelector("[data-background]");
      await router.push("/conversation/example/onboarding/");
      await settle();
      document
        .querySelector('[aria-label="Close"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await vi.waitFor(() =>
        expect(router.currentRoute.value.fullPath).toBe(path)
      );
      expect(document.querySelector("[data-background]")).toBe(background);
      expect(document.querySelector(".q-dialog")).toBeNull();
      expect(onboarding.conversationSlugId).toBeNull();
    }
  );

  it("returns in place after completion and clears the session on browser back", async () => {
    const { router, onboarding, exitToConversation } = await mountFlow({
      path: "/conversation/example/?filter=new",
      backgroundDelay: Promise.resolve(),
    });
    const background = document.querySelector("[data-background]");
    await router.push("/conversation/example/onboarding/");
    await router.push("/conversation/example/onboarding/summary");
    await exitToConversation({ conversationSlugId: "example" });
    await settle();
    expect(router.currentRoute.value.fullPath).toBe(
      "/conversation/example/?filter=new"
    );
    expect(document.querySelector("[data-background]")).toBe(background);
    await router.push("/conversation/example/onboarding/");
    router.back();
    await vi.waitFor(() => expect(onboarding.conversationSlugId).toBeNull());
    expect(router.currentRoute.value.fullPath).toBe(
      "/conversation/example/?filter=new"
    );
  });

  it("ignores a late exit after a newer navigation has left onboarding", async () => {
    const { router, exitToConversation } = await mountFlow({
      path: "/conversation/example/",
      backgroundDelay: Promise.resolve(),
    });
    await router.push("/conversation/example/onboarding/");
    await router.replace("/settings/");
    await exitToConversation({ conversationSlugId: "example" });
    expect(router.currentRoute.value.path).toBe("/settings/");
  });

  it("does not initialize onboarding for a navigation rejected by a guard", async () => {
    const { router, onboarding } = await mountFlow({
      path: "/conversation/example/",
      backgroundDelay: Promise.resolve(),
    });
    const stopGuard = router.beforeEach((to) =>
      to.path.includes("/onboarding") ? false : undefined
    );
    await router.push("/conversation/example/onboarding/");
    expect(onboarding.conversationSlugId).toBeNull();
    stopGuard();
  });

  it("falls back to the scoped conversation after a direct onboarding link", async () => {
    const { router, exitToConversation } = await mountFlow({
      path: "/project/test/conversation/example/onboarding/",
      backgroundDelay: Promise.resolve(),
    });
    const background = document.querySelector("[data-background]");
    await exitToConversation({ conversationSlugId: "example" });
    await settle();
    expect(router.currentRoute.value.path).toBe(
      "/project/test/conversation/example/"
    );
    expect(document.querySelector("[data-background]")).toBe(background);
  });

  it("reconstructs and returns to the embedded conversation after a refreshed embedded onboarding link", async () => {
    const { router, exitToConversation } = await mountFlow({
      path: "/conversation/example/embed/onboarding",
      backgroundDelay: Promise.resolve(),
    });
    const background = document.querySelector("[data-background]");
    expect(background?.textContent).toBe("/conversation/example/embed");
    await exitToConversation({ conversationSlugId: "example" });
    await settle();
    expect(router.currentRoute.value.path).toBe("/conversation/example/embed");
    expect(document.querySelector("[data-background]")).toBe(background);
  });

  it("retains the background instance and route while steps change and when returning", async () => {
    const { router } = await mountFlow({
      path: "/conversation/example/?opinion=statement",
      backgroundDelay: Promise.resolve(),
    });
    const background = document.querySelector("[data-background]");
    await router.push("/conversation/example/onboarding/");
    await settle();
    const dialog = document.querySelector(".q-dialog");
    expect(document.querySelector("[data-background]")).toBe(background);
    expect(background?.textContent).toBe(
      "/conversation/example/?opinion=statement"
    );

    await router.push("/conversation/example/onboarding/summary");
    await settle();
    expect(document.querySelector(".q-dialog")).toBe(dialog);
    expect(background?.textContent).toBe(
      "/conversation/example/?opinion=statement"
    );

    await router.push("/conversation/example/?opinion=statement");
    await settle();
    expect(document.querySelector("[data-background]")).toBe(background);
    expect(document.querySelector(".q-dialog")).toBeNull();
  });

  it("reconstructs the project conversation beneath a direct onboarding link", async () => {
    await mountFlow({
      path: "/project/test/conversation/example/onboarding/",
      backgroundDelay: Promise.resolve(),
    });
    expect(document.querySelector("[data-background]")?.textContent).toBe(
      "/project/test/conversation/example/"
    );
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
  });

  it("delegates backdrop dismissal to the step and stays open if it cannot leave", async () => {
    const { dismiss } = await mountFlow({
      path: "/conversation/example/onboarding/",
      backgroundDelay: Promise.resolve(),
    });
    document
      .querySelector(".q-dialog__backdrop")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    expect(dismiss).toHaveBeenCalledOnce();
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
  });

  it("delegates a downward drag to the same step dismissal", async () => {
    const { dismiss } = await mountFlow({
      path: "/conversation/example/onboarding/",
      backgroundDelay: Promise.resolve(),
    });
    document
      .querySelector(".dialog-drag-handle")
      ?.dispatchEvent(
        new PointerEvent("pointerdown", { clientY: 100, button: 0 })
      );
    window.dispatchEvent(new PointerEvent("pointermove", { clientY: 190 }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientY: 190 }));
    await settle();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("keeps the originating feed without loading another page", async () => {
    const { router, loadConversation } = await mountFlow({
      path: "/",
      backgroundDelay: Promise.resolve(),
    });
    const background = document.querySelector("[data-background]");
    await router.push("/conversation/example/onboarding/");
    await settle();
    expect(document.querySelector("[data-background]")).toBe(background);
    expect(background?.textContent).toBe("Feed");
    expect(loadConversation).not.toHaveBeenCalled();
  });

  it("finishes one background import across step redirects", async () => {
    const backgroundDelay = Promise.withResolvers<void>();
    const { router, loadConversation } = await mountFlow({
      path: "/conversation/example/onboarding/",
      backgroundDelay: backgroundDelay.promise,
    });
    await router.push("/conversation/example/onboarding/summary");
    backgroundDelay.resolve();
    await settle();
    expect(loadConversation).toHaveBeenCalledOnce();
    expect(document.querySelector("[data-background]")?.textContent).toBe(
      "/conversation/example/"
    );
  });

  it("does not replace a newer page when an old background import finishes", async () => {
    const backgroundDelay = Promise.withResolvers<void>();
    const { router } = await mountFlow({
      path: "/conversation/example/onboarding/",
      backgroundDelay: backgroundDelay.promise,
    });
    await router.push("/settings/");
    backgroundDelay.resolve();
    await settle();
    expect(document.querySelector("[data-background]")?.textContent).toBe(
      "Settings"
    );
  });

  it("encodes external route parameters instead of loading arbitrary background pages", async () => {
    const { router, exitToConversation } = await mountFlow({
      path: "/conversation/..%2Fsettings/onboarding/",
      backgroundDelay: Promise.resolve(),
    });
    expect(document.querySelector("[data-background]")?.textContent).toBe(
      "/conversation/..%2Fsettings/"
    );
    await exitToConversation({ conversationSlugId: "../settings" });
    expect(router.currentRoute.value.fullPath).toBe(
      "/conversation/..%2Fsettings/"
    );
  });
});
