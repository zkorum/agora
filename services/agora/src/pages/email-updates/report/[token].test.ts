import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  ConversationEmailUpdateActionReportResponse,
  ConversationEmailUpdateActionResolveResponse,
  ConversationEmailUpdateActionUnsubscribeResponse,
} from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick } from "vue";
import { createI18n } from "vue-i18n";

import { emailUpdateReportTranslations } from "./[token].i18n";
import ReportPage from "./[token].vue";

const REPORT_TOKEN = "0123456789abcdef0123456789abcdef01234567890";
const UNSUBSCRIBE_TOKEN = "abcdef0123456789abcdef0123456789abcdef01234";
const api = vi.hoisted(() => ({
  resolve: vi.fn<() => Promise<ConversationEmailUpdateActionResolveResponse>>(),
  report: vi.fn<() => Promise<ConversationEmailUpdateActionReportResponse>>(),
  unsubscribe:
    vi.fn<() => Promise<ConversationEmailUpdateActionUnsubscribeResponse>>(),
}));

vi.mock(
  "src/utils/api/conversationUpdates/publicConversationEmailUpdateActions",
  () => ({
    usePublicConversationEmailUpdateActionsApi: () => api,
  })
);
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { token: REPORT_TOKEN } }),
}));
vi.mock("src/composables/layout/usePageLayout", () => ({
  usePageLayout: () => ({ isActive: false }),
}));
vi.mock("src/components/navigation/header/variants", () => ({
  StandardMenuBar: defineComponent(() => () => h("header")),
}));
vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("span", "Loading")),
}));
vi.mock("src/components/ui-library/SpaLink.vue", () => ({
  default: defineComponent(
    (props: { to: string }, { slots }) =>
      () =>
        h("a", { href: props.to }, slots.default?.()),
    { props: { to: { type: String, required: true } } }
  ),
}));
vi.mock("src/components/ui-library/ZKButton.vue", () => ({
  default: defineComponent(
    (props: { disable: boolean }, { slots }) =>
      () =>
        h("button", { disabled: props.disable }, slots.default?.()),
    { props: { disable: Boolean } }
  ),
}));

const conversation = {
  conversationSlugId: "conv0001",
  title: "Frozen conversation",
};
const participantSuccess = {
  success: true,
  availableAction: {
    action: "unsubscribe",
    token: UNSUBSCRIBE_TOKEN,
    scope: {
      kind: "project",
      projectSlug: "frozen-project",
      title: "Frozen project",
      conversations: [conversation],
    },
  },
} satisfies ConversationEmailUpdateActionReportResponse;

let app: App | undefined;
beforeEach(() => {
  api.resolve.mockResolvedValue({
    success: true,
    action: "report",
    subject: "Frozen subject",
    scope: participantSuccess.availableAction.scope,
  });
  api.report.mockResolvedValue(participantSuccess);
  api.unsubscribe.mockResolvedValue({ success: true });
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.replaceChildren();
  vi.resetAllMocks();
});

async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
}

async function mountPage(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.append(container);
  app = createApp(ReportPage);
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  app.component(
    "QRadio",
    defineComponent(
      (props: { val: string; label: string }, { emit }) =>
        () =>
          h(
            "button",
            {
              type: "button",
              onClick: () => emit("update:modelValue", props.val),
            },
            props.label
          ),
      {
        props: {
          val: { type: String, required: true },
          label: { type: String, required: true },
        },
        emits: ["update:modelValue"],
      }
    )
  );
  app.component(
    "QInput",
    defineComponent(() => () => h("textarea"))
  );
  app.mount(container);
  await flush();
  return container;
}

function button({
  container,
  text,
}: {
  container: HTMLElement;
  text: string;
}): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === text
  );
  if (match === undefined) throw new Error(`Missing button: ${text}`);
  return match;
}

async function submitReport(container: HTMLElement): Promise<void> {
  button({ container, text: "Spam" }).click();
  await flush();
  const form = container.querySelector("form");
  if (form === null) throw new Error("Missing report form");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flush();
}

describe("Email Update report page", () => {
  it("offers a separate scoped unsubscribe only after successful reporting and explicit confirmation", async () => {
    const container = await mountPage();
    expect(api.resolve).toHaveBeenCalledWith({ token: REPORT_TOKEN });
    expect(api.report).not.toHaveBeenCalled();
    expect(api.unsubscribe).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Unsubscribe");
    await submitReport(container);
    expect(api.report).toHaveBeenCalledWith({
      token: REPORT_TOKEN,
      reason: "spam",
    });
    expect(container.textContent).toContain(
      "Thanks, your report has been recorded."
    );
    expect(container.textContent).toContain(
      "Stop receiving updates from the project “Frozen project”?"
    );
    expect(api.unsubscribe).not.toHaveBeenCalled();
    button({ container, text: "Unsubscribe" }).click();
    await flush();
    expect(api.unsubscribe).toHaveBeenCalledExactlyOnceWith({
      token: UNSUBSCRIBE_TOKEN,
    });
    expect(container.textContent).toContain(
      "You have been unsubscribed from these updates."
    );
    expect(container.textContent).toContain(
      "Thanks, your report has been recorded."
    );
    expect(container.textContent).not.toContain("No thanks");
  });

  it("dismisses No thanks without changing preferences", async () => {
    const container = await mountPage();
    await submitReport(container);
    button({ container, text: "No thanks" }).click();
    await flush();
    expect(api.unsubscribe).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Thanks, your report has been recorded."
    );
    expect(container.textContent).not.toContain("Stop receiving");
  });

  it("waits for report success before offering opt-out and disables duplicate confirmation", async () => {
    const report =
      Promise.withResolvers<ConversationEmailUpdateActionReportResponse>();
    const unsubscribe =
      Promise.withResolvers<ConversationEmailUpdateActionUnsubscribeResponse>();
    api.report.mockReturnValueOnce(report.promise);
    api.unsubscribe.mockReturnValueOnce(unsubscribe.promise);
    const container = await mountPage();
    await submitReport(container);
    expect(container.textContent).toContain("Submitting");
    expect(container.textContent).not.toContain("Unsubscribe");
    expect(api.unsubscribe).not.toHaveBeenCalled();
    report.resolve(participantSuccess);
    await flush();
    button({ container, text: "Unsubscribe" }).click();
    await flush();
    expect(button({ container, text: "Unsubscribe" }).disabled).toBe(true);
    expect(button({ container, text: "No thanks" }).disabled).toBe(true);
    button({ container, text: "Unsubscribe" }).click();
    expect(api.unsubscribe).toHaveBeenCalledTimes(1);
    unsubscribe.resolve({ success: true });
    await flush();
    expect(container.textContent).toContain("You have been unsubscribed");
  });

  it("does not offer unsubscribe or preferences for an owner-copy report", async () => {
    api.report.mockResolvedValue({ success: true });
    const container = await mountPage();
    await submitReport(container);
    expect(container.textContent).toContain(
      "Thanks, your report has been recorded."
    );
    expect(container.textContent).not.toMatch(
      /Unsubscribe|No thanks|preferences|Stop receiving/
    );
    expect(api.unsubscribe).not.toHaveBeenCalled();
  });

  it.each([1, 2])(
    "lists all %i authorized conversations in a conversation-scoped offer",
    async (count) => {
      const conversations = [
        conversation,
        { conversationSlugId: "conv0002", title: "Second conversation" },
      ].slice(0, count);
      api.report.mockResolvedValue({
        success: true,
        availableAction: {
          action: "unsubscribe",
          token: UNSUBSCRIBE_TOKEN,
          scope: { kind: "no_project", conversations },
        },
      });
      const container = await mountPage();
      await submitReport(container);
      expect(container.textContent).toContain(
        count === 1
          ? "Stop receiving updates from this conversation?"
          : "Stop receiving updates from these conversations?"
      );
      expect(
        [...container.querySelectorAll("li")].map((item) =>
          item.textContent?.trim()
        )
      ).toEqual(conversations.map((item) => item.title));
      expect(api.unsubscribe).not.toHaveBeenCalled();
    }
  );

  it("retains the report success and allows retry after unsubscribe fails", async () => {
    api.unsubscribe.mockRejectedValueOnce(new Error("Network failure"));
    const container = await mountPage();
    await submitReport(container);
    button({ container, text: "Unsubscribe" }).click();
    await flush();
    expect(container.textContent).toContain(
      "Thanks, your report has been recorded."
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "We could not unsubscribe you."
    );
    button({ container, text: "Unsubscribe" }).click();
    await flush();
    expect(api.unsubscribe).toHaveBeenCalledTimes(2);
    expect(api.report).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("You have been unsubscribed");
  });

  it("preserves report success when the offered capability has expired", async () => {
    api.unsubscribe.mockResolvedValue({
      success: false,
      reason: "unavailable",
    });
    const container = await mountPage();
    await submitReport(container);
    button({ container, text: "Unsubscribe" }).click();
    await flush();
    expect(container.textContent).toContain(
      "Thanks, your report has been recorded."
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "use the unsubscribe link in the email"
    );
    expect(container.textContent).not.toContain("You have been unsubscribed");
  });

  it("does not offer unsubscribe after a failed report", async () => {
    api.report.mockRejectedValueOnce(new Error("Network failure"));
    const container = await mountPage();
    await submitReport(container);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "We could not submit your report."
    );
    expect(container.textContent).not.toContain("Unsubscribe");
    expect(api.unsubscribe).not.toHaveBeenCalled();
    await submitReport(container);
    expect(container.textContent).toContain("No thanks");
  });

  it("rejects unavailable report links without showing the form or unsubscribe", async () => {
    api.resolve.mockResolvedValue({ success: false, reason: "unavailable" });
    const container = await mountPage();
    expect(container.textContent).toContain("This link is unavailable");
    expect(container.querySelector("form")).toBeNull();
    expect(api.report).not.toHaveBeenCalled();
    expect(api.unsubscribe).not.toHaveBeenCalled();
  });
});

describe("Email Update report translations", () => {
  it("provides complete localized reporting and opt-out copy in all 11 languages", () => {
    expect(Object.keys(emailUpdateReportTranslations).sort()).toEqual(
      [...ZodSupportedDisplayLanguageCodes.options].sort()
    );
    for (const [language, translations] of Object.entries(
      emailUpdateReportTranslations
    )) {
      expect(Object.keys(translations).sort()).toEqual(
        Object.keys(emailUpdateReportTranslations.en).sort()
      );
      for (const value of Object.values(translations))
        expect(value.trim()).not.toBe("");
      expect(translations.unsubscribeProject).toContain("{title}");
      if (language !== "en") {
        expect(translations.successDescription).not.toBe(
          emailUpdateReportTranslations.en.successDescription
        );
        expect(translations.unsubscribe).not.toBe(
          emailUpdateReportTranslations.en.unsubscribe
        );
      }
    }
    expect(emailUpdateReportTranslations.en.successDescription).toBe(
      "Thanks, your report has been recorded."
    );
  });
});
