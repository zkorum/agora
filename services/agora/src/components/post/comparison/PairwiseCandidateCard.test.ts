import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import type { ComparisonCandidateDisplayItem } from "src/utils/comparisonCandidateDisplay";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  type MaybeRefOrGetter,
  nextTick,
  ref,
  toValue,
} from "vue";
import { createI18n } from "vue-i18n";

vi.mock("src/utils/translation/useRankingItemDisplayContent", () => ({
  useRankingItemDisplayContent: ({
    displayContent,
  }: {
    displayContent: MaybeRefOrGetter<RankingItemDisplayedContent>;
  }) => ({
    displayedTitle: computed(() => {
      const content = toValue(displayContent);
      return content.status === "available" ? content.content.title : "";
    }),
    displayedBody: computed(() => {
      const content = toValue(displayContent);
      return content.status === "available"
        ? (content.content.bodyHtml ?? "")
        : "";
    }),
    translationPreview: ref(undefined),
    setTranslationMode: vi.fn(),
  }),
}));

import PairwiseCandidateCard from "./PairwiseCandidateCard.vue";

let app: ReturnType<typeof createApp> | undefined;
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.replaceChildren();
});

function mountCard({
  title,
  body = "",
  disabled = false,
}: {
  title: string;
  body?: string;
  disabled?: boolean;
}) {
  const choose = vi.fn();
  const availability = vi.fn();
  const item: ComparisonCandidateDisplayItem = {
    slugId: "statement",
    title,
    body,
    externalUrl: "javascript:alert(1)",
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: { title, bodyHtml: body },
      translationControl: null,
    },
  };
  const container = document.createElement("div");
  document.body.append(container);
  app = createApp(PairwiseCandidateCard, {
    conversationSlugId: "conversation",
    item,
    selected: false,
    disabled,
    onChoose: choose,
    onContentStateChange: availability,
  });
  app.use(createI18n({ legacy: false, locale: "en" }));
  app.component(
    "QIcon",
    defineComponent(() => () => h("span"))
  );
  app.mount(container);
  return { container, choose, availability };
}

describe("Pairwise card HTML boundary", () => {
  it("uses the real sanitizer for both title and full body", () => {
    const { container } = mountCard({
      title:
        '<p onclick="alert(1)">Readable <strong>statement</strong><script>alert(1)</script></p>',
      body: '<p><a href="javascript:alert(1)">Full details</a><img src=x onerror=alert(1)></p><iframe src="https://example.com"></iframe>',
    });
    expect(
      container.querySelector("script, img, iframe, a, [onclick], [onerror]")
    ).toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("statement");
    expect(container.textContent).toContain("Full details");
    expect(
      container.querySelector(".pairwise-choice button, .pairwise-choice a")
    ).toBeNull();
  });

  it("never turns an external source URL into a card navigation target", () => {
    const { container, choose } = mountCard({ title: "A statement" });
    expect(container.querySelector("[href]")).toBeNull();
    const details = container.querySelector(".card-details");
    if (!(details instanceof HTMLButtonElement))
      throw new Error("Missing details button");
    details.click();
    expect(choose).not.toHaveBeenCalled();
  });

  it("disables a visually empty statement and reports unavailable content", async () => {
    const { container, choose, availability } = mountCard({
      title: "<p>&nbsp;</p>",
      body: "<p><br></p>",
    });
    await nextTick();
    const choice = container.querySelector(".pairwise-choice");
    if (!(choice instanceof HTMLButtonElement))
      throw new Error("Missing choice button");
    expect(choice.disabled).toBe(true);
    choice.click();
    expect(choose).not.toHaveBeenCalled();
    expect(availability).toHaveBeenCalledWith({
      slugId: "statement",
      available: false,
      isLong: false,
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "not available"
    );
  });

  it("keeps full long content outside collapsible and interactive wrappers", () => {
    const body = "Long statement details. ".repeat(60);
    const { container, availability } = mountCard({
      title: "A statement",
      body,
    });
    expect(container.querySelector(".pairwise-body")?.textContent).toBe(body);
    expect(
      container.querySelector(".zk-content-disclosure__button")
    ).toBeNull();
    expect(availability).toHaveBeenCalledWith({
      slugId: "statement",
      available: true,
      isLong: true,
    });
  });
});
