import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
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
vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent({
    name: "ZKConfirmDialog",
    props: {
      modelValue: { type: Boolean, required: true },
      title: { type: String, required: true },
      confirmText: { type: String, required: true },
      cancelText: { type: String, required: true },
    },
    emits: ["confirm", "update:modelValue"],
    setup(props, { emit, slots }) {
      return () => {
        if (!props.modelValue) return null;
        return h("div", { class: "confirm-dialog-stub" }, [
          h("h3", props.title),
          slots.default?.(),
          h(
            "button",
            {
              class: "confirm-button-stub",
              onClick: () => {
                emit("confirm");
                emit("update:modelValue", false);
              },
            },
            props.confirmText
          ),
          h("span", props.cancelText),
        ]);
      };
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
    expect(container.querySelector(".input-stub")?.nextElementSibling).toBe(
      zeroRecipientBanner
    );
    expect(banners.indexOf(zeroRecipientBanner ?? document.body)).toBeLessThan(
      banners.indexOf(policyBanner ?? document.body)
    );
    expect(policyBanner?.nextElementSibling?.classList).toContain(
      "checkbox-stub"
    );
  });

  it("explains real recipients and provides optional writing suggestions", () => {
    const container = mountComposer({
      locale: "en",
      audienceEstimate: 12,
      relatedConversationOwnerCount: 2,
    });
    const text = container.textContent ?? "";
    const editor = container.querySelector(".editor-stub");

    expect(text).not.toContain("This test goes only to the facilitator");
    expect(text).toContain(
      "The real update will reach eligible participants plus 2 authorized project managers."
    );
    expect(text).toContain(
      "Anyone who is both an eligible participant and an authorized project manager receives one owner copy."
    );
    expect(editor?.getAttribute("data-placeholder")).toBe(
      "Possible updates:\n• Share results\n• Share recent changes\n• Highlight new statements\n• Invite participants to return and vote on newly added statements, improving the analysis as participation grows\n\nRemember: this email will be sent to all eligible participants, whether they responded to some statements or none at all.\n\nLinks to the selected conversations are added automatically at the end of the email, using their project pages when applicable. You do not need to include them here, but you may."
    );
  });

  it("confirms that a test goes only to the facilitator before requesting it", async () => {
    const testHandler = vi.fn();
    const container = mountComposer({
      locale: "en",
      audienceEstimate: 12,
      relatedConversationOwnerCount: 2,
      testHandler,
    });

    expect(container.textContent).not.toContain(
      "This test goes only to the facilitator"
    );
    getButton(container, "Send test email").click();
    await nextTick();

    expect(container.textContent).toContain("Send this test email?");
    expect(container.textContent).toContain(
      "This test goes only to the facilitator at facilitator@example.com."
    );
    expect(testHandler).not.toHaveBeenCalled();

    const confirmButton = container.querySelector<HTMLButtonElement>(
      ".confirm-button-stub"
    );
    expect(confirmButton).not.toBeNull();
    confirmButton?.click();
    expect(testHandler).toHaveBeenCalledOnce();
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

  it("renders recipient details and multiline guidance in an RTL language", () => {
    const container = mountComposer({
      locale: "ar",
      audienceEstimate: 12,
      relatedConversationOwnerCount: 2,
    });
    const text = container.textContent ?? "";
    const editor = container.querySelector(".editor-stub");

    expect(text).toContain("مديري المشروع المخوّلين");
    expect(text).not.toContain("Compose update");
    expect(editor?.getAttribute("data-placeholder")).toContain(
      "• شارك النتائج\n• شارك التغييرات الأخيرة"
    );
    expect(editor?.getAttribute("data-placeholder")).toContain(
      "تُضاف روابط المحادثات المحددة تلقائيًا"
    );
  });
});

function mountComposer({
  locale,
  audienceEstimate,
  relatedConversationOwnerCount,
  testHandler = undefined,
}: {
  locale: SupportedDisplayLanguageCodes;
  audienceEstimate: number;
  relatedConversationOwnerCount: number;
  testHandler?: () => void;
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
    onTest: testHandler,
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
        return () =>
          h("label", { class: "input-stub" }, [props.label, props.hint]);
      },
    })
  );
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === label
  );
  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

function slotComponent(tag: string) {
  return defineComponent(
    (_props, { slots }) =>
      () =>
        h(tag, slots.default?.())
  );
}
