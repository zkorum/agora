import type { ConversationUpdateHistoryRecord } from "src/components/conversationUpdates/conversationUpdateTypes";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

vi.mock("src/components/ui-library/ZKChip.vue", () => ({
  default: defineComponent(
    (_props, { slots }) =>
      () =>
        h("span", { class: "chip" }, slots.default?.())
  ),
}));

import ConversationUpdateHistoryList from "./ConversationUpdateHistoryList.vue";

const api = vi.hoisted(() => ({ getHistoryPreview: vi.fn() }));
vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));
vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("p", "Loading preview")),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent({
    props: { title: { type: String, required: true } },
    emits: ["retry"],
    setup(props, { emit }) {
      return () => h("button", { onClick: () => emit("retry") }, props.title);
    },
  }),
}));
vi.mock("src/components/ui-library/ZKInfoBanner.vue", () => ({
  default: defineComponent({
    props: { message: { type: String, required: true } },
    setup(props) {
      return () => h("p", props.message);
    },
  }),
}));

const baseRecord = {
  subject: "Update subject",
  scopeLabel: "Project One",
  conversations: [
    {
      title: "Conversation One",
      href: "/conversation/conversation-one",
    },
  ],
  audienceEstimate: 1,
  ownerCopyCount: 1,
  acceptedAt: new Date("2026-08-24T12:00:00.000Z"),
} satisfies Omit<ConversationUpdateHistoryRecord, "id" | "reason" | "status">;

const allOutcomeRecords = [
  { ...baseRecord, id: "preparing", status: "preparing", reason: undefined },
  {
    ...baseRecord,
    id: "sending",
    status: "sending",
    reason: undefined,
    audienceEstimate: 1234,
    ownerCopyCount: 2,
    conversations: [
      ...baseRecord.conversations,
      {
        title: "Conversation Two",
        href: "/conversation/conversation-two",
      },
    ],
  },
  { ...baseRecord, id: "queued", status: "queued", reason: undefined },
  {
    ...baseRecord,
    id: "stopping",
    status: "stopping",
    reason: "emergency_global_kill_switch",
  },
  { ...baseRecord, id: "completed", status: "completed", reason: undefined },
  {
    ...baseRecord,
    id: "completed-failures",
    status: "completed_with_failures",
    reason: undefined,
  },
  {
    ...baseRecord,
    id: "owner-copy",
    status: "failed",
    reason: "required_owner_copy_not_accepted",
  },
  {
    ...baseRecord,
    id: "audience",
    status: "failed",
    reason: "audience_materialization_failed",
  },
  {
    ...baseRecord,
    id: "no-participants",
    status: "failed",
    reason: "no_eligible_participants",
  },
  {
    ...baseRecord,
    id: "configuration",
    status: "failed",
    reason: "provider_configuration_error",
  },
  {
    ...baseRecord,
    id: "all-attempts",
    status: "failed",
    reason: "all_participant_attempts_failed",
  },
  {
    ...baseRecord,
    id: "stopped",
    status: "stopped",
    reason: "emergency_legal_or_abuse_block",
  },
] satisfies readonly ConversationUpdateHistoryRecord[];

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
  api.getHistoryPreview.mockReset();
});

describe("ConversationUpdateHistoryList", () => {
  it("fetches only expanded previews and displays backend HTML unchanged", async () => {
    const preview = {
      subject: "Server subject",
      html: "<html><body>Server preview</body></html>",
      text: "Server plaintext",
    };
    api.getHistoryPreview.mockResolvedValue({
      success: true,
      preview,
      reconstructed: true,
    });
    const { container, setLocale } = mountHistory({
      locale: "en",
      records: allOutcomeRecords,
    });
    expect(api.getHistoryPreview).not.toHaveBeenCalled();
    expect(container.querySelector("iframe, pre")).toBeNull();

    const toggle = container.querySelector("button");
    expect(toggle).not.toBeNull();
    toggle?.click();
    await nextTick();
    await nextTick();
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(api.getHistoryPreview).toHaveBeenCalledWith({
      updateId: "preparing",
      language: "en",
    });
    expect(container.querySelector("iframe")?.srcdoc).toBe(preview.html);
    expect(container.textContent).toContain("Reconstructed preview");
    expect(container.querySelector(".email-preview")).toBeNull();
    expect(container.textContent).not.toContain("Currently");

    toggle?.click();
    await nextTick();
    expect(container.querySelector("iframe, pre")).toBeNull();
    setLocale("fr");
    await nextTick();
    expect(api.getHistoryPreview).toHaveBeenCalledTimes(1);
    toggle?.click();
    await nextTick();
    await nextTick();
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(api.getHistoryPreview).toHaveBeenCalledTimes(2);
  });

  it("shows loading and retry states without mounting an iframe", async () => {
    const pending = Promise.withResolvers<{
      success: false;
      reason: "update_not_found";
    }>();
    api.getHistoryPreview.mockReturnValueOnce(pending.promise);
    const { container } = mountHistory({
      locale: "en",
      records: [allOutcomeRecords[0]],
    });
    container.querySelector("button")?.click();
    await nextTick();
    expect(container.textContent).toContain("Loading preview");
    expect(container.querySelector("iframe")).toBeNull();
    pending.resolve({ success: false, reason: "update_not_found" });
    await nextTick();
    await nextTick();
    expect(container.textContent).toContain(
      "The email preview could not be loaded."
    );
    api.getHistoryPreview.mockResolvedValue({
      success: true,
      preview: { subject: "Retry", html: "server retry", text: "Retry" },
      reconstructed: false,
    });
    [...container.querySelectorAll("button")]
      .find(
        (button) =>
          button.textContent === "The email preview could not be loaded."
      )
      ?.click();
    await nextTick();
    await nextTick();
    expect(container.querySelector("iframe")?.srcdoc).toBe("server retry");
    expect(container.textContent).not.toContain("Reconstructed preview");
  });
  it("localizes every status, terminal outcome, and dynamic count branch", () => {
    const { container } = mountHistory({
      locale: "en",
      records: allOutcomeRecords,
    });
    const text = container.textContent ?? "";

    for (const status of [
      "Preparing",
      "Sending",
      "Queued",
      "Stopping",
      "Completed",
      "Completed with failures",
      "Failed",
      "Stopped",
    ]) {
      expect(text).toContain(status);
    }
    expect(text).toContain("1 eligible recipient at send review");
    expect(text).toContain("1,234 eligible recipients at send review");
    expect(text).toContain("1 conversation");
    expect(text).toContain("2 conversations");
    expect(text).toContain("1 owner copy");
    expect(text).toContain("2 owner copies");
    expect(text).toContain("one or more recipient attempts failed");
    expect(text).toContain("emergency global sending stop");
    expect(text).toContain("emergency legal or abuse-safety block");
    expect(text).toContain("required conversation owner copy");
    expect(text).toContain("audience could not be prepared safely");
    expect(text).toContain("No participants remained eligible");
    expect(text).toContain("provider configuration was invalid");
    expect(text).toContain("every participant attempt failed");
  });

  it("localizes the empty state", () => {
    const { container } = mountHistory({ locale: "en", records: [] });

    expect(container.textContent).toContain("No Email Updates sent yet");
    expect(container.textContent).toContain(
      "Accepted updates will appear here with their delivery status."
    );
  });

  it("uses localized digits and reason copy in an RTL locale", () => {
    const records = [
      {
        ...baseRecord,
        id: "arabic-failure",
        status: "failed",
        reason: "provider_configuration_error",
        audienceEstimate: 1234,
        ownerCopyCount: 2,
      },
    ] satisfies readonly ConversationUpdateHistoryRecord[];
    const { container } = mountHistory({ locale: "ar", records });
    const text = container.textContent ?? "";

    expect(container.dir).toBe("rtl");
    expect(text).toContain("سجل التسليم");
    expect(text).toContain(new Intl.NumberFormat("ar").format(1234));
    expect(text).toContain("إعداد مزوّد البريد الإلكتروني غير صالح");
    expect(text).not.toContain("Delivery history");
    expect(text).not.toContain("eligible recipients");
  });

  it("reformats accepted timestamps when the display locale changes", async () => {
    const { container, setLocale } = mountHistory({
      locale: "en",
      records: [allOutcomeRecords[0]],
    });
    const acceptedAt = allOutcomeRecords[0].acceptedAt;
    const englishLabel = formatDate({ value: acceptedAt, locale: "en" });
    const frenchLabel = formatDate({ value: acceptedAt, locale: "fr" });

    expect(container.textContent).toContain(englishLabel);
    setLocale("fr");
    await nextTick();

    expect(container.textContent).toContain(frenchLabel);
    expect(container.textContent).not.toContain(englishLabel);
  });
});

function mountHistory({
  locale,
  records,
}: {
  locale: SupportedDisplayLanguageCodes;
  records: readonly ConversationUpdateHistoryRecord[];
}) {
  const container = document.createElement("div");
  container.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.append(container);
  const app = createApp(ConversationUpdateHistoryList, {
    records,
    language: locale,
  });
  const i18n = createI18n({ legacy: false, locale, messages: {} });
  app.use(i18n);
  for (const name of [
    "QCard",
    "QCardSection",
    "QList",
    "QItem",
    "QItemSection",
    "QItemLabel",
  ]) {
    app.component(name, slotComponent("div"));
  }
  app.component(
    "QSeparator",
    defineComponent(() => () => h("hr"))
  );
  app.component(
    "QIcon",
    defineComponent(() => () => null)
  );
  app.component(
    "QExpansionItem",
    defineComponent({
      props: {
        label: { type: String, required: true },
        modelValue: { type: Boolean, default: false },
      },
      emits: ["update:modelValue"],
      setup(props, { slots, emit }) {
        // Keep invoking the slot while hidden, like Quasar after first expansion.
        // The caller's v-if, not this stub, must prevent preview work.
        return () =>
          h("section", [
            h(
              "button",
              {
                "aria-expanded": props.modelValue,
                onClick: () => emit("update:modelValue", !props.modelValue),
              },
              props.label
            ),
            h("div", { hidden: !props.modelValue }, slots.default?.()),
          ]);
      },
    })
  );
  mountedApps.push(app);
  app.mount(container);
  return {
    container,
    setLocale: (languageCode: SupportedDisplayLanguageCodes): void => {
      i18n.global.locale.value = languageCode;
    },
  };
}

function formatDate({
  value,
  locale,
}: {
  value: Date;
  locale: SupportedDisplayLanguageCodes;
}): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function slotComponent(tag: string) {
  return defineComponent(
    (_props, { slots }) =>
      () =>
        h(tag, slots.default?.())
  );
}
