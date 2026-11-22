import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { AxiosError, AxiosHeaders } from "axios";
import { numberFormats } from "src/i18n/numberFormats";
import { Dto } from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, computed, createApp, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";
vi.mock("src/utils/api/post/useQvResults", () => ({
  useQvResults: () => ({ query: { data, error, isError }, ready }),
}));
vi.mock("src/composables/conversation/useClosedAnalysisSelection", () => ({
  useClosedAnalysisSelection: () => ({
    canSwitch: ref(false),
    saving: ref(false),
    saveFailed: ref(false),
    selectMode: vi.fn(),
  }),
}));
vi.mock("src/components/ui-library/ZKHtmlContent.vue", () => ({
  default: { props: ["htmlBody"], template: "<div>{{htmlBody}}</div>" },
}));
vi.mock("pinia", () => ({ storeToRefs: (store: object) => store }));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    displayLanguage: ref("en"),
    spokenLanguages: ref(["en"]),
  }),
}));
vi.mock("src/utils/translation/useContentTranslationPreview", () => ({
  useRankingItemContentTranslationPreview: () => ({
    preview: ref(undefined),
    setMode: vi.fn(),
  }),
}));
import QvAnalysisTab from "./QvAnalysisTab.vue";

function result() {
  return Dto.qvResultsResponse.parse({
    status: "ready",
    generation: 1,
    calculationId: "00000000-0000-4000-8000-000000000001",
    capturedAt: new Date(),
    participantCount: 2,
    items: [1, 1, 3].map((rank, index) => ({
      itemSlugId: `item000${index}`,
      sourceVersion: "00000000-0000-4000-8000-000000000002",
      displayContent: {
        sourceVersion: "00000000-0000-4000-8000-000000000002",
        status: "available",
        mode: "original",
        content: { title: `Frozen ${index}` },
        translationControl: null,
      },
      netUnits: index === 2 ? 0 : 2,
      supportUnits: index === 2 ? 0 : 3,
      oppositionUnits: index === 2 ? 0 : 1,
      supportingParticipantCount: index === 2 ? 0 : 1,
      opposingParticipantCount: index === 2 ? 0 : 1,
      rank,
    })),
  });
}
const data = ref(result());
const error = ref<Error | null>(null);
const isError = ref(false);
const ready = computed(() =>
  data.value.status === "ready" ? data.value : undefined
);
const closed = ref(true);
const apps: App[] = [];
beforeEach(() => {
  data.value = result();
  error.value = null;
  isError.value = false;
  closed.value = true;
});
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

function mount(locale = "en") {
  const node = document.createElement("div");
  document.body.append(node);
  const app = createApp({
    render: () =>
      h(QvAnalysisTab, {
        conversationSlugId: "qvtest01",
        isClosed: closed.value,
        canEditConversation: false,
        onViewItems: () => {},
      }),
  });
  app.use(VueQueryPlugin, { queryClient: new QueryClient() });
  app.use(createI18n({ legacy: false, locale, numberFormats }));
  app.component("PrimeButton", {
    props: { label: { type: String, required: true } },
    template: "<button>{{label}}</button>",
  });
  apps.push(app);
  app.mount(node);
  return node;
}
describe("QV aggregate results presentation", () => {
  it("shows captured participants, signed totals and competition ranks without extra event-wide counters", () => {
    const node = mount("fa");
    expect(node.textContent).toContain("تعداد شرکت‌کنندگان در محاسبه: ۲");
    expect(
      [...node.querySelectorAll(".qv-rank")].map((rank) => rank.textContent)
    ).toEqual(["#۱", "#۱", "#۳"]);
    expect(node.textContent).toContain("خالص رأی‌ها: ۲");
    expect(node.textContent).not.toContain("اعتبار");
    expect(node.querySelectorAll("button")).toHaveLength(1);
  });
  it("hides an old ready result immediately when voting reopens", async () => {
    const node = mount();
    closed.value = false;
    await nextTick();
    expect(node.textContent).toContain("after this activity closes");
    expect(node.textContent).not.toContain("Frozen");
    expect(node.querySelectorAll(".qv-result")).toHaveLength(0);
  });
  it("keeps cached results through transient refresh failure, but hides revoked source access", async () => {
    const node = mount();
    isError.value = true;
    error.value = new Error("Offline");
    await nextTick();
    expect(node.textContent).toContain("Frozen");
    const denied = new AxiosError("Not found");
    denied.response = {
      status: 404,
      statusText: "Not found",
      data: undefined,
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    error.value = denied;
    await nextTick();
    expect(node.textContent).not.toContain("Frozen");
    expect(node.textContent).toContain("Results are not available yet.");
  });
  it.each(["calculating", "failed"] as const)(
    "shows %s without fabricated scores or a calculation Retry button",
    (status) => {
      data.value = { status, generation: 1 };
      const node = mount();
      expect(node.querySelectorAll(".qv-result")).toHaveLength(0);
      expect(node.textContent).toContain(
        status === "failed"
          ? "Results could not be calculated."
          : "Calculating results"
      );
      expect(node.querySelectorAll("button")).toHaveLength(1);
    }
  );
  it("renders an explicit empty result", () => {
    data.value = Dto.qvResultsResponse.parse({
      status: "ready",
      generation: 1,
      calculationId: "00000000-0000-4000-8000-000000000001",
      capturedAt: new Date(),
      participantCount: 0,
      items: [],
    });
    expect(mount().textContent).toContain(
      "No eligible saved responses were included."
    );
  });
});
