import type { QvAllocation } from "src/shared/utils/qv";
import * as qvMath from "src/shared/utils/qv";
import type { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  toValue,
} from "vue";

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: (translations: { en: Record<string, string> }) => ({
    t: (key: string, params: Record<string, string | number> = {}) =>
      Object.entries(params).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        translations.en[key] ?? key
      ),
  }),
}));
vi.mock("src/utils/translation/useRankingItemDisplayContent", () => ({
  useRankingItemDisplayContent: (
    input: Parameters<typeof useRankingItemDisplayContent>[0]
  ) => ({
    displayedTitle: computed(() => {
      const content = toValue(input.displayContent);
      return content?.status === "available" ? content.content.title : "";
    }),
    displayedBody: computed(() => {
      const content = toValue(input.displayContent);
      return content?.status === "available"
        ? (content.content.bodyHtml ?? "")
        : "";
    }),
    resolvedDisplayContent: computed(() => toValue(input.displayContent)),
    translationPreview: ref(undefined),
    setTranslationMode: vi.fn(),
  }),
}));

import QvAllocationEditor from "./QvAllocationEditor.vue";
import type { QvStatement } from "./QvVoting.types";

const mountedApps: App[] = [];
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

function item(slugId: string): QvStatement {
  return {
    slugId,
    displayContent: {
      sourceVersion: `version-${slugId}`,
      status: "available",
      mode: "original",
      content: { title: `Proposal ${slugId}`, bodyHtml: "<p>Description</p>" },
      translationControl: null,
    },
  };
}

async function mountEditor({
  initial = [],
  opposition = true,
  disabled = false,
  statements = [item("a"), item("b"), item("c")],
}: {
  initial?: QvAllocation[];
  opposition?: boolean;
  disabled?: boolean;
  statements?: QvStatement[];
} = {}) {
  const allocations = ref<QvAllocation[]>(initial);
  const isDisabled = ref(disabled);
  const allowOpposition = ref(opposition);
  const discard = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(
    defineComponent(
      () => () =>
        h(QvAllocationEditor, {
          conversationSlugId: "qv-test",
          items: statements,
          responseActions: undefined,
          allowOpposition: allowOpposition.value,
          disabled: isDisabled.value,
          modelValue: allocations.value,
          "onUpdate:modelValue": (value) => {
            allocations.value = value;
          },
          onDiscard: discard,
        })
    )
  );
  app.component(
    "QBtn",
    defineComponent({
      props: { disable: Boolean, icon: { type: String, required: true } },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            { disabled: props.disable, onClick: () => emit("click") },
            props.icon
          ),
    })
  );
  app.component(
    "PrimeButton",
    defineComponent({
      props: { disabled: Boolean, label: { type: String, required: true } },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            { disabled: props.disabled, onClick: () => emit("click") },
            props.label
          ),
    })
  );
  mountedApps.push(app);
  app.mount(container);
  await nextTick();
  function button(label: string): HTMLButtonElement {
    const found = [...container.querySelectorAll("button")].find(
      (candidate) =>
        candidate.getAttribute("aria-label") === label ||
        candidate.textContent === label
    );
    if (found === undefined) throw new Error(`Missing button: ${label}`);
    return found;
  }
  async function click({
    label,
    times = 1,
  }: {
    label: string;
    times?: number;
  }): Promise<void> {
    for (let index = 0; index < times; index++) {
      button(label).click();
      await nextTick();
    }
  }
  return {
    allocations,
    isDisabled,
    allowOpposition,
    discard,
    container,
    button,
    click,
  };
}

describe("QV allocation editor", () => {
  it("renders correct signed costs, square areas and the remaining fixed budget", async () => {
    const { container, button } = await mountEditor({
      initial: [
        { itemId: "a", votes: 7 },
        { itemId: "c", votes: -6 },
      ],
    });
    expect(container.textContent).toContain("49 credits");
    expect(container.textContent).toContain("36 credits");
    expect(container.textContent).toContain("15 / 100 credits remaining");
    expect(
      [...container.querySelectorAll("output")].map(
        (output) => output.textContent
      )
    ).toEqual(["+7", "0", "-6"]);
    expect(
      [...container.querySelectorAll<HTMLElement>(".credit-square")].map(
        (square) => square.style.getPropertyValue("--square-side")
      )
    ).toEqual(["70%", "0%", "60%"]);
    expect(button("Save response").disabled).toBe(true);
    expect(container.textContent).toContain("not saved or counted");
  });

  it("enforces the whole-response budget and permits refunding votes at the limit", async () => {
    const view = await mountEditor();
    await view.click({ label: "Increase support for: Proposal a", times: 10 });
    expect(view.allocations.value).toEqual([{ itemId: "a", votes: 10 }]);
    expect(view.button("Increase support for: Proposal a").disabled).toBe(true);
    expect(view.button("Increase support for: Proposal b").disabled).toBe(true);
    expect(view.button("Decrease support for: Proposal b").disabled).toBe(true);
    expect(view.button("Decrease support for: Proposal a").disabled).toBe(
      false
    );
    await view.click({ label: "Decrease support for: Proposal a" });
    await view.click({ label: "Decrease support for: Proposal b" });
    expect(view.allocations.value).toEqual([
      { itemId: "a", votes: 9 },
      { itemId: "b", votes: -1 },
    ]);
    expect(view.container.textContent).toContain("18 / 100 credits remaining");
  });

  it("handles negative limits and returns through zero without retaining zero allocations", async () => {
    const view = await mountEditor();
    await view.click({ label: "Decrease support for: Proposal a", times: 10 });
    expect(view.allocations.value).toEqual([{ itemId: "a", votes: -10 }]);
    expect(view.button("Decrease support for: Proposal a").disabled).toBe(true);
    expect(view.button("Increase support for: Proposal a").disabled).toBe(
      false
    );
    await view.click({ label: "Increase support for: Proposal a", times: 10 });
    expect(view.allocations.value).toEqual([]);
    expect(view.container.textContent).not.toContain(
      "You have unsaved changes."
    );
    expect(view.container.textContent).toContain("100 / 100 credits remaining");
  });

  it("prevents negative allocations when opposition is off", async () => {
    const view = await mountEditor({ opposition: false });
    expect(view.button("Decrease support for: Proposal a").disabled).toBe(true);
    expect(view.container.textContent).not.toContain("Not support");
    await view.click({ label: "Increase support for: Proposal a" });
    await view.click({ label: "Decrease support for: Proposal a", times: 2 });
    expect(view.allocations.value).toEqual([]);
  });

  it("disables controls for a closed, locked or stale activity without losing local work", async () => {
    const view = await mountEditor({ initial: [{ itemId: "a", votes: 2 }] });
    view.isDisabled.value = true;
    await nextTick();
    for (const button of view.container.querySelectorAll<HTMLButtonElement>(
      ".adjust"
    ))
      expect(button.disabled).toBe(true);
    await view.click({ label: "Increase support for: Proposal a" });
    expect(view.allocations.value).toEqual([{ itemId: "a", votes: 2 }]);
    expect(view.container.textContent).toContain("You have unsaved changes.");
  });

  it("requests discard without silently clearing local work", async () => {
    const view = await mountEditor({ initial: [{ itemId: "a", votes: 2 }] });
    await view.click({ label: "Discard changes" });
    expect(view.discard).toHaveBeenCalledOnce();
    expect(view.allocations.value).toEqual([{ itemId: "a", votes: 2 }]);
  });

  it("parses the whole ballot once per change rather than once per row/button", async () => {
    const parse = vi.spyOn(qvMath, "parseQvBallot");
    try {
      const view = await mountEditor();
      expect(parse).toHaveBeenCalledTimes(1);
      await view.click({ label: "Increase support for: Proposal a" });
      expect(parse).toHaveBeenCalledTimes(2);
      expect(view.container.textContent).toContain("1 credit");
    } finally {
      parse.mockRestore();
    }
  });

  it.each(["pending", "running", "failed", "not_requested"] as const)(
    "does not allow allocating to %s statement content",
    async (status) => {
      const statement = item("a");
      statement.displayContent = {
        sourceVersion: "unavailable",
        status,
        translationControl: null,
      };
      const view = await mountEditor({ statements: [statement] });
      expect(view.container.textContent).toContain(
        "Statement text is unavailable"
      );
      expect(
        [
          ...view.container.querySelectorAll<HTMLButtonElement>(".adjust"),
        ].every((button) => button.disabled)
      ).toBe(true);
      expect(view.allocations.value).toEqual([]);
    }
  );

  it("disables voting on markup-only statement titles", async () => {
    const statement = item("a");
    statement.displayContent = {
      sourceVersion: "empty-title",
      status: "available",
      mode: "original",
      content: { title: "<p><br></p>" },
      translationControl: null,
    };
    const view = await mountEditor({ statements: [statement] });
    expect(view.container.textContent).toContain(
      "Statement text is unavailable"
    );
    expect(
      [...view.container.querySelectorAll<HTMLButtonElement>(".adjust")].every(
        (button) => button.disabled
      )
    ).toBe(true);
  });

  it("sanitizes rich text instead of rendering executable markup", async () => {
    const statement = item("a");
    statement.displayContent = {
      sourceVersion: "unsafe-html",
      status: "available",
      mode: "original",
      content: {
        title:
          '<p onclick="alert(1)">Readable title</p><script>alert(2)</script>',
        bodyHtml:
          '<p onmouseover="alert(3)">Description <a href="javascript:alert(4)">unsafe link</a></p><img src=x onerror="alert(5)"><script>alert(6)</script>',
      },
      translationControl: null,
    };
    const view = await mountEditor({ statements: [statement] });
    expect(
      view.container.querySelectorAll(
        "script, img, [onclick], [onmouseover], [onerror], a[href^='javascript:']"
      )
    ).toHaveLength(0);
    expect(view.container.textContent).toContain("Readable title");
    expect(view.container.textContent).toContain("Description");
    expect(view.button("Increase support for: Readable title").disabled).toBe(
      false
    );
  });

  it.each([
    [{ itemId: "a", votes: 1.5 }],
    [{ itemId: "a", votes: 11 }],
    [
      { itemId: "a", votes: 8 },
      { itemId: "b", votes: 8 },
    ],
    [
      { itemId: "a", votes: 1 },
      { itemId: "a", votes: 2 },
    ],
    [{ itemId: "foreign-item", votes: 1 }],
  ])(
    "does not compound invalid model allocations: %j",
    async (...allocations) => {
      const view = await mountEditor({ initial: allocations });
      expect(
        [
          ...view.container.querySelectorAll<HTMLButtonElement>(".adjust"),
        ].every((button) => button.disabled)
      ).toBe(true);
    }
  );
});
