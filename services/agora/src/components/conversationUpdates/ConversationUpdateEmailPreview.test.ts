import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";

vi.mock("src/components/ui-library/SpaLink.vue", () => ({
  default: defineComponent(
    (_props, { slots }) =>
      () =>
        h("a", slots.default?.())
  ),
}));
vi.mock("src/components/ui-library/ZKChip.vue", () => ({
  default: defineComponent(
    (_props, { slots }) =>
      () =>
        h("span", { class: "chip" }, slots.default?.())
  ),
}));
vi.mock("src/components/ui-library/ZKHtmlContent.vue", () => ({
  default: defineComponent(() => () => h("div", { class: "html-content" })),
}));

import ConversationUpdateEmailPreview from "./ConversationUpdateEmailPreview.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdateEmailPreview", () => {
  it("localizes placeholders, metadata, footer, and singular audience copy", () => {
    const container = mountPreview({ locale: "en", audienceEstimate: 1 });
    const text = container.textContent ?? "";

    expect(text).toContain("Email preview");
    expect(text).toContain("Your update subject");
    expect(text).toContain("Currently 1 eligible recipient");
    expect(text).not.toContain("1 eligible recipients");
    expect(text).toContain("From Agora");
    expect(text).toContain("Reply to reply@example.com");
    expect(text).toContain("Your message will appear here as you write.");
    expect(text).toContain("Select a conversation to continue.");
    expect(text).toContain("Manage preferences");
  });

  it("uses locale-aware digits and translated copy in an RTL locale", () => {
    const audienceEstimate = 1234;
    const container = mountPreview({ locale: "ar", audienceEstimate });
    const text = container.textContent ?? "";

    expect(container.dir).toBe("rtl");
    expect(text).toContain("معاينة البريد الإلكتروني");
    expect(text).toContain(
      new Intl.NumberFormat("ar").format(audienceEstimate)
    );
    expect(text).toContain("إدارة التفضيلات");
    expect(text).not.toContain("Email preview");
    expect(text).not.toContain("Currently");
  });
});

function mountPreview({
  locale,
  audienceEstimate,
}: {
  locale: SupportedDisplayLanguageCodes;
  audienceEstimate: number;
}): HTMLElement {
  const container = document.createElement("div");
  container.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.append(container);
  const app = createApp(ConversationUpdateEmailPreview, {
    subject: "",
    bodyHtml: "",
    replyTo: "reply@example.com",
    scopeKind: "no-project",
    scopeHref: undefined,
    scopeLabel: "Conversation One",
    conversations: [],
    audienceEstimate,
  });
  app.use(createI18n({ legacy: false, locale, messages: {} }));
  app.component("QCard", slotComponent("section"));
  app.component("QCardSection", slotComponent("section"));
  app.component(
    "QSeparator",
    defineComponent(() => () => h("hr"))
  );
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function slotComponent(tag: string) {
  return defineComponent(
    (_props, { slots }) =>
      () =>
        h(tag, slots.default?.())
  );
}
