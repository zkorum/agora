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
  it("localizes facilitator-written consent for both scopes", () => {
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
      "written and sent by project facilitators"
    );
    expect(conversation.textContent).toContain(
      "written and sent by conversation facilitators"
    );
    expect(project.textContent).toContain(
      "No advertising, fundraising, political campaigning, or unrelated promotion."
    );
    expect(project.textContent).toContain(
      "You can change this anytime in email settings."
    );
  });

  it("renders consent copy in an RTL locale without English leakage", () => {
    const container = mountConsent({ locale: "ar", scopeKind: "project" });

    expect(container.dir).toBe("rtl");
    expect(container.textContent).toContain("هذا المشروع");
    expect(container.textContent).toContain("ميسّرو المشروع");
    expect(container.textContent).toContain("إعدادات البريد الإلكتروني");
    expect(container.textContent).not.toContain("Email me");
  });

  it("uses the approved French scope-specific consent copy", () => {
    const project = mountConsent({ locale: "fr", scopeKind: "project" });
    const conversation = mountConsent({
      locale: "fr",
      scopeKind: "no-project",
    });

    expect(project.textContent).toContain("Suivre le projet par e-mail");
    expect(project.textContent).toContain(
      "Ces nouvelles sont rédigées et envoyées par les facilitateurs du projet pour vous tenir informé et vous permettre de participer à nouveau. Aucun contenu publicitaire, appel aux dons, campagne politique ou promotion sans rapport avec le projet n’est autorisé. Vous pouvez modifier ce choix à tout moment dans les paramètres d’e-mail."
    );
    expect(conversation.textContent).toContain(
      "Suivre la conversation par e-mail"
    );
    expect(conversation.textContent).toContain(
      "Ces nouvelles sont rédigées et envoyées par les facilitateurs de la conversation pour vous tenir informé et vous permettre de participer à nouveau. Aucun contenu publicitaire, appel aux dons, campagne politique ou promotion sans rapport avec la conversation n’est autorisé. Vous pouvez modifier ce choix à tout moment dans les paramètres d’e-mail."
    );
  });

  it("uses idiomatic Spanish copy with facilitator and content safeguards", () => {
    const project = mountConsent({ locale: "es", scopeKind: "project" });
    const text = project.textContent ?? "";

    expect(text).toContain("Seguir el proyecto por correo");
    expect(text).toContain("redactadas y enviadas por quienes facilitan");
    expect(text).toContain("permitirte volver a participar");
    expect(text).toContain("publicidad");
    expect(text).toContain("recaudación de fondos");
    expect(text).toContain("campañas políticas");
    expect(text).toContain("promoción que no esté relacionada");
    expect(text).toContain("Puedes cambiar esta opción");
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
