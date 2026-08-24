import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";

vi.mock(
  "src/components/conversationUpdates/ConversationUpdateScopeFields.vue",
  () => ({
    default: defineComponent(() => () => null),
  })
);
vi.mock("src/components/editor/Editor.vue", () => ({
  default: defineComponent({
    name: "Editor",
    props: {
      placeholder: { type: String, required: true },
    },
    setup(props) {
      return () =>
        h("div", {
          class: "editor-stub",
          "data-placeholder": props.placeholder,
        });
    },
  }),
}));
vi.mock("src/components/ui-library/ZKButton.vue", () => ({
  default: defineComponent({
    name: "ZKButton",
    props: {
      label: { type: String, required: true },
    },
    setup(props) {
      return () => h("button", props.label);
    },
  }),
}));
vi.mock("src/components/ui-library/ZKCheckbox.vue", () => ({
  default: defineComponent({
    name: "ZKCheckbox",
    props: {
      label: { type: String, required: true },
    },
    setup(props) {
      return () => h("div", { class: "checkbox-stub" }, props.label);
    },
  }),
}));
vi.mock("src/components/ui-library/ZKInfoBanner.vue", () => ({
  default: defineComponent({
    name: "ZKInfoBanner",
    props: {
      message: { type: String, required: true },
      variant: { type: String, default: "info" },
    },
    setup(props) {
      return () =>
        h(
          "div",
          { class: "banner-stub", "data-variant": props.variant },
          props.message
        );
    },
  }),
}));

import ConversationUpdateComposerForm from "./ConversationUpdateComposerForm.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdateComposerForm", () => {
  it("keeps the zero-recipient warning prominent and places policy by confirmation", () => {
    const container = mountComposer({
      locale: "en",
      audienceEstimate: 0,
      relatedConversationOwnerCount: 2,
    });
    const banners = Array.from(container.querySelectorAll(".banner-stub"));
    const zeroRecipientBanner = banners.find(
      (banner) => banner.getAttribute("data-variant") === "error"
    );
    const policyBanner = banners.find((banner) =>
      banner.textContent?.startsWith(
        "Keep this update strictly about the selected conversations."
      )
    );

    expect(zeroRecipientBanner?.textContent).toContain(
      "No participants are currently eligible"
    );
    expect(banners.indexOf(zeroRecipientBanner ?? document.body)).toBeLessThan(
      banners.indexOf(policyBanner ?? document.body)
    );
    expect(policyBanner?.nextElementSibling?.classList).toContain(
      "checkbox-stub"
    );
  });

  it("explains test and real recipients and provides structured group guidance", () => {
    const container = mountComposer({
      locale: "en",
      audienceEstimate: 12,
      relatedConversationOwnerCount: 2,
    });
    const text = container.textContent ?? "";
    const editor = container.querySelector(".editor-stub");

    expect(text).toContain(
      "This test goes only to the facilitator at facilitator@example.com. Nobody else receives anything until you send the real update."
    );
    expect(text).toContain(
      "The real update will reach eligible participants plus 2 authorized project managers."
    );
    expect(text).toContain(
      "Anyone who is both an eligible participant and an authorized project manager receives one owner copy."
    );
    expect(editor?.getAttribute("data-placeholder")).toBe(
      "Share a concise group update:\n• Share results\n• Explain what changed\n• Highlight new statements\n• Invite participants to return\n\nRemember: some participants may have responded to everything; others may not have."
    );
  });

  it("uses localized singular owner-copy wording", () => {
    const container = mountComposer({
      locale: "en",
      audienceEstimate: 12,
      relatedConversationOwnerCount: 1,
    });

    expect(container.textContent).toContain(
      "eligible participants plus 1 authorized project manager."
    );
    expect(container.textContent).not.toContain(
      "1 authorized project managers"
    );
  });

  it("renders dynamic notices and multiline guidance in an RTL language", () => {
    const container = mountComposer({
      locale: "ar",
      audienceEstimate: 12,
      relatedConversationOwnerCount: 2,
    });
    const text = container.textContent ?? "";
    const editor = container.querySelector(".editor-stub");

    expect(text).toContain("يُرسل هذا الاختبار إلى المُيسّر فقط");
    expect(text).toContain("facilitator@example.com");
    expect(text).toContain("مديري المشروع المخوّلين");
    expect(text).not.toContain("Compose update");
    expect(editor?.getAttribute("data-placeholder")).toContain(
      "• شارك النتائج\n• اشرح ما تغيّر"
    );
  });
});

function mountComposer({
  locale,
  audienceEstimate,
  relatedConversationOwnerCount,
}: {
  locale: SupportedDisplayLanguageCodes;
  audienceEstimate: number;
  relatedConversationOwnerCount: number;
}): HTMLElement {
  const container = document.createElement("div");
  container.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.append(container);
  const app = createApp(ConversationUpdateComposerForm, {
    scopes: [
      {
        id: "project-one",
        kind: "project",
        label: "Project One",
        href: "/project/project-one",
        contactEmail: "project@example.com",
        eligibleParticipantCap: 12,
        conversations: [
          {
            id: "conversation-one",
            title: "Conversation One",
            href: "/conversation/conversation-one",
            eligibleParticipantCount: 12,
            participationMode: "account_required",
            ownerIds: ["owner-one"],
          },
        ],
      },
    ],
    updatesDisabledConversationIds: [],
    testPending: false,
    sendPending: false,
    notice: undefined,
    hasSuccessfulTest: false,
    audienceEstimate,
    audienceEstimateAvailable: true,
    testDestinationEmail: "facilitator@example.com",
    relatedConversationOwnerCount,
    selectedScopeId: "project-one",
    selectedConversationIds: ["conversation-one"],
    subject: "Update subject",
    bodyHtml: "<p>Update body</p>",
    bodyPlainText: "Update body",
    contentConfirmed: false,
  });
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: {},
  });
  app.use(i18n);
  app.component("QCard", slotComponent("section"));
  app.component("QCardSection", slotComponent("section"));
  app.component("QCardActions", slotComponent("div"));
  app.component(
    "QSeparator",
    defineComponent(() => () => h("hr"))
  );
  app.component(
    "QIcon",
    defineComponent(() => () => null)
  );
  app.component(
    "QInput",
    defineComponent({
      props: {
        label: { type: String, required: true },
        hint: { type: String, default: "" },
      },
      setup(props) {
        return () => h("label", [props.label, props.hint]);
      },
    })
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
