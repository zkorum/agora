import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";

vi.mock("src/components/ui-library/ZKCheckbox.vue", () => ({
  default: defineComponent({
    props: {
      label: { type: String, required: true },
      description: { type: String, required: true },
    },
    setup(props) {
      return () => h("label", [props.label, h("small", props.description)]);
    },
  }),
}));

import ConversationUpdateOnboardingConsent from "./ConversationUpdateOnboardingConsent.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdateOnboardingConsent", () => {
  it("localizes both consent scopes and the settings description", () => {
    const project = mountConsent({ locale: "en", scopeKind: "project" });
    const conversation = mountConsent({
      locale: "en",
      scopeKind: "no-project",
    });

    expect(project.textContent).toContain(
      "Email me occasional updates about this project"
    );
    expect(conversation.textContent).toContain(
      "Email me occasional updates about this conversation"
    );
    expect(project.textContent).toContain(
      "You can change this anytime in email settings."
    );
  });

  it("renders consent copy in an RTL locale without English leakage", () => {
    const container = mountConsent({ locale: "ar", scopeKind: "project" });

    expect(container.dir).toBe("rtl");
    expect(container.textContent).toContain("هذا المشروع");
    expect(container.textContent).toContain("إعدادات البريد الإلكتروني");
    expect(container.textContent).not.toContain("Email me");
  });
});

function mountConsent({
  locale,
  scopeKind,
}: {
  locale: SupportedDisplayLanguageCodes;
  scopeKind: "no-project" | "project";
}): HTMLElement {
  const container = document.createElement("div");
  container.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.append(container);
  const app = createApp(ConversationUpdateOnboardingConsent, {
    modelValue: false,
    scopeKind,
  });
  app.use(createI18n({ legacy: false, locale, messages: {} }));
  mountedApps.push(app);
  app.mount(container);
  return container;
}
