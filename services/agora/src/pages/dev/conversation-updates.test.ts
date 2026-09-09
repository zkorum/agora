import { readFileSync } from "node:fs";

import { Dto } from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  createApp,
  defineComponent,
  h,
  nextTick,
  reactive,
} from "vue";

import ConversationUpdates from "./conversation-updates.vue";

const api = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  getDevComparison: vi.fn(),
  getDevPreview: vi.fn(),
  prepareDraft: vi.fn(),
  sendTest: vi.fn(),
  send: vi.fn(),
  cancelDraft: vi.fn(),
}));
const auth = reactive<{ isLoggedIn: boolean; userId: string | undefined }>({
  isLoggedIn: true,
  userId: "author",
});
vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => auth,
}));
vi.mock("src/composables/layout/usePageLayout", () => ({
  usePageLayout: () => ({ isActive: false }),
}));
vi.mock("src/components/navigation/header/variants", () => ({
  StandardMenuBar: defineComponent(() => () => null),
}));
vi.mock("src/components/ui-library/SpaLink.vue", () => ({
  default: defineComponent({
    setup(_, { slots }) {
      return () => h("a", slots.default?.());
    },
  }),
}));
vi.mock("./test-components/ConversationUpdateComposerPlayground.vue", () => ({
  default: defineComponent(
    () => () => h("div", "Production composer playground")
  ),
}));
vi.mock("primevue/button", () => ({
  default: defineComponent({
    props: {
      label: { type: String, required: true },
      loading: Boolean,
      disabled: Boolean,
    },
    emits: ["click"],
    setup(props, { emit }) {
      return () =>
        h(
          "button",
          {
            disabled: props.disabled,
            "data-loading": props.loading,
            onClick: () => emit("click"),
          },
          props.label
        );
    },
  }),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent({
    props: {
      title: { type: String, required: true },
      retryLabel: { type: String, required: true },
    },
    emits: ["retry"],
    setup(props, { emit }) {
      return () =>
        h("div", { "data-error-retry": "" }, [
          h("p", props.title),
          h("button", { onClick: () => emit("retry") }, props.retryLabel),
        ]);
    },
  }),
}));
vi.mock(
  "src/components/conversationUpdates/ConversationUpdateScopeFields.vue",
  () => ({
    default: defineComponent({
      props: { disabled: Boolean, scopes: { type: Array, required: true } },
      emits: ["update:selectedScopeId", "update:selectedConversationIds"],
      setup(props, { emit }) {
        return () =>
          h("div", [
            h("span", JSON.stringify(props.scopes)),
            h(
              "button",
              {
                disabled: props.disabled,
                onClick: () => {
                  emit("update:selectedScopeId", "project-one");
                  emit("update:selectedConversationIds", [
                    "conv000001",
                    "conv000002",
                  ]);
                },
              },
              "Select project conversations"
            ),
            h(
              "button",
              {
                disabled: props.disabled,
                onClick: () =>
                  emit("update:selectedConversationIds", ["conv000001"]),
              },
              "Select first conversation only"
            ),
          ]);
      },
    }),
  })
);
vi.mock("src/components/editor/Editor.vue", () => ({
  default: defineComponent({
    props: { disabled: Boolean },
    emits: ["update:modelValue", "update:plainText"],
    setup(props, { emit }) {
      return () =>
        h(
          "button",
          {
            disabled: props.disabled,
            onClick: () => {
              emit(
                "update:modelValue",
                "<p>Our actual <strong>draft</strong></p>"
              );
              emit("update:plainText", "Our actual draft");
            },
          },
          "Write message"
        );
    },
  }),
}));

const field = defineComponent({
  props: {
    modelValue: { type: [String, Array], required: true },
    label: { type: String, required: true },
    disable: Boolean,
    multiple: Boolean,
    options: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("input", {
        "aria-label": props.label,
        "data-options": JSON.stringify(props.options),
        value:
          typeof props.modelValue === "string"
            ? props.modelValue
            : props.modelValue?.join(","),
        disabled: props.disable,
        onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement) {
            emit(
              "update:modelValue",
              props.multiple
                ? event.target.value.split(",").filter(Boolean)
                : event.target.value
            );
          }
        },
      });
  },
});
const toggle = defineComponent({
  props: {
    modelValue: Boolean,
    label: { type: String, required: true },
    disable: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "button",
        {
          disabled: props.disable,
          onClick: () => emit("update:modelValue", !props.modelValue),
        },
        props.label
      );
  },
});
const comparison = Dto.conversationEmailUpdateDevComparisonResponse.parse({
  success: true,
  metadata: {
    senderName: "Actual Project via Agora",
    replyToName: "Actual Project team",
    replyToEmail: "actual-contact@example.org",
    branding: { name: "Actual Project", palette: "green" },
    language: "ar",
    unsubscribeScope: "project",
    sendingEnabled: false,
  },
  previews: {
    ownerCopy: {
      subject: "Admin subject",
      html: "<p>Server admin</p>",
      text: "Admin text",
    },
    participant: {
      subject: "Participant subject",
      html: "<p>Server participant</p>",
      text: "Participant text",
    },
    test: {
      subject: "Test subject",
      html: "<p>Server test</p>",
      text: "Test text",
    },
  },
});
let app: App | undefined;
beforeEach(() => {
  auth.isLoggedIn = true;
  auth.userId = "author";
  api.getWorkspace.mockResolvedValue(
    Dto.conversationEmailUpdateWorkspaceResponse.parse({
      success: true,
      resolvedContext: { kind: "global" },
      scopes: [
        {
          kind: "project",
          projectSlug: "project-one",
          title: "Actual Project",
          unsubscribeScope: "project",
          participantContactEmail: "actual-contact@example.org",
          conversations: [1, 2, 3].map((index) => ({
            conversationSlugId: `conv00000${index}`,
            title: `Conversation ${index}`,
            participationMode: "account_required",
            estimatedEligibleRecipientCount: 10,
            sendingEnabled: false,
          })),
        },
      ],
    })
  );
  api.getDevComparison.mockResolvedValue(comparison);
  api.getDevPreview.mockResolvedValue({
    success: true,
    reconstructed: false,
    preview: {
      subject: "Example subject",
      html: "<p>Fixture</p>",
      text: "Fixture text",
    },
  });
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.replaceChildren();
  vi.resetAllMocks();
});
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}
function mountPage(): void {
  const container = document.createElement("div");
  document.body.append(container);
  app = createApp(ConversationUpdates);
  app.component("QSelect", field);
  app.component("QInput", field);
  app.component("QToggle", toggle);
  app.mount(container);
}
function button(label: string): HTMLButtonElement {
  const result = [...document.querySelectorAll("button")].find(
    (node) => node.textContent === label
  );
  if (!result) throw new Error(`Button not found: ${label}`);
  return result;
}
async function click(label: string): Promise<void> {
  button(label).click();
  await flush();
}
async function fill({
  label,
  value,
}: {
  label: string;
  value: string;
}): Promise<void> {
  const input = document.querySelector(`input[aria-label="${label}"]`);
  if (!(input instanceof HTMLInputElement))
    throw new Error(`Input not found: ${label}`);
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await flush();
}
async function authorDraft(): Promise<void> {
  await click("Load authorized workspace");
  await click("Select project conversations");
  await fill({ label: "Subject", value: "Actual subject" });
  await click("Write message");
}
function expectNoMutations(): void {
  for (const mutation of [
    api.prepareDraft,
    api.sendTest,
    api.send,
    api.cancelDraft,
  ]) {
    expect(mutation).not.toHaveBeenCalled();
  }
}

describe("dev Email Updates comparison", () => {
  it("opens the compose playground and lets you switch to comparison without loading the API", async () => {
    mountPage();
    expect(button("Compose component").getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(document.body.textContent).toContain(
      "Production composer playground"
    );
    await click("Email comparison");
    expect(button("Email comparison").getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(api.getWorkspace).not.toHaveBeenCalled();
    expectNoMutations();
  });
  it("explicitly loads real scopes and forwards actual selection, draft, subset, and language without mutations", async () => {
    mountPage();
    expect(document.body.textContent).toContain("Real workspace data");
    expect(api.getWorkspace).not.toHaveBeenCalled();
    expect(button("Render comparison").disabled).toBe(true);
    await authorDraft();
    expect(api.getWorkspace).toHaveBeenCalledExactlyOnceWith({
      context: { kind: "global" },
    });
    await fill({ label: "Email language", value: "fr" });
    await click("Simulate a participant conversation subset");
    expect(button("Render comparison").disabled).toBe(true);
    const subsetLabel = "Illustrative participant conversations (at least one)";
    const options = document
      .querySelector(`input[aria-label="${subsetLabel}"]`)
      ?.getAttribute("data-options");
    expect(options).toContain("conv000001");
    expect(options).toContain("conv000002");
    expect(options).not.toContain("conv000003");
    await fill({ label: subsetLabel, value: "conv000002" });
    await click("Render comparison");
    expect(api.getDevComparison).toHaveBeenCalledExactlyOnceWith({
      selection: {
        kind: "project",
        projectSlug: "project-one",
        conversationSlugIds: ["conv000001", "conv000002"],
      },
      subject: "Actual subject",
      bodyHtml: "<p>Our actual <strong>draft</strong></p>",
      language: "fr",
      participantConversationSlugIds: ["conv000002"],
    });
    expect(api.getDevPreview).not.toHaveBeenCalled();
    expectNoMutations();
    const frames = document.querySelectorAll("iframe");
    expect(frames).toHaveLength(2);
    expect(frames[0]?.title).toBe("Admin / owner email preview");
    expect(frames[0]?.srcdoc).toBe("<p>Server admin</p>");
    expect(frames[1]?.title).toBe("Participant email preview");
    expect(frames[1]?.srcdoc).toBe("<p>Server participant</p>");
    expect(document.body.textContent).toContain("Actual Project via Agora");
    expect(document.body.textContent).toContain("actual-contact@example.org");
    expect(document.body.textContent).toContain("Actual Project (green)");
    expect(document.body.textContent).toContain("No (read-only preview)");
    expect(document.body.textContent).toContain("Rendered language: ar");
    expect(document.querySelector("pre")?.lang).toBe("ar");
    await fill({ label: "Email language", value: "ja" });
    expect(document.body.textContent).toContain(
      "Previous preview; render to update"
    );
    expect(document.body.textContent).toContain("Rendered language: ar");
    expect(api.getDevComparison).toHaveBeenCalledTimes(1);
    await fill({ label: "Subject", value: "" });
    expect(button("Render comparison").disabled).toBe(true);
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    expect(document.body.textContent).toContain(
      "Previous preview; render to update"
    );
    const disclosure = document.querySelector(".email-dev__results > details");
    if (!(disclosure instanceof HTMLDetailsElement))
      throw new Error("Missing test disclosure");
    disclosure.open = true;
    disclosure.dispatchEvent(new Event("toggle"));
    await flush();
    expect(document.querySelectorAll("iframe")).toHaveLength(3);
    expect(
      document
        .querySelector('iframe[title="Test email preview"]')
        ?.getAttribute("srcdoc")
    ).toBe("<p>Server test</p>");
    expectNoMutations();
  });

  it("keeps the previous pair while rendering and clears loading on every terminal domain error", async () => {
    mountPage();
    await authorDraft();
    await click("Render comparison");
    let complete: ((value: typeof comparison) => void) | undefined;
    api.getDevComparison.mockImplementationOnce(
      () =>
        new Promise<typeof comparison>((resolve) => {
          complete = resolve;
        })
    );
    button("Render comparison").click();
    await flush();
    expect(button("Render comparison").dataset.loading).toBe("true");
    expect(button("Render comparison").disabled).toBe(true);
    expect(button("Write message").disabled).toBe(true);
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    complete?.(comparison);
    await flush();
    const failures = [
      ["scope_not_found", "no longer authorized"],
      ["conversation_not_in_scope", "no longer in this scope"],
      ["content_invalid", "subject or message is invalid"],
      ["missing_participant_contact_email", "no participant contact email"],
      [
        "configuration_disabled",
        "disabled or blocked for one or more selected conversations",
      ],
    ];
    for (const [reason, message] of failures) {
      api.getDevComparison.mockResolvedValueOnce(
        Dto.conversationEmailUpdateDevComparisonResponse.parse({
          success: false,
          reason,
        })
      );
      await click("Render comparison");
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        message
      );
      expect(button("Render comparison").dataset.loading).toBe("false");
      expect(button("Render comparison").disabled).toBe(false);
      expect(document.querySelectorAll("iframe")).toHaveLength(2);
      expect(document.body.textContent).toContain(
        "Previous preview; render to update"
      );
    }
    api.getDevComparison.mockRejectedValueOnce(new Error("Network"));
    await click("Render comparison");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Check your sign-in, authorization"
    );
    expect(button("Render comparison").dataset.loading).toBe("false");
  });

  it("rejects empty, foreign, or duplicate simulated subsets and prunes them when selection changes", async () => {
    mountPage();
    await authorDraft();
    await click("Simulate a participant conversation subset");
    const label = "Illustrative participant conversations (at least one)";
    for (const value of ["", "conv000003", "conv000001,conv000001"]) {
      await fill({ label, value });
      expect(button("Render comparison").disabled).toBe(true);
    }
    await fill({ label, value: "conv000002" });
    expect(button("Render comparison").disabled).toBe(false);
    await click("Select first conversation only");
    expect(button("Render comparison").disabled).toBe(true);
    expect(api.getDevComparison).not.toHaveBeenCalled();
  });

  it("offers authorization guidance and lets signed-out users explicitly render paired examples", async () => {
    auth.isLoggedIn = false;
    auth.userId = undefined;
    mountPage();
    await click("Load authorized workspace");
    expect(document.querySelector("[data-error-retry]")?.textContent).toContain(
      "Sign in"
    );
    expect(api.getWorkspace).not.toHaveBeenCalled();
    await fill({ label: "Preview source", value: "examples" });
    expect(document.body.textContent).toContain("Examples only");
    expect(document.body.textContent).toContain("not your workspace");
    await fill({ label: "Example branding", value: "organization" });
    await fill({ label: "Email language", value: "ja" });
    await click("Render comparison");
    expect(api.getDevPreview).toHaveBeenCalledTimes(2);
    expect(api.getDevPreview).toHaveBeenCalledWith({
      fixture: "organization",
      organizationLogo: false,
      language: "ja",
      variant: "owner_copy",
    });
    expect(api.getDevPreview).toHaveBeenCalledWith({
      fixture: "organization",
      organizationLogo: false,
      language: "ja",
      variant: "participant",
    });
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    expect(document.body.textContent).toContain(
      "Example comparison (fictional)"
    );
    expect(api.getDevComparison).not.toHaveBeenCalled();
    expectNoMutations();
  });

  it("discards stale comparison and workspace responses after source or account changes", async () => {
    mountPage();
    await authorDraft();
    let complete: ((value: typeof comparison) => void) | undefined;
    api.getDevComparison.mockImplementationOnce(
      () =>
        new Promise<typeof comparison>((resolve) => {
          complete = resolve;
        })
    );
    button("Render comparison").click();
    await flush();
    await fill({ label: "Preview source", value: "examples" });
    await click("Render comparison");
    complete?.(comparison);
    await flush();
    expect(document.body.textContent).toContain(
      "Example comparison (fictional)"
    );
    expect(document.body.textContent).not.toContain("Real-data comparison");
    await fill({ label: "Preview source", value: "real" });
    let finishWorkspace: ((value: unknown) => void) | undefined;
    api.getWorkspace.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishWorkspace = resolve;
        })
    );
    button("Load authorized workspace").click();
    await flush();
    auth.userId = "another-author";
    finishWorkspace?.({ success: true, scopes: [] });
    await flush();
    expect(document.body.textContent).not.toContain(
      "No authorized Email Updates scopes"
    );
    expect(button("Render comparison").disabled).toBe(true);
  });

  it("starts both fixture calls together and never displays a partial pair", async () => {
    mountPage();
    await fill({ label: "Preview source", value: "examples" });
    let complete: ((value: unknown) => void) | undefined;
    api.getDevPreview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    button("Render comparison").click();
    await flush();
    expect(api.getDevPreview).toHaveBeenCalledTimes(2);
    expect(button("Render comparison").dataset.loading).toBe("true");
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    complete?.({ success: false, reason: "update_not_found" });
    await flush();
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "example fixture was not found"
    );
    expect(button("Render comparison").dataset.loading).toBe("false");
    await click("Render comparison");
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    api.getDevPreview.mockRejectedValueOnce(new Error("unavailable"));
    await click("Render comparison");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "fixture endpoint is enabled"
    );
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    expectNoMutations();
  });

  it("shows useful workspace failures with a manual retry and no automatic mutations", async () => {
    mountPage();
    api.getWorkspace.mockRejectedValueOnce(new Error("403"));
    await click("Load authorized workspace");
    expect(document.querySelector("[data-error-retry]")?.textContent).toContain(
      "management permissions"
    );
    expect(button("Load authorized workspace").dataset.loading).toBe("false");
    await click("Retry workspace load");
    expect(api.getWorkspace).toHaveBeenCalledTimes(2);
    expectNoMutations();
  });

  it("uses shrinkable mobile columns and caps narrow preview width", () => {
    const page = readFileSync("src/pages/dev/conversation-updates.vue", "utf8");
    expect(page).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(page).toContain("minmax(min(100%, 12rem), 1fr)");
    expect(page).toContain("width: min(320px, 100%)");
    expect(page).toContain("@media (min-width: 800px)");
    expect(page).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(page).not.toContain("!important");
  });
});
