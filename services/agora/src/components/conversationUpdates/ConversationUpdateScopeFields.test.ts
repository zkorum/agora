import type { ConversationUpdateConversationSummary } from "src/components/conversationUpdates/conversationUpdateTypes";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";
import { z } from "zod";

const optionSchema = z.object({
  label: z.string(),
  caption: z.string(),
  disabled: z.boolean().optional(),
});

vi.mock("src/components/ui-library/ZKSearchableBottomSheetSelect.vue", () => ({
  default: defineComponent({
    props: {
      label: { type: String, required: true },
      placeholder: { type: String, default: "" },
      dialogTitle: { type: String, required: true },
      dialogSubtitle: { type: String, required: true },
      selectAllLabel: { type: String, default: "" },
      clearAllLabel: { type: String, default: "" },
      options: { type: Array, required: true },
      required: { type: Boolean, default: false },
      multiple: { type: Boolean, default: false },
      showBulkActions: { type: Boolean, default: false },
    },
    setup(props) {
      return () => {
        const options = z.array(optionSchema).parse(props.options);
        return h(
          "section",
          {
            "data-label": `${props.label}${props.required ? " *" : ""}`,
            "data-required": String(props.required),
            "data-multiple": String(props.multiple),
            "data-show-bulk-actions": String(props.showBulkActions),
          },
          [
            `${props.label}${props.required ? " *" : ""}`,
            props.placeholder,
            props.dialogTitle,
            props.dialogSubtitle,
            props.selectAllLabel,
            props.clearAllLabel,
            ...options.map((option) =>
              h(
                "div",
                {
                  "data-option": option.label,
                  "data-disabled": String(option.disabled ?? false),
                },
                [option.label, option.caption]
              )
            ),
          ]
        );
      };
    },
  }),
}));

import ConversationUpdateScopeFields from "./ConversationUpdateScopeFields.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdateScopeFields", () => {
  it("localizes labels and singular/plural dynamic counts", () => {
    const container = mountScopeFields({
      locale: "en",
      participantCount: 1,
      selectedScopeId: "without-project",
    });
    const text = container.textContent ?? "";

    expect(container.querySelector('[data-label="Project *"]')).not.toBeNull();
    expect(
      container.querySelector('[data-label="Included conversations *"]')
    ).not.toBeNull();
    expect(
      container
        .querySelector('[data-label="Project *"]')
        ?.getAttribute("data-required")
    ).toBe("true");
    expect(text).toContain("Choose a project");
    expect(text).toContain("1 eligible conversation");
    expect(text).not.toContain("1 eligible conversations");
    expect(text).toContain("About 1 participant before email consent filters");
    expect(text).toContain("Select the 1 eligible conversation");
    expect(text).toContain("Clear all");
  });

  it("uses locale-aware counts and translated controls in an RTL locale", () => {
    const participantCount = 1234;
    const container = mountScopeFields({
      locale: "ar",
      participantCount,
      selectedScopeId: "project-one",
    });
    const text = container.textContent ?? "";

    expect(container.dir).toBe("rtl");
    expect(text).toContain("اختر مشروعًا");
    expect(text).toContain(
      new Intl.NumberFormat("ar").format(participantCount)
    );
    expect(text).toContain("مسح الكل");
    expect(text).not.toContain("Choose a project");
    expect(text).not.toContain("eligible conversations");
  });

  it("uses single selection without bulk actions for No Project", () => {
    const container = mountScopeFields({
      locale: "en",
      participantCount: 2,
      selectedScopeId: "without-project",
    });
    const conversationSelect = container.querySelector(
      '[data-label="Included conversations *"]'
    );

    expect(conversationSelect?.getAttribute("data-multiple")).toBe("false");
    expect(conversationSelect?.getAttribute("data-show-bulk-actions")).toBe(
      "false"
    );
  });

  it("keeps a scope visible but disabled when none of its conversations can send", () => {
    const container = mountScopeFields({
      locale: "en",
      participantCount: 2,
      selectedScopeId: "without-project",
      updatesDisabledConversationIds: ["three"],
    });
    const noProjectOption = container.querySelector(
      '[data-option="Without Project"]'
    );

    expect(noProjectOption?.getAttribute("data-disabled")).toBe("true");
    expect(noProjectOption?.textContent).toContain(
      "0 eligible conversations without a project"
    );
  });
});

function mountScopeFields({
  locale,
  participantCount,
  selectedScopeId,
  updatesDisabledConversationIds = [],
}: {
  locale: SupportedDisplayLanguageCodes;
  participantCount: number;
  selectedScopeId: "project-one" | "without-project";
  updatesDisabledConversationIds?: readonly string[];
}): HTMLElement {
  const container = document.createElement("div");
  container.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.append(container);
  const app = createApp(ConversationUpdateScopeFields, {
    scopes: [
      {
        id: "project-one",
        kind: "project",
        label: "Project One",
        href: "/project/project-one",
        contactEmail: "project@example.com",
        eligibleParticipantCap: participantCount,
        conversations: [
          conversation({ id: "one", participantCount }),
          conversation({ id: "two", participantCount: 2 }),
        ],
      },
      {
        id: "without-project",
        kind: "no-project",
        label: "Without Project",
        href: undefined,
        contactEmail: "conversation@example.com",
        eligibleParticipantCap: participantCount,
        conversations: [conversation({ id: "three", participantCount })],
      },
    ],
    updatesDisabledConversationIds,
    disabled: false,
    selectedScopeId,
    selectedConversationIds: [],
  });
  app.use(createI18n({ legacy: false, locale, messages: {} }));
  mountedApps.push(app);
  app.mount(container);
  return container;
}

function conversation({
  id,
  participantCount,
}: {
  id: string;
  participantCount: number;
}): ConversationUpdateConversationSummary {
  return {
    id,
    title: `Conversation ${id}`,
    href: `/conversation/${id}`,
    eligibleParticipantCount: participantCount,
    participationMode: "account_required",
    ownerIds: [],
  };
}
