import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, h, KeepAlive, nextTick, ref } from "vue";

vi.mock("vue-router", () => ({
  useRoute: () => ({ path: "/conversation/test/" }),
  useRouter: () => ({ currentRoute: actualRoute }),
}));

import FloatingBottomContainer from "./FloatingBottomContainer.vue";

const apps: App[] = [];
const actualRoute = ref({ name: "/conversation/[postSlugId]/" });

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  actualRoute.value = { name: "/conversation/[postSlugId]/" };
});

describe("floating composer lifecycle", () => {
  it("makes the teleported background composer inert while keeping its draft mounted", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(FloatingBottomContainer, { anchorElement: undefined }, () =>
          h("input")
        ),
    });
    apps.push(app);
    app.mount(host);
    await nextTick();
    const input = document.querySelector(".bottomBar input");
    if (!(input instanceof HTMLInputElement))
      throw new Error("Missing composer");
    input.value = "Unsaved statement";
    actualRoute.value = { name: "/conversation/[postSlugId].onboarding/" };
    await nextTick();
    const bar = document.querySelector(".bottomBar");
    expect(bar?.hasAttribute("inert")).toBe(true);
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".bottomBar input")).toBe(input);
    expect(input.value).toBe("Unsaved statement");
    actualRoute.value = { name: "/conversation/[postSlugId]/" };
    await nextTick();
    expect(bar?.hasAttribute("inert")).toBe(false);
  });

  it("hides cached overlays without destroying their composer state", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const visible = ref(true);
    const app = createApp({
      render: () =>
        h(KeepAlive, () =>
          visible.value
            ? h(FloatingBottomContainer, { anchorElement: undefined }, () =>
                h("input")
              )
            : undefined
        ),
    });
    apps.push(app);
    app.mount(host);
    await nextTick();

    const input = document.querySelector(".bottomBar input");
    if (!(input instanceof HTMLInputElement))
      throw new Error("Missing composer");
    input.value = "Unsaved statement";
    visible.value = false;
    await nextTick();
    await nextTick();
    const bar = document.querySelector(".bottomBar");
    if (!(bar instanceof HTMLElement)) throw new Error("Missing cached bar");
    expect(bar.style.display).toBe("none");

    visible.value = true;
    await nextTick();
    await nextTick();
    expect(document.querySelector(".bottomBar input")).toBe(input);
    expect(input.value).toBe("Unsaved statement");
    expect(bar.style.display).not.toBe("none");
  });
});
