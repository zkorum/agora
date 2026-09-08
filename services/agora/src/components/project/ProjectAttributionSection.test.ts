import { afterEach, describe, expect, it } from "vitest";
import { type App, createApp, h } from "vue";

import ProjectAttributionSection from "./ProjectAttributionSection.vue";

let app: App | undefined;

afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});

describe("ProjectAttributionSection", () => {
  it("preserves uploaded logo proportions and uses shared initials only without an image", () => {
    const container = document.createElement("div");
    document.body.append(container);
    app = createApp(() =>
      h(ProjectAttributionSection, {
        title: "Project Owners",
        languageCode: "en",
        entries: [
          {
            displayName: "Wide Logo",
            imageUrl: "https://example.com/logo.png",
            accentColor: "#5538ee",
            role: "project_owner",
            websiteUrl: undefined,
          },
          {
            displayName: "  Agora Citizen Network  ",
            imageUrl: undefined,
            accentColor: "#5538ee",
            role: "project_owner",
            websiteUrl: undefined,
          },
        ],
      })
    );
    app.component("QIcon", { render: () => null });
    app.mount(container);

    expect(container.querySelectorAll("img")).toHaveLength(1);
    const image = container.querySelector("img");
    expect(image?.src).toBe("https://example.com/logo.png");
    expect(image?.alt).toBe("Wide Logo");
    expect(image?.style.height).toBe("48px");
    expect(image?.style.width).toBe("");
    expect(image?.style.borderRadius).toBe("");
    expect(image?.style.backgroundColor).toBe("");

    const avatar = container.querySelector<HTMLElement>(
      'span[aria-label="  Agora Citizen Network  "]'
    );
    expect(avatar?.textContent?.trim()).toBe("ACN");
    expect(avatar?.style.width).toBe("48px");
    expect(avatar?.style.borderRadius).toBe("50%");
    expect(avatar?.style.backgroundColor).toBe("rgb(85, 56, 238)");
    expect(
      container.querySelector(".project-attribution-section__logo")
    ).toBeNull();
  });
});
