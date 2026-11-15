import { AxiosError, AxiosHeaders } from "axios";
import { Dto } from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, computed, createApp, h, nextTick, ref } from "vue";

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      `${key} ${String(params?.count ?? "")}`,
  }),
}));
vi.mock("src/utils/api/post/useQvResults", () => ({
  useQvResults: () => ({ query: { data, error, isError }, ready }),
}));
vi.mock("src/components/ui-library/ZKHtmlContent.vue", () => ({
  default: { props: ["htmlBody"], template: "<div>{{htmlBody}}</div>" },
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
      title: `Frozen ${index}`,
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

function mount() {
  const node = document.createElement("div");
  document.body.append(node);
  const app = createApp({
    render: () =>
      h(QvAnalysisTab, {
        conversationSlugId: "qvtest01",
        isClosed: closed.value,
        onViewStatements: () => {},
      }),
  });
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
    const node = mount();
    expect(node.textContent).toContain("basedOnParticipants 2");
    expect(
      [...node.querySelectorAll(".qv-rank")].map((rank) => rank.textContent)
    ).toEqual(["#1", "#1", "#3"]);
    expect(node.textContent).toContain("netVotes 2");
    expect(node.textContent).not.toContain("credits");
    expect(node.querySelectorAll("button")).toHaveLength(1);
  });
  it("hides an old ready result immediately when voting reopens", async () => {
    const node = mount();
    closed.value = false;
    await nextTick();
    expect(node.textContent).toContain("analysisOpen");
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
    expect(node.textContent).toContain("analysisUnavailable");
  });
  it.each(["calculating", "failed"] as const)(
    "shows %s without fabricated scores or a calculation Retry button",
    (status) => {
      data.value = { status, generation: 1 };
      const node = mount();
      expect(node.querySelectorAll(".qv-result")).toHaveLength(0);
      expect(node.textContent).toContain(
        status === "failed" ? "analysisFailed" : "analysisCalculating"
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
    expect(mount().textContent).toContain("analysisEmpty");
  });
});
