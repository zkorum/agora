import { afterEach, describe, expect, it } from "vitest";
import { type App, createApp, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import { projectPageFooterTranslations } from "./ProjectPageFooter.i18n";
import ProjectPageFooter from "./ProjectPageFooter.vue";

let app: App | undefined;

afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});

describe("ProjectPageFooter", () => {
  it("renders localized legal links in separate tabs with a decorative middle dot", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { render: () => null } },
        {
          path: "/legal/terms",
          name: "/legal/terms/",
          component: { render: () => null },
        },
        {
          path: "/legal/privacy",
          name: "/legal/privacy/",
          component: { render: () => null },
        },
      ],
    });
    await router.push("/");
    const languageCode = ref("fr");
    const container = document.createElement("div");
    document.body.append(container);
    app = createApp(() =>
      h(ProjectPageFooter, { languageCode: languageCode.value })
    );
    app.use(router);
    app.mount(container);

    expect(container.querySelectorAll("a")).toHaveLength(3);
    expect(container.textContent).not.toContain("appartient aux porteurs");
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      "\u00b7"
    );

    for (const [locale, translations] of Object.entries(
      projectPageFooterTranslations
    )) {
      languageCode.value = locale;
      await nextTick();
      for (const { href, label } of [
        { href: "/legal/terms", label: translations.termsOfService },
        { href: "/legal/privacy", label: translations.privacyPolicy },
      ]) {
        const link = container.querySelector(`a[href="${href}"]`);
        expect(link?.textContent?.trim()).toBe(label);
        expect(link?.getAttribute("target")).toBe("_blank");
        expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
        expect(link?.querySelector(".gradientColor")).not.toBeNull();
        const event = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });
        link?.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
        expect(router.currentRoute.value.path).toBe("/");
      }
    }

    languageCode.value = "unsupported";
    await nextTick();
    expect(container.textContent).toContain("Terms of Service");
    expect(container.textContent).toContain("Privacy Policy");
  });
});
