import { afterEach, describe, expect, it } from "vitest";
import { type App, createApp } from "vue";

import ZKFieldLabel from "./ZKFieldLabel.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ZKFieldLabel", () => {
  it("renders a visual-only required marker", () => {
    const container = mountLabel({ required: true });
    const marker = container.querySelector(".zk-field-label__required");

    expect(container.textContent).toContain("Subject *");
    expect(marker?.getAttribute("aria-hidden")).toBe("true");
  });

  it("omits the marker for optional fields", () => {
    const container = mountLabel({ required: false });

    expect(container.textContent?.trim()).toBe("Subject");
    expect(container.querySelector(".zk-field-label__required")).toBeNull();
  });
});

function mountLabel({ required }: { required: boolean }): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(ZKFieldLabel, {
    label: "Subject",
    required,
    requiredText: required ? "Required." : undefined,
  });
  mountedApps.push(app);
  app.mount(container);
  return container;
}
