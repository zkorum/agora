import type { ConversationUpdateConversationSummary } from "src/components/conversationUpdates/conversationUpdateTypes";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";
import { z } from "zod";

const optionSchema = z.object({
  label: z.string(),
  caption: z.string(),
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
    },
    setup(props) {
      return () => {
        const options = z.array(optionSchema).parse(props.options);
        return h("section", [
          props.label,
          props.placeholder,
          props.dialogTitle,
          props.dialogSubtitle,
          props.selectAllLabel,
          props.clearAllLabel,
          ...options.flatMap((option) => [option.label, option.caption]),
        ]);
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
});

function mountScopeFields({
  locale,
  participantCount,
  selectedScopeId,
}: {
  locale: SupportedDisplayLanguageCodes;
  participantCount: number;
  selectedScopeId: "project-one" | "without-project";
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
    updatesDisabledConversationIds: [],
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
