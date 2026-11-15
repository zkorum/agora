import { afterEach, describe, expect, it } from "vitest";
import {
  type App,
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
} from "vue";

import { qvStatsTopics, useQvStatsSubscriptions } from "./qvStatsSubscriptions";

const apps: App[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  expect(qvStatsTopics.value).toEqual([]);
});

function mount(component: ReturnType<typeof defineComponent>): void {
  const node = document.createElement("div");
  document.body.append(node);
  const app = createApp(component);
  apps.push(app);
  app.mount(node);
}

describe("QV live subscriptions", () => {
  it("deduplicates topics across displays and releases only the departed subscriber", async () => {
    const first = ref(["qvtest01"]);
    const second = ref(["qvtest01", "qvtest02"]);
    mount(
      defineComponent({
        setup() {
          useQvStatsSubscriptions(first);
          useQvStatsSubscriptions(second);
          return () => h("div");
        },
      })
    );
    expect(qvStatsTopics.value).toEqual([
      "conversation:qvtest01",
      "conversation:qvtest02",
    ]);
    second.value = [];
    await nextTick();
    expect(qvStatsTopics.value).toEqual(["conversation:qvtest01"]);
    first.value = [];
    await nextTick();
    expect(qvStatsTopics.value).toEqual([]);
  });

  it("pauses subscriptions in KeepAlive without losing the page's saved state", async () => {
    const active = ref(true);
    const savedDraft = [3, -2];
    let activations = 0;
    const page = defineComponent({
      setup() {
        activations += 1;
        useQvStatsSubscriptions(() => ["qvtest01"]);
        return () => h("div", savedDraft.join(","));
      },
    });
    const other = defineComponent({ render: () => h("div") });
    mount(
      defineComponent({
        render: () =>
          h(KeepAlive, {}, { default: () => h(active.value ? page : other) }),
      })
    );
    expect(qvStatsTopics.value).toEqual(["conversation:qvtest01"]);
    active.value = false;
    await nextTick();
    expect(qvStatsTopics.value).toEqual([]);
    active.value = true;
    await nextTick();
    expect(qvStatsTopics.value).toEqual(["conversation:qvtest01"]);
    expect(activations).toBe(1);
    expect(document.body.textContent).toBe("3,-2");
  });
});
