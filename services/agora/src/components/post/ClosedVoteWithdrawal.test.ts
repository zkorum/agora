import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import PrimeVue from "primevue/config";
import type * as ViewerScope from "src/utils/query/viewerScope";
import { expect, it, vi } from "vitest";
import { createApp, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

import ClosedVoteWithdrawal from "./ClosedVoteWithdrawal.vue";

const viewer = ref({ kind: "viewer", userId: "alice" });
const withdraw = vi.fn();
vi.mock("src/utils/query/viewerScope", async (original) => ({
  ...(await original<typeof ViewerScope>()),
  useViewerQueryScope: () => viewer,
}));
vi.mock("src/utils/api/vote", () => ({
  useBackendVoteApi: () => ({
    getClosedVoteWithdrawalStatus: () =>
      Promise.resolve({ available: true, closeEpoch: "first-close" }),
    withdrawClosedVotes: withdraw,
  }),
}));
vi.mock("src/components/ui-library/ZKBottomDialogContainer.vue", () => ({
  default: { template: "<div><slot /></div>" },
}));

it("requires fresh confirmation after a viewer switch, even when the original viewer returns", async () => {
  const client = new QueryClient();
  const app = createApp(ClosedVoteWithdrawal, {
    conversationSlugId: "votes001",
    method: "qv",
  });
  app.use(VueQueryPlugin, { queryClient: client });
  app.use(PrimeVue);
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  app.component("QDialog", {
    props: { modelValue: Boolean },
    template: '<section v-if="modelValue" role="dialog"><slot /></section>',
  });
  const root = document.createElement("div");
  app.mount(root);
  try {
    const open = () => root.querySelector<HTMLButtonElement>("button")?.click();
    const dialog = () => root.querySelector('[role="dialog"]');
    await vi.waitFor(() => expect(root.querySelector("button")).not.toBeNull());
    open();
    await nextTick();
    expect(dialog()?.textContent).toContain("Withdraw all your votes?");
    viewer.value = { ...viewer.value, userId: "bob" };
    viewer.value = { ...viewer.value, userId: "alice" };
    await nextTick();
    expect(dialog()).toBeNull();
    expect(withdraw).not.toHaveBeenCalled();
    open();
    await nextTick();
    const confirm = Array.from(dialog()?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.includes("Withdraw my votes")
    );
    expect(confirm).toBeDefined();
    confirm?.click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain("withdrawn from Live")
    );
    expect(withdraw).toHaveBeenCalledExactlyOnceWith({
      request: {
        conversationSlugId: "votes001",
        closeEpoch: "first-close",
        expectedViewerId: "alice",
      },
      isCurrent: expect.any(Function),
    });
  } finally {
    app.unmount();
    client.clear();
  }
});
