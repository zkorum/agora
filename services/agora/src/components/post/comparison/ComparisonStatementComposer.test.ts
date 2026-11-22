import type { Dto } from "src/shared/types/dto";
import type { ParticipantStatements } from "src/shared/types/zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import type { z } from "zod";

const mocks = vi.hoisted(() => ({
  create:
    vi.fn<
      (
        request: z.infer<typeof Dto.createComparisonStatementRequest>
      ) => Promise<z.infer<typeof Dto.createComparisonStatementResponse>>
    >(),
  invalidate: vi.fn(() => Promise.resolve(undefined)),
  notify: vi.fn(),
  onboarding: vi.fn(),
  drafts: new Map<string, string>(),
  current: true,
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: (translations: { en: Record<string, string> }) => ({
    t: (key: string) => translations.en[key] ?? key,
  }),
}));
vi.mock("@tanstack/vue-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("src/utils/api/participation/useParticipationViewerLifetime", () => ({
  useParticipationViewerLifetime: () => ({
    capture: () => () => mocks.current,
  }),
}));
vi.mock("src/utils/api/comparison/comparison", () => ({
  useComparisonApi: () => ({ createStatement: mocks.create }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("src/stores/newOpinionDrafts", () => ({
  useNewOpinionDraftsStore: () => ({
    getOpinionDraft: (slug: string) => {
      const body = mocks.drafts.get(slug);
      return body === undefined ? undefined : { body };
    },
    saveOpinionDraft: (slug: string, body: string) =>
      mocks.drafts.set(slug, body),
    deleteOpinionDraft: (slug: string) => mocks.drafts.delete(slug),
  }),
}));
vi.mock("src/composables/conversation/useParticipationGate", () => ({
  useParticipationGate: () => ({
    participationStatus: ref({ status: "ready" }),
    openParticipationOnboarding: mocks.onboarding,
    captureParticipationAction: () => ({
      isCurrent: () => mocks.current,
      handleBlockedReason: mocks.onboarding,
    }),
  }),
}));
vi.mock("src/components/editor/Editor.vue", () => ({
  __esModule: true,
  default: defineComponent({
    props: { modelValue: { type: String, required: true }, disabled: Boolean },
    emits: ["update:modelValue", "update:plainText"],
    setup(props, { emit }) {
      return () =>
        h("textarea", {
          value: props.modelValue,
          disabled: props.disabled,
          onInput: (event: Event) => {
            if (!(event.target instanceof HTMLTextAreaElement)) return;
            emit("update:modelValue", event.target.value);
            emit("update:plainText", event.target.value);
          },
        });
    },
  }),
}));
import ComparisonStatementComposer from "./ComparisonStatementComposer.vue";
let app: App | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.drafts.clear();
  mocks.current = true;
});
afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});
function mountComposer(
  policy: ParticipantStatements = { supported: true, enabled: true }
) {
  const currentPolicy = ref(policy);
  const currentSlug = ref("conv1234");
  const host = document.createElement("div");
  document.body.append(host);
  app = createApp(
    defineComponent({
      setup: () => () =>
        h(ComparisonStatementComposer, {
          conversationSlugId: currentSlug.value,
          policy: currentPolicy.value,
          disabled: false,
        }),
    })
  );
  app.component(
    "QBtn",
    defineComponent({
      props: {
        label: { type: String, required: true },
        disable: Boolean,
        loading: Boolean,
      },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            {
              disabled: props.disable || props.loading,
              onClick: () => emit("click"),
            },
            props.label
          ),
    })
  );
  app.component(
    "QDialog",
    defineComponent({
      props: { modelValue: Boolean },
      setup:
        (props, { slots }) =>
        () =>
          props.modelValue ? h("div", slots.default?.()) : null,
    })
  );
  for (const name of ["q-card", "q-card-section", "q-card-actions"])
    app.component(
      name,
      defineComponent({
        setup:
          (_props, { slots }) =>
          () =>
            h("div", slots.default?.()),
      })
    );
  app.mount(host);
  return { host, currentPolicy, currentSlug };
}
function button({ host, label }: { host: HTMLElement; label: string }) {
  const target = Array.from(host.querySelectorAll("button")).find(
    (element) => element.textContent === label
  );
  if (target === undefined) throw new Error(`Missing button: ${label}`);
  return target;
}
async function writeStatement(host: HTMLElement) {
  button({ host, label: "Add a statement" }).click();
  await vi.waitUntil(() => host.querySelector("textarea") !== null);
  const editor = host.querySelector("textarea");
  if (!(editor instanceof HTMLTextAreaElement))
    throw new Error("Missing editor");
  editor.value = "Improve transit";
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  return editor;
}
describe("comparison statement composition", () => {
  it.each([
    { supported: false },
    { supported: true, enabled: false },
  ] satisfies ParticipantStatements[])(
    "does not expose creation for %j",
    (policy) => {
      const { host } = mountComposer(policy);
      expect(host.querySelector("button")).toBeNull();
    }
  );
  it("keeps text when disabled remotely and restores it when enabled", async () => {
    const { host, currentPolicy } = mountComposer();
    const editor = await writeStatement(host);
    currentPolicy.value = { supported: true, enabled: false };
    await nextTick();
    expect(editor.value).toBe("Improve transit");
    expect(editor.disabled).toBe(true);
    expect(button({ host, label: "Submit" }).disabled).toBe(true);
    expect(mocks.drafts.get("conv1234")).toBe("Improve transit");
    currentPolicy.value = { supported: true, enabled: true };
    await nextTick();
    expect(editor.disabled).toBe(false);
    expect(editor.value).toBe("Improve transit");
  });
  it("creates an item then refreshes comparison queries and clears only the accepted draft", async () => {
    mocks.create.mockResolvedValue({
      success: true,
      itemSlugId: "item1234",
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "guest-id",
        credentials: { email: null, phone: null, rarimo: null },
      },
    });
    const { host } = mountComposer();
    await writeStatement(host);
    button({ host, label: "Submit" }).click();
    await vi.waitUntil(() => mocks.invalidate.mock.calls.length === 3);
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
      conversationSlugId: "conv1234",
      statementBody: "Improve transit",
      isCurrent: expect.any(Function),
    });
    expect(mocks.drafts.has("conv1234")).toBe(false);
    expect(mocks.notify).toHaveBeenCalledWith("Statement added.");
  });
  it("preserves text and explains a server-side OFF rejection", async () => {
    mocks.create.mockResolvedValue({
      success: false,
      reason: "participant_statements_disabled",
    });
    const { host } = mountComposer();
    await writeStatement(host);
    button({ host, label: "Submit" }).click();
    await vi.waitUntil(
      () => host.textContent?.includes("Your draft has been kept.") === true
    );
    expect(mocks.drafts.get("conv1234")).toBe("Improve transit");
    expect(mocks.invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ["conversation", "conv1234"],
    });
  });
  it("does not clear drafts or install responses after the participation session changes", async () => {
    let resolve = (
      _response: z.infer<typeof Dto.createComparisonStatementResponse>
    ) => {};
    mocks.create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const { host } = mountComposer();
    await writeStatement(host);
    button({ host, label: "Submit" }).click();
    await vi.waitUntil(() => mocks.create.mock.calls.length === 1);
    mocks.current = false;
    resolve({
      success: true,
      itemSlugId: "item1234",
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "guest-id",
        credentials: { email: null, phone: null, rarimo: null },
      },
    });
    await nextTick();
    expect(mocks.drafts.get("conv1234")).toBe("Improve transit");
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("does not clear drafts or refresh auth after unmounting", async () => {
    const response =
      Promise.withResolvers<
        z.infer<typeof Dto.createComparisonStatementResponse>
      >();
    mocks.create.mockReturnValue(response.promise);
    const { host } = mountComposer();
    await writeStatement(host);
    button({ host, label: "Submit" }).click();
    await vi.waitUntil(() => mocks.create.mock.calls.length === 1);
    app?.unmount();
    app = undefined;
    response.resolve({
      success: true,
      itemSlugId: "item1234",
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "guest-id",
        credentials: { email: null, phone: null, rarimo: null },
      },
    });
    await nextTick();
    expect(mocks.drafts.get("conv1234")).toBe("Improve transit");
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("fences an old response after navigating away and back to the same conversation", async () => {
    const response =
      Promise.withResolvers<
        z.infer<typeof Dto.createComparisonStatementResponse>
      >();
    mocks.create.mockReturnValue(response.promise);
    const { host, currentSlug } = mountComposer();
    await writeStatement(host);
    button({ host, label: "Submit" }).click();
    await vi.waitUntil(() => mocks.create.mock.calls.length === 1);
    currentSlug.value = "other123";
    await nextTick();
    currentSlug.value = "conv1234";
    await nextTick();
    response.resolve({
      success: true,
      itemSlugId: "item1234",
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      loginStatus: {
        isKnown: true,
        isRegistered: false,
        isLoggedIn: false,
        userId: "guest-id",
        credentials: { email: null, phone: null, rarimo: null },
      },
    });
    await nextTick();
    expect(mocks.drafts.get("conv1234")).toBe("Improve transit");
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
